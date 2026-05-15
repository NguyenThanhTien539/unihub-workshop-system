package com.unihub.infrastructure.ai.gemini;

import com.unihub.application.aisummary.AiSummaryProvider;
import com.unihub.application.aisummary.AiSummaryProviderException;
import com.unihub.domain.aisummary.AiSummaryErrorCode;
import com.unihub.infrastructure.config.AiSummaryProperties;
import java.time.Duration;
import java.util.List;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class GeminiAiSummaryProvider implements AiSummaryProvider {
  private final AiSummaryProperties properties;
  private final RestClient restClient;

  public GeminiAiSummaryProvider(AiSummaryProperties properties) {
    this.properties = properties;
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    int timeoutMs = (int) Duration.ofSeconds(properties.effectiveTimeoutSeconds()).toMillis();
    requestFactory.setConnectTimeout(timeoutMs);
    requestFactory.setReadTimeout(timeoutMs);
    this.restClient = RestClient.builder()
        .requestFactory(requestFactory)
        .baseUrl(properties.effectiveGemini().effectiveBaseUrl())
        .build();
  }

  @Override
  public String summarize(String cleanedText) {
    String apiKey = properties.effectiveGemini().apiKey();
    if (apiKey == null || apiKey.isBlank()) {
      throw new AiSummaryProviderException(AiSummaryErrorCode.AI_API_KEY_MISSING);
    }

    GeminiRequest request = new GeminiRequest(List.of(
        new Content("user", List.of(new Part(buildPrompt(cleanedText))))),
        new GenerationConfig(0.2));

    try {
      GeminiResponse response = restClient.post()
          .uri(uriBuilder -> uriBuilder
              .path("/v1beta/models/{model}:generateContent")
              .queryParam("key", apiKey)
              .build(properties.effectiveGemini().effectiveModel()))
          .body(request)
          .retrieve()
          .body(GeminiResponse.class);
      String text = extractText(response);
      if (text == null || text.isBlank()) {
        throw new AiSummaryProviderException(AiSummaryErrorCode.AI_OUTPUT_INVALID);
      }
      return text.trim();
    } catch (AiSummaryProviderException ex) {
      throw ex;
    } catch (ResourceAccessException ex) {
      throw new AiSummaryProviderException(AiSummaryErrorCode.AI_PROVIDER_TIMEOUT);
    } catch (RestClientResponseException ex) {
      throw new AiSummaryProviderException(AiSummaryErrorCode.AI_PROVIDER_UNAVAILABLE);
    } catch (Exception ex) {
      throw new AiSummaryProviderException(AiSummaryErrorCode.AI_PROVIDER_UNAVAILABLE);
    }
  }

  @Override
  public String modelName() {
    return properties.effectiveGemini().effectiveModel();
  }

  private String buildPrompt(String cleanedText) {
    return """
        Hay tom tat noi dung PDF workshop bang tieng Viet.
        Yeu cau:
        - ngan gon
        - dung 5-7 gach dau dong
        - tap trung vao muc dich workshop, chu de, doi tuong phu hop va ket qua mong doi
        - khong tu bia dat thong tin khong co trong PDF

        Noi dung PDF:
        %s
        """.formatted(cleanedText);
  }

  private String extractText(GeminiResponse response) {
    if (response == null || response.candidates() == null || response.candidates().isEmpty()) {
      return null;
    }
    Candidate candidate = response.candidates().getFirst();
    if (candidate.content() == null || candidate.content().parts() == null) {
      return null;
    }
    return candidate.content().parts().stream()
        .map(Part::text)
        .filter(text -> text != null && !text.isBlank())
        .reduce("", (left, right) -> left + right);
  }

  private record GeminiRequest(List<Content> contents, GenerationConfig generationConfig) {
  }

  private record Content(String role, List<Part> parts) {
  }

  private record Part(String text) {
  }

  private record GenerationConfig(double temperature) {
  }

  private record GeminiResponse(List<Candidate> candidates) {
  }

  private record Candidate(Content content) {
  }
}
