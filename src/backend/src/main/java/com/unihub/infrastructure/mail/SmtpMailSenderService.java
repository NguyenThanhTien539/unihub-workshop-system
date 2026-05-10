package com.unihub.infrastructure.mail;

import com.unihub.application.mail.MailSenderService;
import com.unihub.application.mail.RegistrationConfirmedEmailContent;
import com.unihub.infrastructure.config.MailProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class SmtpMailSenderService implements MailSenderService {
  private static final Logger log = LoggerFactory.getLogger(SmtpMailSenderService.class);

  private final JavaMailSender javaMailSender;
  private final MailProperties mailProperties;

  public SmtpMailSenderService(JavaMailSender javaMailSender, MailProperties mailProperties) {
    this.javaMailSender = javaMailSender;
    this.mailProperties = mailProperties;
  }

  @Override
  public void sendRegistrationConfirmedEmail(RegistrationConfirmedEmailContent content) {
    if (!mailProperties.enabled()) {
      log.info("Mail sending disabled. Skipping SMTP send for {}", content.to());
      return;
    }

    try {
      var mimeMessage = javaMailSender.createMimeMessage();
      var helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
      helper.setTo(content.to());
      helper.setFrom(mailProperties.from());
      helper.setSubject(content.subject());
      helper.setText(content.body(), true);
      helper.addInline(content.qrContentId(), new ByteArrayResource(content.qrPngBytes()), "image/png");
      javaMailSender.send(mimeMessage);
    } catch (Exception ex) {
      throw new IllegalStateException("Failed to send registration confirmation email", ex);
    }
  }
}
