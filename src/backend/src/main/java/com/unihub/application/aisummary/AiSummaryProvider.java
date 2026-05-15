package com.unihub.application.aisummary;

public interface AiSummaryProvider {
  String summarize(String cleanedText);

  String modelName();
}
