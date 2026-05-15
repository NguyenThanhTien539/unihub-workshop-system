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
    return storage == null ? new Storage("local", "./data/object-storage/workshop-documents") : storage;
  }

  public Gemini effectiveGemini() {
    return gemini == null
        ? new Gemini("", "https://generativelanguage.googleapis.com", "gemini-2.5-flash-lite")
        : gemini;
  }

  public record Storage(String type, String localDirectory) {
    public String effectiveLocalDirectory() {
      return localDirectory == null || localDirectory.isBlank()
          ? "./data/object-storage/workshop-documents"
          : localDirectory.trim();
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
