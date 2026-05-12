package com.unihub.application.mail;

public interface MailQueuePublisher {
  void publish(MailJob job);
}
