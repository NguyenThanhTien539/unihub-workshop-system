package com.unihub.application.payment;

import com.unihub.application.mail.RegistrationConfirmationMailService;
import com.unihub.application.payment.exception.PaymentException;
import com.unihub.application.qr.QrTicketService;
import com.unihub.domain.payment.PaymentErrorCode;
import com.unihub.domain.payment.PaymentIntent;
import com.unihub.domain.payment.PaymentRepository;
import com.unihub.domain.payment.PaymentStatus;
import com.unihub.domain.registration.Registration;
import com.unihub.domain.registration.RegistrationRepository;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.domain.registration.RegistrationType;
import com.unihub.domain.registration.RegistrationView;
import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import com.unihub.infrastructure.payment.zalopay.ZaloPayCallbackPayload;
import com.unihub.infrastructure.payment.zalopay.ZaloPayClient;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PaymentCommandService {
  private static final int DEFAULT_EXPIRATION_BATCH_SIZE = 50;

  private final StudentRepository studentRepository;
  private final PaymentRepository paymentRepository;
  private final RegistrationRepository registrationRepository;
  private final ZaloPayClient zaloPayClient;
  private final PaymentCircuitBreaker paymentCircuitBreaker;
  private final QrTicketService qrTicketService;
  private final RegistrationConfirmationMailService registrationConfirmationMailService;
  private final TransactionTemplate transactionTemplate;
  private final Clock clock;

  public PaymentCommandService(
      StudentRepository studentRepository,
      PaymentRepository paymentRepository,
      RegistrationRepository registrationRepository,
      ZaloPayClient zaloPayClient,
      PaymentCircuitBreaker paymentCircuitBreaker,
      QrTicketService qrTicketService,
      RegistrationConfirmationMailService registrationConfirmationMailService,
      TransactionTemplate transactionTemplate,
      Clock clock) {
    this.studentRepository = studentRepository;
    this.paymentRepository = paymentRepository;
    this.registrationRepository = registrationRepository;
    this.zaloPayClient = zaloPayClient;
    this.paymentCircuitBreaker = paymentCircuitBreaker;
    this.qrTicketService = qrTicketService;
    this.registrationConfirmationMailService = registrationConfirmationMailService;
    this.transactionTemplate = transactionTemplate;
    this.clock = clock;
  }

  public ZaloPayCreateOrderResult createZaloPayPaymentUrl(CreatePaymentUrlCommand command) {
    PreparedZaloPayOrder prepared = transactionTemplate.execute(status -> prepareZaloPayOrder(command));
    if (prepared.reusableResult() != null) {
      return prepared.reusableResult();
    }

    PaymentIntent providerOrder = paymentCircuitBreaker.execute(() -> zaloPayClient.createOrder(
        prepared.paymentIntent(),
        prepared.registrationView(),
        command.userId()));
    PaymentIntent persisted = transactionTemplate.execute(status -> persistProviderOrder(providerOrder));
    return toCreateOrderResult(persisted);
  }

  @Transactional
  public ZaloPayCallbackResult handleZaloPayCallback(String data, String mac) {
    ZaloPayCallbackPayload callbackPayload = zaloPayClient.verifyAndParseCallback(data, mac);
    PaymentIntent paymentIntent = resolvePaymentIntent(callbackPayload);
    if (paymentIntent.status() == PaymentStatus.SUCCEEDED) {
      return ZaloPayCallbackResult.success();
    }
    Registration registration = registrationRepository.findByIdForUpdate(paymentIntent.registrationId())
        .orElseThrow(() -> new PaymentException(
            PaymentErrorCode.PAYMENT_REGISTRATION_NOT_FOUND,
            HttpStatus.NOT_FOUND));

    validateCallback(paymentIntent, registration, callbackPayload);
    LocalDateTime now = LocalDateTime.now(clock);
    if (isExpired(paymentIntent, now) || registration.status() == RegistrationStatus.EXPIRED) {
      expireLockedPayment(paymentIntent, registration, now);
      return new ZaloPayCallbackResult(0, PaymentErrorCode.PAYMENT_INTENT_EXPIRED.defaultMessage());
    }
    if (callbackPayload.success()) {
      confirmLockedPayment(paymentIntent, registration, callbackPayload, now);
      return ZaloPayCallbackResult.success();
    }

    failLockedPayment(paymentIntent, registration, callbackPayload, now);
    return ZaloPayCallbackResult.success();
  }

  public int expirePendingPayments() {
    return expirePendingPayments(DEFAULT_EXPIRATION_BATCH_SIZE);
  }

  public int expirePendingPayments(int batchSize) {
    List<UUID> expiredIds = paymentRepository.findExpiredPendingIds(LocalDateTime.now(clock), batchSize);
    int expiredCount = 0;
    for (UUID paymentIntentId : expiredIds) {
      Boolean expired = transactionTemplate.execute(status -> expirePendingPaymentById(paymentIntentId));
      if (Boolean.TRUE.equals(expired)) {
        expiredCount++;
      }
    }
    return expiredCount;
  }

  boolean expirePendingPaymentById(UUID paymentIntentId) {
    PaymentIntent paymentIntent = paymentRepository.findByIdForUpdate(paymentIntentId).orElse(null);
    if (paymentIntent == null || !paymentIntent.status().isPending()) {
      return false;
    }

    Registration registration = registrationRepository.findByIdForUpdate(paymentIntent.registrationId()).orElse(null);
    if (registration == null) {
      paymentRepository.update(copyPayment(
          paymentIntent,
          PaymentStatus.EXPIRED,
          paymentIntent.paymentUrl(),
          paymentIntent.paidAt(),
          "Registration not found",
          LocalDateTime.now(clock)));
      return true;
    }

    LocalDateTime now = LocalDateTime.now(clock);
    if (!isExpired(paymentIntent, now) && registration.status() != RegistrationStatus.EXPIRED) {
      return false;
    }

    expireLockedPayment(paymentIntent, registration, now);
    return true;
  }

  PreparedZaloPayOrder prepareZaloPayOrder(CreatePaymentUrlCommand command) {
    Student student = requireStudent(command.userId());
    PaymentIntent paymentIntent = paymentRepository.findByIdForUpdate(command.paymentIntentId())
        .orElseThrow(() -> new PaymentException(
            PaymentErrorCode.PAYMENT_INTENT_NOT_FOUND,
            HttpStatus.NOT_FOUND));
    RegistrationView registrationView = requireOwnedRegistrationView(student.id(), paymentIntent.registrationId());
    if (registrationView.registrationType() != RegistrationType.PAID) {
      throw new PaymentException(
          PaymentErrorCode.PAYMENT_NOT_ALLOWED_FOR_FREE_SESSION,
          HttpStatus.BAD_REQUEST);
    }

    LocalDateTime now = LocalDateTime.now(clock);
    if (paymentIntent.status() == PaymentStatus.SUCCEEDED) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_ALREADY_SUCCEEDED, HttpStatus.CONFLICT);
    }
    if (isExpired(paymentIntent, now)) {
      Registration registration = registrationRepository.findByIdForUpdate(paymentIntent.registrationId()).orElse(null);
      if (registration != null) {
        expireLockedPayment(paymentIntent, registration, now);
      }
      throw new PaymentException(PaymentErrorCode.PAYMENT_INTENT_EXPIRED, HttpStatus.CONFLICT);
    }
    if (!paymentIntent.status().isPending()) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_INVALID_STATE, HttpStatus.CONFLICT);
    }
    if (hasReusablePaymentUrl(paymentIntent)) {
      return new PreparedZaloPayOrder(paymentIntent, registrationView, toCreateOrderResult(paymentIntent));
    }
    return new PreparedZaloPayOrder(paymentIntent, registrationView, null);
  }

  PaymentIntent persistProviderOrder(PaymentIntent providerOrder) {
    PaymentIntent current = paymentRepository.findByIdForUpdate(providerOrder.id())
        .orElseThrow(() -> new PaymentException(
            PaymentErrorCode.PAYMENT_INTENT_NOT_FOUND,
            HttpStatus.NOT_FOUND));
    if (hasReusablePaymentUrl(current)) {
      return current;
    }

    PaymentIntent updated = paymentRepository.update(copyPayment(
        current,
        PaymentStatus.PENDING_PAYMENT,
        providerOrder.paymentUrl(),
        current.paidAt(),
        null,
        LocalDateTime.now(clock),
        providerOrder.providerTransactionId()));
    return updated;
  }

  private PaymentIntent resolvePaymentIntent(ZaloPayCallbackPayload callbackPayload) {
    PaymentIntent paymentIntent = null;
    if (callbackPayload.providerTransactionId() != null && !callbackPayload.providerTransactionId().isBlank()) {
      paymentIntent = paymentRepository.findByProviderTransactionIdForUpdate(callbackPayload.providerTransactionId())
          .orElse(null);
    }
    if (paymentIntent == null && callbackPayload.paymentIntentId() != null) {
      paymentIntent = paymentRepository.findByIdForUpdate(callbackPayload.paymentIntentId()).orElse(null);
    }
    if (paymentIntent == null) {
      throw new PaymentException(
          PaymentErrorCode.PAYMENT_INTENT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
          "Unknown app_trans_id");
    }
    return paymentIntent;
  }

  private void validateCallback(
      PaymentIntent paymentIntent,
      Registration registration,
      ZaloPayCallbackPayload callbackPayload) {
    if (callbackPayload.registrationId() != null
        && !callbackPayload.registrationId().equals(registration.id())) {
      throw new PaymentException(
          PaymentErrorCode.PAYMENT_INVALID_STATE,
          HttpStatus.CONFLICT,
          "registration mismatch");
    }
    if (paymentIntent.amount().compareTo(callbackPayload.amount()) != 0) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_AMOUNT_MISMATCH, HttpStatus.CONFLICT);
    }
    if (!paymentIntent.currency().equalsIgnoreCase(callbackPayload.currency())) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_CURRENCY_MISMATCH, HttpStatus.CONFLICT);
    }
  }

  private void confirmLockedPayment(
      PaymentIntent paymentIntent,
      Registration registration,
      ZaloPayCallbackPayload callbackPayload,
      LocalDateTime now) {
    if (registration.status() != RegistrationStatus.PENDING_PAYMENT
        && registration.status() != RegistrationStatus.CONFIRMED) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_INVALID_STATE, HttpStatus.CONFLICT);
    }
    if (registration.status() == RegistrationStatus.PENDING_PAYMENT) {
      registrationRepository.lockSessionForRegistration(registration.sessionId());
    }

    paymentRepository.update(copyPayment(
        paymentIntent,
        PaymentStatus.SUCCEEDED,
        paymentIntent.paymentUrl(),
        callbackPayload.paidAt() == null ? now : callbackPayload.paidAt(),
        null,
        now,
        callbackPayload.providerTransactionId()));

    Registration confirmedRegistration = registration;
    if (registration.status() == RegistrationStatus.PENDING_PAYMENT) {
      confirmedRegistration = registrationRepository.update(new Registration(
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
          now));
      registrationRepository.updateSessionSeatCounters(registration.sessionId(), 1, -1);
    }

    qrTicketService.ensureQrTicketRecord(confirmedRegistration);
    registrationConfirmationMailService.queueRegistrationConfirmedNotifications(confirmedRegistration.id());
  }

  private void failLockedPayment(
      PaymentIntent paymentIntent,
      Registration registration,
      ZaloPayCallbackPayload callbackPayload,
      LocalDateTime now) {
    if (!paymentIntent.status().isPending()) {
      return;
    }

    if (registration.status() == RegistrationStatus.PENDING_PAYMENT) {
      registrationRepository.lockSessionForRegistration(registration.sessionId());
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

    paymentRepository.update(copyPayment(
        paymentIntent,
        PaymentStatus.FAILED,
        paymentIntent.paymentUrl(),
        null,
        callbackPayload.failureReason(),
        now,
        callbackPayload.providerTransactionId()));
  }

  private void expireLockedPayment(
      PaymentIntent paymentIntent,
      Registration registration,
      LocalDateTime now) {
    if (!paymentIntent.status().isPending()) {
      return;
    }

    if (registration.status() == RegistrationStatus.PENDING_PAYMENT) {
      registrationRepository.lockSessionForRegistration(registration.sessionId());
      registrationRepository.update(new Registration(
          registration.id(),
          registration.studentId(),
          registration.sessionId(),
          RegistrationStatus.EXPIRED,
          registration.registrationType(),
          registration.reservedAt(),
          registration.confirmedAt(),
          registration.expiresAt(),
          registration.canceledAt(),
          registration.createdAt(),
          now));
      registrationRepository.updateSessionSeatCounters(registration.sessionId(), 0, -1);
    }

    paymentRepository.update(copyPayment(
        paymentIntent,
        PaymentStatus.EXPIRED,
        paymentIntent.paymentUrl(),
        paymentIntent.paidAt(),
        paymentIntent.failureReason(),
        now));
  }

  private PaymentIntent copyPayment(
      PaymentIntent source,
      PaymentStatus status,
      String paymentUrl,
      LocalDateTime paidAt,
      String failureReason,
      LocalDateTime updatedAt) {
    return copyPayment(source, status, paymentUrl, paidAt, failureReason, updatedAt, source.providerTransactionId());
  }

  private PaymentIntent copyPayment(
      PaymentIntent source,
      PaymentStatus status,
      String paymentUrl,
      LocalDateTime paidAt,
      String failureReason,
      LocalDateTime updatedAt,
      String providerTransactionId) {
    return new PaymentIntent(
        source.id(),
        source.registrationId(),
        source.provider(),
        source.idempotencyKey(),
        providerTransactionId,
        status,
        source.amount(),
        source.currency(),
        paymentUrl,
        source.expiresAt(),
        paidAt,
        failureReason,
        source.createdAt(),
        updatedAt);
  }

  private ZaloPayCreateOrderResult toCreateOrderResult(PaymentIntent paymentIntent) {
    return new ZaloPayCreateOrderResult(
        paymentIntent.id(),
        paymentIntent.provider(),
        paymentIntent.paymentUrl(),
        paymentIntent.providerTransactionId(),
        paymentIntent.status().name(),
        paymentIntent.expiresAt());
  }

  private boolean hasReusablePaymentUrl(PaymentIntent paymentIntent) {
    return paymentIntent.status() == PaymentStatus.PENDING_PAYMENT
        && paymentIntent.paymentUrl() != null
        && paymentIntent.providerTransactionId() != null
        && !paymentIntent.providerTransactionId().isBlank();
  }

  private boolean isExpired(PaymentIntent paymentIntent, LocalDateTime now) {
    return paymentIntent.expiresAt() != null && !paymentIntent.expiresAt().isAfter(now);
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
    throw new PaymentException(PaymentErrorCode.PAYMENT_INTENT_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  private record PreparedZaloPayOrder(
      PaymentIntent paymentIntent,
      RegistrationView registrationView,
      ZaloPayCreateOrderResult reusableResult) {
  }
}
