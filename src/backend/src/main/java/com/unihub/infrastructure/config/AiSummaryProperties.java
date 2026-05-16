package com.unihub.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai-summary")
public record AiSummaryProperties(
    boolean enabled,
    String provider,
    boolean workerEnabled,
    long pollIntervalMs,
    long maxFileSizeMb,
    int maxInputChars,
    int timeoutSeconds,
    Storage storage,
    Worker worker,
    Gemini gemini) {
  public long maxFileSizeBytes() {
    long effectiveMb = maxFileSizeMb <= 0 ? 10 : maxFileSizeMb;
    return effectiveMb * 1024L * 1024L;
  }

  public int effectiveMaxInputChars() {
    return maxInputChars <= 0 ? 20_000 : maxInputChars;
  }

  public int effectiveTimeoutSeconds() {
    return timeoutSeconds <= 0 ? 30 : timeoutSeconds;
  }

  public Storage effectiveStorage() {
    return storage == null
        ? new Storage(
            "minio",
            "./data/object-storage/workshop-documents",
            "unihub-documents",
            "http://minio:9000",
            "ap-southeast-1",
            "",
            "")
        : storage;
  }

  public Worker effectiveWorker() {
    return worker == null ? new Worker(3, 5000, 3.0, 120_000) : worker;
  }

  public Gemini effectiveGemini() {
    return gemini == null
        ? new Gemini("", "https://generativelanguage.googleapis.com", "gemini-2.5-flash-lite")
        : gemini;
  }

  public record Storage(
      String type,
      String localDirectory,
      String bucket,
      String endpoint,
      String region,
      String accessKey,
      String secretKey) {
    public String effectiveType() {
      return type == null || type.isBlank() ? "minio" : type.trim().toLowerCase();
    }

    public String effectiveLocalDirectory() {
      return localDirectory == null || localDirectory.isBlank()
          ? "./data/object-storage/workshop-documents"
          : localDirectory.trim();
    }

    public String effectiveBucket() {
      return bucket == null || bucket.isBlank() ? "unihub-documents" : bucket.trim();
    }

    public String effectiveEndpoint() {
      return endpoint == null || endpoint.isBlank() ? "http://minio:9000" : endpoint.trim();
    }

    public String effectiveRegion() {
      return region == null || region.isBlank() ? "ap-southeast-1" : region.trim();
    }

    public String effectiveAccessKey() {
      return accessKey == null ? "" : accessKey.trim();
    }

    public String effectiveSecretKey() {
      return secretKey == null ? "" : secretKey.trim();
    }
  }

  public record Worker(
      int maxRetries,
      long retryInitialDelayMs,
      double retryMultiplier,
      long processingTimeoutMs) {
    public int effectiveMaxRetries() {
      return Math.max(0, maxRetries);
    }

    public long effectiveRetryInitialDelayMs() {
      return retryInitialDelayMs <= 0 ? 5000 : retryInitialDelayMs;
    }

    public double effectiveRetryMultiplier() {
      return retryMultiplier < 1 ? 3.0 : retryMultiplier;
    }

    public long effectiveProcessingTimeoutMs() {
      return processingTimeoutMs <= 0 ? 120_000 : processingTimeoutMs;
    }
  }

  public record Gemini(String apiKey, String baseUrl, String model) {
    public String effectiveBaseUrl() {
      return baseUrl == null || baseUrl.isBlank()
          ? "https://generativelanguage.googleapis.com"
          : baseUrl.trim();
    }

    public String effectiveModel() {
      return model == null || model.isBlank() ? "gemini-2.5-flash-lite" : model.trim();
    }
  }
}
