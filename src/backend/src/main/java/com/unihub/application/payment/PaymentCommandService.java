package com.unihub.application.payment;

import com.unihub.application.mail.RegistrationConfirmationMailService;
import com.unihub.application.payment.exception.PaymentException;
import com.unihub.application.qr.QrTicketService;
import com.unihub.application.registration.exception.RegistrationException;
import com.unihub.domain.payment.PaymentErrorCode;
import com.unihub.domain.payment.PaymentIntent;
import com.unihub.domain.payment.PaymentRepository;
import com.unihub.domain.payment.PaymentStatus;
import com.unihub.domain.registration.Registration;
import com.unihub.domain.registration.RegistrationRepository;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.domain.registration.RegistrationView;
import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import com.unihub.infrastructure.payment.zalopay.ZaloPayCallbackPayload;
import com.unihub.infrastructure.payment.zalopay.ZaloPayClient;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentCommandService {
  private final StudentRepository studentRepository;
  private final PaymentRepository paymentRepository;
  private final RegistrationRepository registrationRepository;
  private final ZaloPayClient zaloPayClient;
  private final QrTicketService qrTicketService;
  private final RegistrationConfirmationMailService registrationConfirmationMailService;
  private final Clock clock;

  public PaymentCommandService(
      StudentRepository studentRepository,
      PaymentRepository paymentRepository,
      RegistrationRepository registrationRepository,
      ZaloPayClient zaloPayClient,
      QrTicketService qrTicketService,
      RegistrationConfirmationMailService registrationConfirmationMailService,
      Clock clock) {
    this.studentRepository = studentRepository;
    this.paymentRepository = paymentRepository;
    this.registrationRepository = registrationRepository;
    this.zaloPayClient = zaloPayClient;
    this.qrTicketService = qrTicketService;
    this.registrationConfirmationMailService = registrationConfirmationMailService;
    this.clock = clock;
  }

  @Transactional
  public ZaloPayCreateOrderResult createZaloPayPaymentUrl(CreatePaymentUrlCommand command) {
    Student student = requireStudent(command.userId());
    PaymentIntent paymentIntent = paymentRepository.findByIdForUpdate(command.paymentIntentId())
        .orElseThrow(() -> new PaymentException(PaymentErrorCode.PAYMENT_NOT_FOUND, HttpStatus.NOT_FOUND));
    RegistrationView registrationView = requireOwnedRegistrationView(student.id(), paymentIntent.registrationId());

    if (!paymentIntent.status().isPending()) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_INVALID_STATE, HttpStatus.CONFLICT);
    }
    if (paymentIntent.expiresAt() != null && paymentIntent.expiresAt().isBefore(LocalDateTime.now(clock))) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_EXPIRED, HttpStatus.CONFLICT);
    }
    if (paymentIntent.paymentUrl() != null && paymentIntent.gatewayRef() != null && paymentIntent.status() == PaymentStatus.PENDING_PAYMENT) {
      return new ZaloPayCreateOrderResult("ZALOPAY", paymentIntent.paymentUrl(), paymentIntent.gatewayRef());
    }

    PaymentIntent updated = zaloPayClient.createOrder(paymentIntent, registrationView, command.userId());
    paymentRepository.update(updated);
    return new ZaloPayCreateOrderResult("ZALOPAY", updated.paymentUrl(), updated.gatewayRef());
  }

  @Transactional
  public ZaloPayCallbackResult handleZaloPayCallback(String data, String mac) {
    ZaloPayCallbackPayload callbackPayload = zaloPayClient.verifyAndParseCallback(data, mac);
    PaymentIntent paymentIntent = paymentRepository.findByGatewayRefForUpdate(callbackPayload.gatewayRef())
        .orElseGet(() -> callbackPayload.paymentIntentId() == null
            ? null
            : paymentRepository.findByIdForUpdate(callbackPayload.paymentIntentId()).orElse(null));

    if (paymentIntent == null) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_GATEWAY_REF_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (paymentIntent.amount().compareTo(callbackPayload.amount()) != 0) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_AMOUNT_MISMATCH, HttpStatus.CONFLICT);
    }
    if (!paymentIntent.currency().equalsIgnoreCase(callbackPayload.currency())) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_CURRENCY_MISMATCH, HttpStatus.CONFLICT);
    }

    Registration registration = registrationRepository.findById(paymentIntent.registrationId())
        .orElseThrow(() -> new RegistrationException(com.unihub.domain.registration.RegistrationErrorCode.REG_NOT_FOUND,
            HttpStatus.NOT_FOUND));

    if (callbackPayload.success()) {
      if (paymentIntent.status() != PaymentStatus.SUCCEEDED) {
        registrationRepository.lockSessionForRegistration(registration.sessionId());
        LocalDateTime now = LocalDateTime.now(clock);
        paymentRepository.update(new PaymentIntent(
            paymentIntent.id(),
            paymentIntent.registrationId(),
            paymentIntent.idempotencyKey(),
            callbackPayload.gatewayRef(),
            PaymentStatus.SUCCEEDED,
            paymentIntent.amount(),
            paymentIntent.currency(),
            paymentIntent.paymentUrl(),
            paymentIntent.expiresAt(),
            callbackPayload.paidAt() == null ? now : callbackPayload.paidAt(),
            null,
            paymentIntent.createdAt(),
            now));

        Registration confirmed = new Registration(
            registration.id(),
            registration.studentId(),
            registration.sessionId(),
            RegistrationStatus.CONFIRMED,
            registration.registrationType(),
            registration.reservedAt(),
            now,
            registration.expiresAt(),
            null,
            registration.createdAt(),
            now);
        registrationRepository.update(confirmed);
        registrationRepository.updateSessionSeatCounters(registration.sessionId(), 1, -1);
        qrTicketService.ensureQrTicket(confirmed);
        registrationConfirmationMailService.queueRegistrationConfirmedEmail(confirmed.id());
      } else {
        Registration confirmed = new Registration(
            registration.id(),
            registration.studentId(),
            registration.sessionId(),
            RegistrationStatus.CONFIRMED,
            registration.registrationType(),
            registration.reservedAt(),
            registration.confirmedAt(),
            registration.expiresAt(),
            registration.canceledAt(),
            registration.createdAt(),
            registration.updatedAt());
        qrTicketService.ensureQrTicket(confirmed);
      }
      return ZaloPayCallbackResult.success();
    }

    if (paymentIntent.status() == PaymentStatus.SUCCEEDED) {
      return ZaloPayCallbackResult.success();
    }

    if (paymentIntent.status().isPending()) {
      registrationRepository.lockSessionForRegistration(registration.sessionId());
      LocalDateTime now = LocalDateTime.now(clock);
      paymentRepository.update(new PaymentIntent(
          paymentIntent.id(),
          paymentIntent.registrationId(),
          paymentIntent.idempotencyKey(),
          callbackPayload.gatewayRef(),
          PaymentStatus.FAILED,
          paymentIntent.amount(),
          paymentIntent.currency(),
          paymentIntent.paymentUrl(),
          paymentIntent.expiresAt(),
          null,
          callbackPayload.failureReason(),
          paymentIntent.createdAt(),
          now));

      registrationRepository.update(new Registration(
          registration.id(),
          registration.studentId(),
          registration.sessionId(),
          RegistrationStatus.PAYMENT_FAILED,
          registration.registrationType(),
          registration.reservedAt(),
          null,
          registration.expiresAt(),
          now,
          registration.createdAt(),
          now));
      registrationRepository.updateSessionSeatCounters(registration.sessionId(), 0, -1);
    }

    return ZaloPayCallbackResult.success();
  }

  private Student requireStudent(UUID userId) {
    return studentRepository.findByUserId(userId)
        .orElseThrow(() -> new PaymentException(PaymentErrorCode.PAYMENT_ACCESS_DENIED, HttpStatus.FORBIDDEN));
  }

  private RegistrationView requireOwnedRegistrationView(UUID studentId, UUID registrationId) {
    RegistrationView view = registrationRepository.findViewByIdForStudent(registrationId, studentId).orElse(null);
    if (view != null) {
      return view;
    }
    if (registrationRepository.findById(registrationId).isPresent()) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_ACCESS_DENIED, HttpStatus.FORBIDDEN);
    }
    throw new PaymentException(PaymentErrorCode.PAYMENT_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
}
