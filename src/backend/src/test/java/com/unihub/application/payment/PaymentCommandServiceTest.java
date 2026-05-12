package com.unihub.application.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.unihub.application.mail.RegistrationConfirmationMailService;
import com.unihub.application.payment.exception.PaymentException;
import com.unihub.application.qr.QrTicketService;
import com.unihub.domain.payment.PaymentIntent;
import com.unihub.domain.payment.PaymentRepository;
import com.unihub.domain.payment.PaymentStatus;
import com.unihub.domain.registration.Registration;
import com.unihub.domain.registration.RegistrationRepository;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.domain.registration.RegistrationType;
import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import com.unihub.domain.student.StudentStatus;
import com.unihub.infrastructure.payment.zalopay.ZaloPayCallbackPayload;
import com.unihub.infrastructure.payment.zalopay.ZaloPayClient;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PaymentCommandServiceTest {
  @Mock private StudentRepository studentRepository;
  @Mock private PaymentRepository paymentRepository;
  @Mock private RegistrationRepository registrationRepository;
  @Mock private ZaloPayClient zaloPayClient;
  @Mock private QrTicketService qrTicketService;
  @Mock private RegistrationConfirmationMailService registrationConfirmationMailService;

  private PaymentCommandService service;
  private UUID userId;
  private UUID studentId;
  private UUID registrationId;
  private UUID paymentIntentId;
  private UUID sessionId;

  @BeforeEach
  void setUp() {
    service = new PaymentCommandService(
        studentRepository,
        paymentRepository,
        registrationRepository,
        zaloPayClient,
        qrTicketService,
        registrationConfirmationMailService,
        Clock.fixed(Instant.parse("2026-05-08T10:00:00Z"), ZoneOffset.UTC));
    userId = UUID.randomUUID();
    studentId = UUID.randomUUID();
    registrationId = UUID.randomUUID();
    paymentIntentId = UUID.randomUUID();
    sessionId = UUID.randomUUID();

    lenient().when(studentRepository.findByUserId(userId))
        .thenReturn(Optional.of(new Student(studentId, userId, "S0001", StudentStatus.ACTIVE)));
  }

  @Test
  void createPaymentUrlIsOwnerOnly() {
    PaymentIntent paymentIntent = pendingGatewayIntent();
    when(paymentRepository.findByIdForUpdate(paymentIntentId)).thenReturn(Optional.of(paymentIntent));
    when(registrationRepository.findViewByIdForStudent(registrationId, studentId)).thenReturn(Optional.empty());
    when(registrationRepository.findById(registrationId)).thenReturn(Optional.of(confirmedRegistration()));

    assertThrows(PaymentException.class,
        () -> service.createZaloPayPaymentUrl(new CreatePaymentUrlCommand(userId, paymentIntentId)));
  }

  @Test
  void successfulCallbackConfirmsRegistrationCreatesQrAndQueuesEmail() {
    PaymentIntent paymentIntent = pendingPaymentIntent();
    Registration registration = pendingPaidRegistration();
    when(zaloPayClient.verifyAndParseCallback("data", "mac"))
        .thenReturn(new ZaloPayCallbackPayload("gw-123", paymentIntentId, BigDecimal.valueOf(199000), "VND",
            LocalDateTime.of(2026, 5, 8, 10, 5), true, null));
    when(paymentRepository.findByGatewayRefForUpdate("gw-123")).thenReturn(Optional.of(paymentIntent));
    when(registrationRepository.findById(registrationId)).thenReturn(Optional.of(registration));

    ZaloPayCallbackResult result = service.handleZaloPayCallback("data", "mac");

    assertEquals(1, result.return_code());
    verify(registrationRepository).updateSessionSeatCounters(sessionId, 1, -1);
    verify(qrTicketService).ensureQrTicket(any(Registration.class));
    verify(registrationConfirmationMailService).queueRegistrationConfirmedEmail(registrationId);
  }

  @Test
  void duplicateSuccessfulCallbackDoesNotAdjustSeatsOrQueueEmailAgain() {
    PaymentIntent paymentIntent = succeededIntent();
    Registration registration = new Registration(registrationId, studentId, sessionId, RegistrationStatus.CONFIRMED,
        RegistrationType.PAID, LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now().plusMinutes(10), null,
        LocalDateTime.now(), LocalDateTime.now());
    when(zaloPayClient.verifyAndParseCallback("data", "mac"))
        .thenReturn(new ZaloPayCallbackPayload("gw-123", paymentIntentId, BigDecimal.valueOf(199000), "VND",
            LocalDateTime.of(2026, 5, 8, 10, 5), true, null));
    when(paymentRepository.findByGatewayRefForUpdate("gw-123")).thenReturn(Optional.of(paymentIntent));
    when(registrationRepository.findById(registrationId)).thenReturn(Optional.of(registration));

    service.handleZaloPayCallback("data", "mac");

    verify(registrationRepository, never()).updateSessionSeatCounters(any(), any(int.class), any(int.class));
    verify(registrationConfirmationMailService, never()).queueRegistrationConfirmedEmail(any());
    verify(qrTicketService).ensureQrTicket(any(Registration.class));
  }

  @Test
  void failedCallbackMarksPaymentAndRegistrationFailedWithoutQr() {
    PaymentIntent paymentIntent = pendingPaymentIntent();
    Registration registration = pendingPaidRegistration();
    when(zaloPayClient.verifyAndParseCallback("data", "mac"))
        .thenReturn(new ZaloPayCallbackPayload("gw-123", paymentIntentId, BigDecimal.valueOf(199000), "VND",
            null, false, "FAILED"));
    when(paymentRepository.findByGatewayRefForUpdate("gw-123")).thenReturn(Optional.of(paymentIntent));
    when(registrationRepository.findById(registrationId)).thenReturn(Optional.of(registration));

    service.handleZaloPayCallback("data", "mac");

    verify(registrationRepository).updateSessionSeatCounters(sessionId, 0, -1);
    verify(qrTicketService, never()).ensureQrTicket(any());
    verify(registrationConfirmationMailService, never()).queueRegistrationConfirmedEmail(any());
  }

  private PaymentIntent pendingGatewayIntent() {
    return new PaymentIntent(paymentIntentId, registrationId, "idem", null, PaymentStatus.PENDING_GATEWAY,
        BigDecimal.valueOf(199000), "VND", null, LocalDateTime.of(2026, 5, 8, 10, 15), null, null,
        LocalDateTime.of(2026, 5, 8, 10, 0), LocalDateTime.of(2026, 5, 8, 10, 0));
  }

  private PaymentIntent pendingPaymentIntent() {
    return new PaymentIntent(paymentIntentId, registrationId, "idem", "gw-123", PaymentStatus.PENDING_PAYMENT,
        BigDecimal.valueOf(199000), "VND", "https://pay", LocalDateTime.of(2026, 5, 8, 10, 15), null, null,
        LocalDateTime.of(2026, 5, 8, 10, 0), LocalDateTime.of(2026, 5, 8, 10, 1));
  }

  private PaymentIntent succeededIntent() {
    return new PaymentIntent(paymentIntentId, registrationId, "idem", "gw-123", PaymentStatus.SUCCEEDED,
        BigDecimal.valueOf(199000), "VND", "https://pay", LocalDateTime.of(2026, 5, 8, 10, 15),
        LocalDateTime.of(2026, 5, 8, 10, 5), null,
        LocalDateTime.of(2026, 5, 8, 10, 0), LocalDateTime.of(2026, 5, 8, 10, 5));
  }

  private Registration pendingPaidRegistration() {
    return new Registration(registrationId, studentId, sessionId, RegistrationStatus.PENDING_PAYMENT,
        RegistrationType.PAID, LocalDateTime.of(2026, 5, 8, 10, 0), null,
        LocalDateTime.of(2026, 5, 8, 10, 15), null,
        LocalDateTime.of(2026, 5, 8, 10, 0), LocalDateTime.of(2026, 5, 8, 10, 0));
  }

  private Registration confirmedRegistration() {
    return new Registration(registrationId, studentId, sessionId, RegistrationStatus.CONFIRMED,
        RegistrationType.PAID, LocalDateTime.of(2026, 5, 8, 10, 0), LocalDateTime.of(2026, 5, 8, 10, 5),
        LocalDateTime.of(2026, 5, 8, 10, 15), null,
        LocalDateTime.of(2026, 5, 8, 10, 0), LocalDateTime.of(2026, 5, 8, 10, 5));
  }
}
