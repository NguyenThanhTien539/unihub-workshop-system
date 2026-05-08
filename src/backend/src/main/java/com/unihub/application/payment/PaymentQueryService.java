package com.unihub.application.payment;

import com.unihub.application.payment.exception.PaymentException;
import com.unihub.domain.payment.PaymentErrorCode;
import com.unihub.domain.payment.PaymentIntent;
import com.unihub.domain.payment.PaymentRepository;
import com.unihub.domain.registration.RegistrationRepository;
import com.unihub.domain.registration.RegistrationView;
import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentQueryService {
  private final StudentRepository studentRepository;
  private final PaymentRepository paymentRepository;
  private final RegistrationRepository registrationRepository;

  public PaymentQueryService(
      StudentRepository studentRepository,
      PaymentRepository paymentRepository,
      RegistrationRepository registrationRepository) {
    this.studentRepository = studentRepository;
    this.paymentRepository = paymentRepository;
    this.registrationRepository = registrationRepository;
  }

  @Transactional(readOnly = true)
  public PaymentStatusResult getPaymentStatus(UUID userId, UUID paymentIntentId) {
    Student student = studentRepository.findByUserId(userId)
        .orElseThrow(() -> new PaymentException(PaymentErrorCode.PAYMENT_ACCESS_DENIED, HttpStatus.FORBIDDEN));
    PaymentIntent paymentIntent = paymentRepository.findById(paymentIntentId)
        .orElseThrow(() -> new PaymentException(PaymentErrorCode.PAYMENT_NOT_FOUND, HttpStatus.NOT_FOUND));
    RegistrationView view = registrationRepository.findViewByIdForStudent(paymentIntent.registrationId(), student.id()).orElse(null);
    if (view == null) {
      if (registrationRepository.findById(paymentIntent.registrationId()).isPresent()) {
        throw new PaymentException(PaymentErrorCode.PAYMENT_ACCESS_DENIED, HttpStatus.FORBIDDEN);
      }
      throw new PaymentException(PaymentErrorCode.PAYMENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return new PaymentStatusResult(
        paymentIntent.id(),
        paymentIntent.registrationId(),
        paymentIntent.status().name(),
        view.registrationStatus().name(),
        paymentIntent.amount(),
        paymentIntent.currency(),
        "ZALOPAY",
        paymentIntent.gatewayRef(),
        paymentIntent.expiresAt(),
        view.qrAvailable());
  }
}
