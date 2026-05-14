package com.unihub.application.registration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.unihub.application.mail.RegistrationConfirmationMailService;
import com.unihub.application.qr.QrTicketService;
import com.unihub.application.registration.exception.RegistrationException;
import com.unihub.domain.payment.PaymentIntent;
import com.unihub.domain.payment.PaymentRepository;
import com.unihub.domain.payment.PaymentStatus;
import com.unihub.domain.registration.Registration;
import com.unihub.domain.registration.RegistrationRepository;
import com.unihub.domain.registration.RegistrationSessionSnapshot;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import com.unihub.domain.student.StudentStatus;
import com.unihub.domain.workshop.FeeType;
import com.unihub.domain.workshop.WorkshopSessionStatus;
import com.unihub.domain.workshop.WorkshopStatus;
import com.unihub.infrastructure.config.PaymentProperties;
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
class RegistrationCommandServiceTest {
  @Mock
  private StudentRepository studentRepository;
  @Mock
  private RegistrationRepository registrationRepository;
  @Mock
  private PaymentRepository paymentRepository;
  @Mock
  private QrTicketService qrTicketService;
  @Mock
  private RegistrationConfirmationMailService registrationConfirmationMailService;

  private RegistrationCommandService service;
  private UUID userId;
  private UUID studentId;
  private UUID sessionId;
  private UUID workshopId;

  @BeforeEach
  void setUp() {
    Clock clock = Clock.fixed(Instant.parse("2026-05-08T10:00:00Z"), ZoneOffset.UTC);
    PaymentProperties paymentProperties = new PaymentProperties(15, null);
    service = new RegistrationCommandService(
        studentRepository,
        registrationRepository,
        paymentRepository,
        qrTicketService,
        registrationConfirmationMailService,
        paymentProperties,
        clock);

    userId = UUID.randomUUID();
    studentId = UUID.randomUUID();
    sessionId = UUID.randomUUID();
    workshopId = UUID.randomUUID();

    lenient().when(studentRepository.findByUserId(userId))
        .thenReturn(Optional.of(new Student(
            studentId,
            userId,
            "S0001",
            "Engineering",
            "Software Engineering",
            "SE-2025",
            StudentStatus.ACTIVE)));
    lenient().when(registrationRepository.findActiveByStudentAndSession(studentId, sessionId))
        .thenReturn(Optional.empty());
  }

  @Test
  void freeRegistrationCreatesConfirmedRegistrationQrAndEmailJob() {
    when(registrationRepository.lockSessionForRegistration(sessionId)).thenReturn(freeSnapshot(1));

    RegistrationResult result = service.registerFree(new CreateFreeRegistrationCommand(userId, sessionId));

    assertEquals("CONFIRMED", result.registrationStatus());
    assertEquals(true, result.qrAvailable());
    verify(registrationRepository).save(any(Registration.class));
    verify(registrationRepository).updateSessionSeatCounters(sessionId, 1, 0);
    verify(qrTicketService).ensureQrTicket(any(Registration.class));
    verify(registrationConfirmationMailService).queueRegistrationConfirmedNotifications(result.registrationId());
    verify(paymentRepository, never()).save(any(PaymentIntent.class));
  }

  @Test
  void freeRegistrationRejectsPaidSession() {
    when(registrationRepository.lockSessionForRegistration(sessionId)).thenReturn(paidSnapshot(1));

    assertThrows(RegistrationException.class,
        () -> service.registerFree(new CreateFreeRegistrationCommand(userId, sessionId)));

    verify(paymentRepository, never()).save(any(PaymentIntent.class));
    verify(qrTicketService, never()).ensureQrTicket(any());
  }

  @Test
  void paidRegistrationCreatesPendingPaymentWithoutQrOrEmail() {
    when(registrationRepository.lockSessionForRegistration(sessionId)).thenReturn(paidSnapshot(2));

    RegistrationResult result = service.registerPaid(new CreatePaidRegistrationCommand(userId, sessionId));

    assertEquals("PENDING_PAYMENT", result.registrationStatus());
    assertEquals("PENDING_GATEWAY", result.paymentStatus());
    assertEquals(false, result.qrAvailable());
    verify(registrationRepository).updateSessionSeatCounters(sessionId, 0, 1);
    verify(paymentRepository).save(any(PaymentIntent.class));
    verify(qrTicketService, never()).ensureQrTicket(any());
    verify(registrationConfirmationMailService, never()).queueRegistrationConfirmedNotifications(any());
  }

  @Test
  void duplicateRegistrationReturnsConflict() {
    Registration existing = new Registration(UUID.randomUUID(), studentId, sessionId, RegistrationStatus.CONFIRMED,
        com.unihub.domain.registration.RegistrationType.FREE, null, LocalDateTime.now(), null, null,
        LocalDateTime.now(), LocalDateTime.now());
    when(registrationRepository.lockSessionForRegistration(sessionId)).thenReturn(freeSnapshot(5));
    when(registrationRepository.findActiveByStudentAndSession(studentId, sessionId)).thenReturn(Optional.of(existing));

    assertThrows(RegistrationException.class,
        () -> service.registerFree(new CreateFreeRegistrationCommand(userId, sessionId)));
  }

  @Test
  void fullSessionReturnsConflict() {
    when(registrationRepository.lockSessionForRegistration(sessionId)).thenReturn(freeSnapshot(0));

    assertThrows(RegistrationException.class,
        () -> service.registerFree(new CreateFreeRegistrationCommand(userId, sessionId)));
  }

  private RegistrationSessionSnapshot freeSnapshot(int remainingSeats) {
    return snapshot(FeeType.FREE, BigDecimal.ZERO, remainingSeats);
  }

  private RegistrationSessionSnapshot paidSnapshot(int remainingSeats) {
    return snapshot(FeeType.PAID, BigDecimal.valueOf(199000), remainingSeats);
  }

  private RegistrationSessionSnapshot snapshot(FeeType feeType, BigDecimal feeAmount, int remainingSeats) {
    int seatCapacity = 10;
    int seatsConfirmed = seatCapacity - remainingSeats;
    return new RegistrationSessionSnapshot(
        workshopId,
        "Workshop",
        WorkshopStatus.PUBLISHED,
        sessionId,
        WorkshopSessionStatus.OPEN,
        UUID.randomUUID(),
        "Room A",
        "H1",
        LocalDateTime.of(2026, 6, 1, 8, 0),
        LocalDateTime.of(2026, 6, 1, 10, 0),
        seatCapacity,
        seatsConfirmed,
        0,
        feeType,
        feeAmount,
        "VND");
  }
}
