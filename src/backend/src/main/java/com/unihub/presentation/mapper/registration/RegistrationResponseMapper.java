package com.unihub.presentation.mapper.registration;

import com.unihub.application.registration.RegistrationResult;
import com.unihub.application.qr.QrTicketData;
import com.unihub.domain.registration.RegistrationView;
import com.unihub.presentation.dto.response.qr.RegistrationQrResponse;
import com.unihub.presentation.dto.response.registration.RegistrationMutationResponse;
import com.unihub.presentation.dto.response.registration.RegistrationResponse;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class RegistrationResponseMapper {
  public RegistrationMutationResponse toMutationResponse(RegistrationResult result) {
    return new RegistrationMutationResponse(
        result.registrationId(),
        result.workshopId(),
        result.sessionId(),
        result.registrationStatus(),
        result.qrAvailable(),
        result.paymentIntentId(),
        result.paymentStatus(),
        result.amount(),
        result.currency(),
        result.expiresAt());
  }

  public RegistrationResponse toResponse(RegistrationView view) {
    return new RegistrationResponse(
        view.registrationId(),
        view.workshopId(),
        view.workshopTitle(),
        view.sessionId(),
        view.roomName(),
        view.building(),
        view.startAt(),
        view.endAt(),
        view.registrationStatus().name(),
        view.registrationType().name(),
        view.paymentIntentId(),
        view.paymentStatus() == null ? null : view.paymentStatus().name(),
        view.amount(),
        view.currency(),
        view.paymentExpiresAt(),
        view.qrTicketId(),
        view.qrAvailable(),
        view.createdAt(),
        view.confirmedAt());
  }

  public RegistrationQrResponse toQrResponse(UUID registrationId, QrTicketData qrTicketData) {
    return new RegistrationQrResponse(
        registrationId,
        qrTicketData.qrTicketId(),
        qrTicketData.dataUrl(),
        qrTicketData.expiresAt(),
        qrTicketData.status());
  }
}
