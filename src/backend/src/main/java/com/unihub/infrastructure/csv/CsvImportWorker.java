package com.unihub.infrastructure.csv;

import com.unihub.application.csvimport.CsvImportCommandService;
import com.unihub.infrastructure.config.CsvImportProperties;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.PathMatcher;
import java.util.Comparator;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class CsvImportWorker {
  private static final Logger log = LoggerFactory.getLogger(CsvImportWorker.class);

  private final CsvImportProperties csvImportProperties;
  private final CsvImportCommandService csvImportCommandService;

  public CsvImportWorker(
      CsvImportProperties csvImportProperties,
      CsvImportCommandService csvImportCommandService) {
    this.csvImportProperties = csvImportProperties;
    this.csvImportCommandService = csvImportCommandService;
  }

  @Scheduled(
      cron = "${app.csv-import.cron:0 0 2 * * *}",
      zone = "${app.csv-import.timezone:Asia/Ho_Chi_Minh}")
  public void runScheduledImport() {
    if (!csvImportProperties.enabled()) {
      return;
    }

    log.info("Scheduled CSV import started");
    Path inputDirectory = Path.of(csvImportProperties.inputDirectory()).toAbsolutePath().normalize();
    String filePattern = csvImportProperties.filePattern() == null || csvImportProperties.filePattern().isBlank()
        ? "students-*.csv"
        : csvImportProperties.filePattern();

    try {
      if (!Files.isDirectory(inputDirectory)) {
        recordMissing(filePattern, "CSV import directory does not exist: " + inputDirectory);
        return;
      }

      PathMatcher matcher = FileSystems.getDefault().getPathMatcher("glob:" + filePattern);
      List<Path> files;
      try (var stream = Files.list(inputDirectory)) {
        files = stream
            .filter(Files::isRegularFile)
            .filter(path -> matcher.matches(path.getFileName()))
            .sorted(Comparator.comparing(this::lastModifiedMillis))
            .toList();
      }

      if (files.isEmpty()) {
        recordMissing(filePattern, "No CSV file found in " + inputDirectory);
        return;
      }

      for (Path file : files) {
        var result = csvImportCommandService.importFile(file);
        log.info("CSV import {} for file {} with status {}",
            result.skipped() ? "skipped" : "processed",
            file.getFileName(),
            result.batch().status());
      }
      log.info("Scheduled CSV import finished; scanned {} file(s)", files.size());
    } catch (Exception ex) {
      log.warn("Scheduled CSV import failed", ex);
    }
  }

  private void recordMissing(String filePattern, String reason) {
    if (!csvImportProperties.recordMissingBatch()) {
      log.info("CSV import skipped: {}", reason);
      return;
    }
    csvImportCommandService.recordMissed(filePattern, reason);
  }

  private long lastModifiedMillis(Path path) {
    try {
      return Files.getLastModifiedTime(path).toMillis();
    } catch (Exception ex) {
      return Long.MAX_VALUE;
    }
  }
}
