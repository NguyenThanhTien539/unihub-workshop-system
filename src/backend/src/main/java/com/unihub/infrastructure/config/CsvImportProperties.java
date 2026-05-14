package com.unihub.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.csv-import")
public record CsvImportProperties(
    boolean enabled,
    String inputDirectory,
    String filePattern,
    String cron,
    boolean recordMissingBatch) {
}
