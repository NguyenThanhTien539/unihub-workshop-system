package com.unihub.application.mail;

public interface MailSenderService {
  void sendRegistrationConfirmedEmail(RegistrationConfirmedEmailContent content);
}
