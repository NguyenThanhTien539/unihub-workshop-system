package com.unihub.infrastructure.qr;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.unihub.application.qr.QrCodeGenerator;
import java.io.ByteArrayOutputStream;
import java.util.EnumMap;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ZxingQrCodeGenerator implements QrCodeGenerator {
  @Override
  public byte[] generatePng(String payload, int imageSize) {
    try {
      Map<EncodeHintType, Object> hints = new EnumMap<>(EncodeHintType.class);
      hints.put(EncodeHintType.MARGIN, 1);
      BitMatrix matrix = new MultiFormatWriter().encode(payload, BarcodeFormat.QR_CODE, imageSize, imageSize, hints);
      ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
      MatrixToImageWriter.writeToStream(matrix, "PNG", outputStream);
      return outputStream.toByteArray();
    } catch (WriterException | java.io.IOException ex) {
      throw new IllegalStateException("Unable to generate QR code", ex);
    }
  }
}
