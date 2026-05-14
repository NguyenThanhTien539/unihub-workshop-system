package com.unihub.application.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

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
import org.springframework.http.HttpStatus;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

@ExtendWith(MockitoExtension.class)
class PaymentCommandServiceTest {
  @Mock
  private StudentRepository studentRepository;
  @Mock
  private PaymentRepository paymentRepository;
  @Mock
  private RegistrationRepository registrationRepository;
  @Mock
  private ZaloPayClient zaloPayClient;
  @Mock
  private QrTicketService qrTicketService;
  @Mock
  private RegistrationConfirmationMailService registrationConfirmationMailService;
  @Mock
  private TransactionTemplate transactionTemplate;

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
        transactionTemplate,
        Clock.fixed(Instant.parse("2026-05-08T10:00:00Z"), ZoneOffset.UTC));
    userId = UUID.randomUUID();
    studentId = UUID.randomUUID();
    registrationId = UUID.randomUUID();
    paymentIntentId = UUID.randomUUID();
    sessionId = UUID.randomUUID();

    lenient().when(studentRepository.findByUserId(userId))
        .thenReturn(Optional.of(new Student(
            studentId,
            userId,
            "S0001",
            "Engineering",
            "Software Engineering",
            "SE-2025",
            StudentStatus.ACTIVE)));
    lenient().when(transactionTemplate.execute(any())).thenAnswer(invocation ->
        ((TransactionCallback<?>) invocation.getArgument(0)).doInTransaction(null));
    lenient().when(registrationRepository.update(any())).thenAnswer(invocation -> invocation.getArgument(0));
    lenient().when(paymentRepository.update(any())).thenAnswer(invocation -> invocation.getArgument(0));
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
        .thenReturn(new ZaloPayCallbackPayload("gw-123", paymentIntentId, registrationId,
            BigDecimal.valueOf(199000), "VND", LocalDateTime.of(2026, 5, 8, 10, 5), true, null));
    when(paymentRepository.findByProviderTransactionIdForUpdate("gw-123")).thenReturn(Optional.of(paymentIntent));
    when(registrationRepository.findByIdForUpdate(registrationId)).thenReturn(Optional.of(registration));

    ZaloPayCallbackResult result = service.handleZaloPayCallback("data", "mac");

    assertEquals(1, result.return_code());
    verify(registrationRepository).updateSessionSeatCounters(sessionId, 1, -1);
    verify(qrTicketService).ensureQrTicket(any(Registration.class));
    verify(registrationConfirmationMailService).queueRegistrationConfirmedNotifications(registrationId);
  }

  @Test
  void duplicateSuccessfulCallbackDoesNotAdjustSeatsOrQueueEmailAgain() {
    PaymentIntent paymentIntent = succeededIntent();
    Registration registration = new Registration(registrationId, studentId, sessionId, RegistrationStatus.CONFIRMED,
        RegistrationType.PAID, LocalDateTime.now(), LocalDateTime.now(), LocalDateTime.now().plusMinutes(10), null,
        LocalDateTime.now(), LocalDateTime.now());
    when(zaloPayClient.verifyAndParseCallback("data", "mac"))
        .thenReturn(new ZaloPayCallbackPayload("gw-123", paymentIntentId, registrationId,
            BigDecimal.valueOf(199000), "VND", LocalDateTime.of(2026, 5, 8, 10, 5), true, null));
    when(paymentRepository.findByProviderTransactionIdForUpdate("gw-123")).thenReturn(Optional.of(paymentIntent));

    service.handleZaloPayCallback("data", "mac");

    verify(registrationRepository, never()).updateSessionSeatCounters(any(), any(int.class), any(int.class));
    verify(registrationConfirmationMailService, never()).queueRegistrationConfirmedNotifications(any());
    verify(qrTicketService, never()).ensureQrTicket(any(Registration.class));
  }

  @Test
  void failedCallbackMarksPaymentAndRegistrationFailedWithoutQr() {
    PaymentIntent paymentIntent = pendingPaymentIntent();
    Registration registration = pendingPaidRegistration();
    when(zaloPayClient.verifyAndParseCallback("data", "mac"))
        .thenReturn(new ZaloPayCallbackPayload("gw-123", paymentIntentId, registrationId,
            BigDecimal.valueOf(199000), "VND", null, false, "FAILED"));
    when(paymentRepository.findByProviderTransactionIdForUpdate("gw-123")).thenReturn(Optional.of(paymentIntent));
    when(registrationRepository.findByIdForUpdate(registrationId)).thenReturn(Optional.of(registration));

    service.handleZaloPayCallback("data", "mac");

    verify(registrationRepository).updateSessionSeatCounters(sessionId, 0, -1);
    verify(qrTicketService, never()).ensureQrTicket(any());
    verify(registrationConfirmationMailService, never()).queueRegistrationConfirmedNotifications(any());
  }

  @Test
  void invalidMacDoesNotTouchPaymentState() {
    when(zaloPayClient.verifyAndParseCallback("data", "mac"))
        .thenThrow(new PaymentException(PaymentErrorCode.PAYMENT_CALLBACK_MAC_INVALID, HttpStatus.UNAUTHORIZED,
            "mac not equal"));

    assertThrows(PaymentException.class, () -> service.handleZaloPayCallback("data", "mac"));

    verify(paymentRepository, never()).findByProviderTransactionIdForUpdate(any());
    verify(registrationRepository, never()).findByIdForUpdate(any());
    verify(qrTicketService, never()).ensureQrTicket(any());
  }

  @Test
  void amountMismatchRejectsCallbackWithoutChangingState() {
    PaymentIntent paymentIntent = pendingPaymentIntent();
    Registration registration = pendingPaidRegistration();
    when(zaloPayClient.verifyAndParseCallback("data", "mac"))
        .thenReturn(new ZaloPayCallbackPayload("gw-123", paymentIntentId, registrationId,
            BigDecimal.valueOf(200000), "VND", LocalDateTime.of(2026, 5, 8, 10, 5), true, null));
    when(paymentRepository.findByProviderTransactionIdForUpdate("gw-123")).thenReturn(Optional.of(paymentIntent));
    when(registrationRepository.findByIdForUpdate(registrationId)).thenReturn(Optional.of(registration));

    assertThrows(PaymentException.class, () -> service.handleZaloPayCallback("data", "mac"));

    verify(paymentRepository, never()).update(any());
    verify(registrationRepository, never()).updateSessionSeatCounters(any(), any(int.class), any(int.class));
    verify(qrTicketService, never()).ensureQrTicket(any());
  }

  @Test
  void expiredSuccessfulCallbackDoesNotConfirmRegistration() {
    PaymentIntent paymentIntent = new PaymentIntent(paymentIntentId, registrationId, "ZALOPAY", "idem", "gw-123",
        PaymentStatus.PENDING_PAYMENT, BigDecimal.valueOf(199000), "VND", "https://pay",
        LocalDateTime.of(2026, 5, 8, 9, 59), null, null,
        LocalDateTime.of(2026, 5, 8, 9, 45), LocalDateTime.of(2026, 5, 8, 9, 45));
    Registration registration = pendingPaidRegistration();
    when(zaloPayClient.verifyAndParseCallback("data", "mac"))
        .thenReturn(new ZaloPayCallbackPayload("gw-123", paymentIntentId, registrationId,
            BigDecimal.valueOf(199000), "VND", LocalDateTime.of(2026, 5, 8, 10, 5), true, null));
    when(paymentRepository.findByProviderTransactionIdForUpdate("gw-123")).thenReturn(Optional.of(paymentIntent));
    when(registrationRepository.findByIdForUpdate(registrationId)).thenReturn(Optional.of(registration));

    ZaloPayCallbackResult result = service.handleZaloPayCallback("data", "mac");

    assertEquals(0, result.return_code());
    verify(registrationRepository).updateSessionSeatCounters(sessionId, 0, -1);
    verify(qrTicketService, never()).ensureQrTicket(any());
    verify(registrationConfirmationMailService, never()).queueRegistrationConfirmedNotifications(any());
  }

  @Test
  void providerFailureWhileCreatingOrderIsReturnedAsControlledError() {
    PaymentIntent paymentIntent = pendingGatewayIntent();
    when(paymentRepository.findByIdForUpdate(paymentIntentId)).thenReturn(Optional.of(paymentIntent));
    when(registrationRepository.findViewByIdForStudent(registrationId, studentId))
        .thenReturn(Optional.of(new com.unihub.domain.registration.RegistrationView(
            registrationId,
            studentId,
            UUID.randomUUID(),
            "Workshop",
            sessionId,
            "Room A",
            "H1",
            LocalDateTime.of(2026, 6, 1, 8, 0),
            LocalDateTime.of(2026, 6, 1, 10, 0),
            RegistrationStatus.PENDING_PAYMENT,
            RegistrationType.PAID,
            paymentIntentId,
            PaymentStatus.PENDING_GATEWAY,
            BigDecimal.valueOf(199000),
            "VND",
            LocalDateTime.of(2026, 5, 8, 10, 15),
            null,
            false,
            LocalDateTime.of(2026, 5, 8, 10, 0),
            null)));
    when(zaloPayClient.createOrder(any(), any(), eq(userId)))
        .thenThrow(new PaymentException(PaymentErrorCode.PAYMENT_PROVIDER_UNAVAILABLE, HttpStatus.BAD_GATEWAY));

    PaymentException ex = assertThrows(PaymentException.class,
        () -> service.createZaloPayPaymentUrl(new CreatePaymentUrlCommand(userId, paymentIntentId)));

    assertEquals(PaymentErrorCode.PAYMENT_PROVIDER_UNAVAILABLE, ex.getErrorCode());
    verify(paymentRepository, never()).update(any());
  }

  @Test
  void expirationJobMarksPendingPaymentExpiredAndReleasesSeat() {
    PaymentIntent paymentIntent = new PaymentIntent(paymentIntentId, registrationId, "ZALOPAY", "idem", "gw-123",
        PaymentStatus.PENDING_PAYMENT, BigDecimal.valueOf(199000), "VND", "https://pay",
        LocalDateTime.of(2026, 5, 8, 9, 59), null, null,
        LocalDateTime.of(2026, 5, 8, 9, 45), LocalDateTime.of(2026, 5, 8, 9, 45));
    Registration registration = pendingPaidRegistration();
    when(paymentRepository.findExpiredPendingIds(LocalDateTime.of(2026, 5, 8, 10, 0), 50))
        .thenReturn(java.util.List.of(paymentIntentId));
    when(paymentRepository.findByIdForUpdate(paymentIntentId)).thenReturn(Optional.of(paymentIntent));
    when(registrationRepository.findByIdForUpdate(registrationId)).thenReturn(Optional.of(registration));

    int expiredCount = service.expirePendingPayments();

    assertEquals(1, expiredCount);
    verify(registrationRepository).updateSessionSeatCounters(sessionId, 0, -1);
    verify(paymentRepository).update(any(PaymentIntent.class));
  }

  private PaymentIntent pendingGatewayIntent() {
    return new PaymentIntent(paymentIntentId, registrationId, "ZALOPAY", "idem", null, PaymentStatus.PENDING_GATEWAY,
        BigDecimal.valueOf(199000), "VND", null, LocalDateTime.of(2026, 5, 8, 10, 15), null, null,
        LocalDateTime.of(2026, 5, 8, 10, 0), LocalDateTime.of(2026, 5, 8, 10, 0));
  }

  private PaymentIntent pendingPaymentIntent() {
    return new PaymentIntent(paymentIntentId, registrationId, "ZALOPAY", "idem", "gw-123", PaymentStatus.PENDING_PAYMENT,
        BigDecimal.valueOf(199000), "VND", "https://pay", LocalDateTime.of(2026, 5, 8, 10, 15), null, null,
        LocalDateTime.of(2026, 5, 8, 10, 0), LocalDateTime.of(2026, 5, 8, 10, 1));
  }

  private PaymentIntent succeededIntent() {
    return new PaymentIntent(paymentIntentId, registrationId, "ZALOPAY", "idem", "gw-123", PaymentStatus.SUCCESS,
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
