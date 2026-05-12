package com.unihub.application.qr;

public interface QrCodeGenerator {
  byte[] generatePng(String payload, int imageSize);
}
