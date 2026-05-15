package com.unihub.infrastructure.pdf;

import com.unihub.application.aisummary.AiSummaryProviderException;
import com.unihub.application.aisummary.PdfTextExtractor;
import com.unihub.domain.aisummary.AiSummaryErrorCode;
import java.io.IOException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

@Component
public class PdfBoxPdfTextExtractor implements PdfTextExtractor {
  @Override
  public String extractText(byte[] pdfBytes) {
    try (PDDocument document = PDDocument.load(pdfBytes)) {
      if (document.isEncrypted()) {
        throw new AiSummaryProviderException(AiSummaryErrorCode.AI_PDF_INVALID);
      }
      return new PDFTextStripper().getText(document);
    } catch (IOException ex) {
      throw new AiSummaryProviderException(AiSummaryErrorCode.AI_PDF_INVALID);
    }
  }
}
