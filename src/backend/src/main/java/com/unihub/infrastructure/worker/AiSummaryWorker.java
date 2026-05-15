package com.unihub.infrastructure.worker;

import com.unihub.application.aisummary.AiSummaryWorkerService;
import com.unihub.infrastructure.config.AiSummaryProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AiSummaryWorker {
  private static final Logger log = LoggerFactory.getLogger(AiSummaryWorker.class);

  private final AiSummaryWorkerService workerService;
  private final AiSummaryProperties properties;

  public AiSummaryWorker(AiSummaryWorkerService workerService, AiSummaryProperties properties) {
    this.workerService = workerService;
    this.properties = properties;
  }

  @Scheduled(fixedDelayString = "${app.ai-summary.poll-interval-ms:5000}")
  public void processPendingSummaries() {
    if (!properties.enabled() || !properties.workerEnabled()) {
      return;
    }

    try {
      int processed = workerService.processPendingBatch(5);
      if (processed > 0) {
        log.info("AI summary worker processed {} pending summaries", processed);
      }
    } catch (Exception ex) {
      log.warn("AI summary worker run failed: {}", ex.getMessage());
    }
  }
}
