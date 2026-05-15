package com.unihub.application.registration;

import com.unihub.application.qr.QrTicketData;
import com.unihub.application.qr.QrTicketService;
import com.unihub.application.registration.exception.RegistrationException;
import com.unihub.domain.registration.Registration;
import com.unihub.domain.registration.RegistrationErrorCode;
import com.unihub.domain.registration.RegistrationRepository;
import com.unihub.domain.registration.RegistrationView;
import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RegistrationQueryService {
  private final StudentRepository studentRepository;
  private final RegistrationRepository registrationRepository;
  private final QrTicketService qrTicketService;

  public RegistrationQueryService(
      StudentRepository studentRepository,
      RegistrationRepository registrationRepository,
      QrTicketService qrTicketService) {
    this.studentRepository = studentRepository;
    this.registrationRepository = registrationRepository;
    this.qrTicketService = qrTicketService;
  }

  @Transactional(readOnly = true)
  public List<RegistrationView> getMyRegistrations(UUID userId) {
    Student student = requireStudent(userId);
    return registrationRepository.findViewsByStudentId(student.id());
  }

  @Transactional(readOnly = true)
  public RegistrationView getMyRegistration(UUID userId, UUID registrationId) {
    Student student = requireStudent(userId);
    return requireOwnedRegistration(registrationId, student.id());
  }

  @Transactional
  public QrTicketData getMyRegistrationQr(UUID userId, UUID registrationId) {
    Student student = requireStudent(userId);
    RegistrationView view = requireOwnedRegistration(registrationId, student.id());
    if (!view.registrationStatus().isConfirmed()) {
      throw new RegistrationException(RegistrationErrorCode.REG_QR_NOT_AVAILABLE, HttpStatus.CONFLICT);
    }
    Registration registration = registrationRepository.findById(registrationId)
        .orElseThrow(() -> new RegistrationException(RegistrationErrorCode.REG_NOT_FOUND, HttpStatus.NOT_FOUND));
    return qrTicketService.getQrTicketData(registration);
  }

  private Student requireStudent(UUID userId) {
    return studentRepository.findByUserId(userId)
        .orElseThrow(() -> new RegistrationException(RegistrationErrorCode.REG_STUDENT_NOT_ELIGIBLE, HttpStatus.FORBIDDEN));
  }

  private RegistrationView requireOwnedRegistration(UUID registrationId, UUID studentId) {
    return registrationRepository.findViewByIdForStudent(registrationId, studentId)
        .orElseThrow(() -> notFoundOrForbidden(registrationId));
  }

  private RegistrationException notFoundOrForbidden(UUID registrationId) {
    Registration registration = registrationRepository.findById(registrationId).orElse(null);
    if (registration == null) {
      return new RegistrationException(RegistrationErrorCode.REG_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return new RegistrationException(RegistrationErrorCode.REG_ACCESS_DENIED, HttpStatus.FORBIDDEN);
  }
}
