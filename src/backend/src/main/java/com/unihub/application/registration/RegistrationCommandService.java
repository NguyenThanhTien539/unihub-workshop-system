package com.unihub.application.registration;

import com.unihub.application.mail.RegistrationConfirmationMailService;
import com.unihub.application.qr.QrTicketService;
import com.unihub.application.registration.exception.RegistrationException;
import com.unihub.domain.payment.PaymentIntent;
import com.unihub.domain.payment.PaymentRepository;
import com.unihub.domain.payment.PaymentStatus;
import com.unihub.domain.registration.Registration;
import com.unihub.domain.registration.RegistrationErrorCode;
import com.unihub.domain.registration.RegistrationRepository;
import com.unihub.domain.registration.RegistrationSessionSnapshot;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.domain.registration.RegistrationType;
import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import com.unihub.domain.student.StudentStatus;
import com.unihub.domain.workshop.FeeType;
import com.unihub.domain.workshop.WorkshopSessionStatus;
import com.unihub.domain.workshop.WorkshopStatus;
import com.unihub.infrastructure.config.PaymentProperties;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationCommandService {
  private final StudentRepository studentRepository;
  private final RegistrationRepository registrationRepository;
  private final PaymentRepository paymentRepository;
  private final QrTicketService qrTicketService;
  private final RegistrationConfirmationMailService registrationConfirmationMailService;
  private final PaymentProperties paymentProperties;
  private final Clock clock;

  public RegistrationCommandService(
      StudentRepository studentRepository,
      RegistrationRepository registrationRepository,
      PaymentRepository paymentRepository,
      QrTicketService qrTicketService,
      RegistrationConfirmationMailService registrationConfirmationMailService,
      PaymentProperties paymentProperties,
      Clock clock) {
    this.studentRepository = studentRepository;
    this.registrationRepository = registrationRepository;
    this.paymentRepository = paymentRepository;
    this.qrTicketService = qrTicketService;
    this.registrationConfirmationMailService = registrationConfirmationMailService;
    this.paymentProperties = paymentProperties;
    this.clock = clock;
  }

  @Transactional
  public RegistrationResult registerFree(CreateFreeRegistrationCommand command) {
    Student student = requireEligibleStudent(command.userId());
    RegistrationSessionSnapshot session = requireRegisterableSession(command.sessionId(), FeeType.FREE);
    ensureNoDuplicate(student.id(), session.sessionId());
    ensureCapacity(session);

    LocalDateTime now = LocalDateTime.now(clock);
    Registration registration = new Registration(
        UUID.randomUUID(),
        student.id(),
        session.sessionId(),
        RegistrationStatus.CONFIRMED,
        RegistrationType.FREE,
        null,
        now,
        null,
        null,
        now,
        now);

    try {
      registrationRepository.save(registration);
    } catch (DataIntegrityViolationException ex) {
      throw duplicateRegistration();
    }
    registrationRepository.updateSessionSeatCounters(session.sessionId(), 1, 0);
    qrTicketService.ensureQrTicket(registration);
    registrationConfirmationMailService.queueRegistrationConfirmedNotifications(registration.id());

    return new RegistrationResult(
        registration.id(),
        session.workshopId(),
        session.sessionId(),
        registration.status().name(),
        true,
        null,
        null,
        null,
        session.currency(),
        null);
  }

  @Transactional
  public RegistrationResult registerPaid(CreatePaidRegistrationCommand command) {
    Student student = requireEligibleStudent(command.userId());
    RegistrationSessionSnapshot session = requireRegisterableSession(command.sessionId(), FeeType.PAID);
    ensureNoDuplicate(student.id(), session.sessionId());
    ensureCapacity(session);

    LocalDateTime now = LocalDateTime.now(clock);
    LocalDateTime expiresAt = now.plusMinutes(paymentProperties.pendingExpirationMinutes());
    Registration registration = new Registration(
        UUID.randomUUID(),
        student.id(),
        session.sessionId(),
        RegistrationStatus.PENDING_PAYMENT,
        RegistrationType.PAID,
        now,
        null,
        expiresAt,
        null,
        now,
        now);

    try {
      registrationRepository.save(registration);
    } catch (DataIntegrityViolationException ex) {
      throw duplicateRegistration();
    }
    registrationRepository.updateSessionSeatCounters(session.sessionId(), 0, 1);

    PaymentIntent paymentIntent = new PaymentIntent(
        UUID.randomUUID(),
        registration.id(),
        "ZALOPAY",
        "payment-intent:" + registration.id(),
        null,
        PaymentStatus.PENDING_GATEWAY,
        session.feeAmount(),
        session.currency(),
        null,
        expiresAt,
        null,
        null,
        now,
        now);
    paymentRepository.save(paymentIntent);

    return new RegistrationResult(
        registration.id(),
        session.workshopId(),
        session.sessionId(),
        registration.status().name(),
        false,
        paymentIntent.id(),
        paymentIntent.status().name(),
        paymentIntent.amount(),
        paymentIntent.currency(),
        paymentIntent.expiresAt());
  }

  private Student requireEligibleStudent(UUID userId) {
    Student student = studentRepository.findByUserId(userId)
        .orElseThrow(
            () -> new RegistrationException(RegistrationErrorCode.REG_STUDENT_NOT_ELIGIBLE, HttpStatus.FORBIDDEN));
    if (student.status() != StudentStatus.ACTIVE) {
      throw new RegistrationException(RegistrationErrorCode.REG_STUDENT_NOT_ELIGIBLE, HttpStatus.FORBIDDEN);
    }
    return student;
  }

  private RegistrationSessionSnapshot requireRegisterableSession(UUID sessionId, FeeType expectedFeeType) {
    RegistrationSessionSnapshot session = registrationRepository.lockSessionForRegistration(sessionId);
    if (session == null) {
      throw new RegistrationException(RegistrationErrorCode.REG_SESSION_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (session.workshopStatus() != WorkshopStatus.PUBLISHED) {
      throw new RegistrationException(RegistrationErrorCode.REG_SESSION_NOT_REGISTERABLE, HttpStatus.CONFLICT);
    }
    if (session.sessionStatus() == WorkshopSessionStatus.CANCELED) {
      throw new RegistrationException(RegistrationErrorCode.REG_SESSION_CANCELED, HttpStatus.CONFLICT);
    }
    if (session.sessionStatus() != WorkshopSessionStatus.OPEN
        && session.sessionStatus() != WorkshopSessionStatus.FULL) {
      throw new RegistrationException(RegistrationErrorCode.REG_SESSION_NOT_REGISTERABLE, HttpStatus.CONFLICT);
    }
    if (expectedFeeType == FeeType.FREE && session.feeType() != FeeType.FREE) {
      throw new RegistrationException(RegistrationErrorCode.REG_PAYMENT_REQUIRED, HttpStatus.BAD_REQUEST);
    }
    if (expectedFeeType == FeeType.PAID && session.feeType() != FeeType.PAID) {
      throw new RegistrationException(RegistrationErrorCode.REG_PAYMENT_NOT_REQUIRED, HttpStatus.BAD_REQUEST);
    }
    return session;
  }

  private void ensureNoDuplicate(UUID studentId, UUID sessionId) {
    if (registrationRepository.findActiveByStudentAndSession(studentId, sessionId).isPresent()) {
      throw duplicateRegistration();
    }
  }

  private void ensureCapacity(RegistrationSessionSnapshot session) {
    if (session.remainingSeats() <= 0) {
      throw new RegistrationException(RegistrationErrorCode.REG_SESSION_FULL, HttpStatus.CONFLICT);
    }
  }

  private RegistrationException duplicateRegistration() {
    return new RegistrationException(RegistrationErrorCode.REG_ALREADY_EXISTS, HttpStatus.CONFLICT);
  }
}
