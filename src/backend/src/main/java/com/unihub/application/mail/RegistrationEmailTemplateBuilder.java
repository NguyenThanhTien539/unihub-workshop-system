package com.unihub.application.mail;

import com.unihub.application.qr.QrTicketData;
import com.unihub.domain.registration.RegistrationEmailView;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import org.springframework.stereotype.Component;

@Component
public class RegistrationEmailTemplateBuilder {
  private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  public RegistrationConfirmedEmailContent build(RegistrationEmailView emailView, QrTicketData qrTicketData) {
    String subject = "Registration confirmed: " + emailView.workshopTitle();
    String body = """
        Hello %s,

        Your registration for %s has been confirmed.

        Session time: %s - %s
        Room: %s%s
        Registration status: CONFIRMED

        QR payload:
        %s

        Please keep the attached QR code ready for check-in.
        """.formatted(
        emailView.recipientName(),
        emailView.workshopTitle(),
        DATE_TIME_FORMATTER.format(emailView.startAt()),
        DATE_TIME_FORMATTER.format(emailView.endAt()),
        emailView.roomName(),
        emailView.building() == null || emailView.building().isBlank() ? "" : " (" + emailView.building() + ")",
        qrTicketData.payload());

    String base64Png = qrTicketData.dataUrl().substring(qrTicketData.dataUrl().indexOf(',') + 1);
    return new RegistrationConfirmedEmailContent(
        emailView.recipientEmail(),
        subject,
        body,
        "unihub-registration-qr-" + qrTicketData.qrTicketId() + ".png",
        Base64.getDecoder().decode(base64Png));
  }
}
