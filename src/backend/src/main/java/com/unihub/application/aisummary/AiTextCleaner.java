package com.unihub.application.aisummary;

import com.unihub.infrastructure.config.AiSummaryProperties;
import org.springframework.stereotype.Component;

@Component
public class AiTextCleaner {
  private final AiSummaryProperties properties;

  public AiTextCleaner(AiSummaryProperties properties) {
    this.properties = properties;
  }

  public String clean(String text) {
    if (text == null) {
      return "";
    }

    String normalized = text
        .replace("\r\n", "\n")
        .replace('\r', '\n')
        .replaceAll("[\\t\\x0B\\f]+", " ")
        .replaceAll(" +", " ")
        .replaceAll(" *\\n *", "\n")
        .replaceAll("\\n{3,}", "\n\n")
        .trim();

    int maxChars = properties.effectiveMaxInputChars();
    if (normalized.length() <= maxChars) {
      return normalized;
    }
    return normalized.substring(0, maxChars).trim();
  }
}
