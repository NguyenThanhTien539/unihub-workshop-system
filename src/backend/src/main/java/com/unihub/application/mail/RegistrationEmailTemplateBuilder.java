package com.unihub.application.mail;

import com.unihub.application.qr.QrTicketData;
import com.unihub.domain.registration.RegistrationEmailView;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import org.springframework.stereotype.Component;

@Component
public class RegistrationEmailTemplateBuilder {
  private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
  private static final String QR_CONTENT_ID = "registrationQrCode";

  public RegistrationConfirmedEmailContent build(RegistrationEmailView emailView, QrTicketData qrTicketData) {
    String subject = "Xác nhận đăng ký: " + emailView.workshopTitle();
    String building = emailView.building() == null || emailView.building().isBlank()
        ? ""
        : " (" + emailView.building() + ")";
    String body = """
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:24px;background-color:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#222;">
            <div style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:12px;padding:24px;border:1px solid #e6e6e6;">
              <div style="font-size:20px;font-weight:700;letter-spacing:0.2px;margin-bottom:16px;">Đăng ký đã được xác nhận</div>
              <p style="margin:0 0 12px 0;">Xin chào %s,</p>
              <p style="margin:0 0 16px 0;">Đăng ký của bạn cho workshop <strong>%s</strong> đã được xác nhận.</p>

              <div style="border:1px solid #e6e6e6;border-radius:10px;padding:16px;margin-bottom:20px;">
                <div style="margin-bottom:8px;"><strong>Thời gian:</strong> %s - %s</div>
                <div style="margin-bottom:8px;"><strong>Phòng:</strong> %s%s</div>
                <div><strong>Trạng thái đăng ký:</strong> Đã xác nhận</div>
              </div>

              <div style="text-align:center;margin:12px 0 8px 0;">
                <img src="cid:%s" alt="Mã QR đăng ký" style="width:220px;height:220px;border:1px solid #efefef;border-radius:8px;" />
                <p style="margin:12px 0 0 0;">Vui lòng xuất trình mã QR này tại quầy check-in.</p>
              </div>

              <div style="margin-top:20px;font-size:12px;color:#666;border-top:1px solid #eee;padding-top:12px;">
                Đây là email tự động từ UniHub. Vui lòng không phản hồi email này.
              </div>
            </div>
          </body>
        </html>
        """
        .formatted(
            emailView.recipientName(),
            emailView.workshopTitle(),
            DATE_TIME_FORMATTER.format(emailView.startAt()),
            DATE_TIME_FORMATTER.format(emailView.endAt()),
            emailView.roomName(),
            building,
            QR_CONTENT_ID);

    String base64Png = qrTicketData.dataUrl().substring(qrTicketData.dataUrl().indexOf(',') + 1);
    return new RegistrationConfirmedEmailContent(
        emailView.recipientEmail(),
        subject,
        body,
        QR_CONTENT_ID,
        Base64.getDecoder().decode(base64Png));
  }
}
