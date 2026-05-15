package com.unihub.application.aisummary;

public interface PdfTextExtractor {
  String extractText(byte[] pdfBytes);
}
