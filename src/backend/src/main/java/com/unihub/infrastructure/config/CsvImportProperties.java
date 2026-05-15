package com.unihub.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.csv-import")
public record CsvImportProperties(
    boolean enabled,
    String inputDirectory,
    String filePattern,
    String cron,
    String timezone,
    String encoding,
    String delimiter,
    int batchSize,
    boolean recordMissingBatch) {
  public String effectiveEncoding() {
    return encoding == null || encoding.isBlank() ? "UTF-8" : encoding.trim();
  }

  public char effectiveDelimiter() {
    if (delimiter == null || delimiter.isEmpty()) {
      return ',';
    }
    return delimiter.charAt(0);
  }

  public int effectiveBatchSize() {
    return batchSize <= 0 ? 500 : batchSize;
  }
}
