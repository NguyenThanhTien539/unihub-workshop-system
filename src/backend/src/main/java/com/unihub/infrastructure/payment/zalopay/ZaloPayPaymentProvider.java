package com.unihub.infrastructure.payment.zalopay;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unihub.application.payment.exception.PaymentException;
import com.unihub.domain.payment.PaymentErrorCode;
import com.unihub.domain.payment.PaymentIntent;
import com.unihub.domain.payment.PaymentStatus;
import com.unihub.domain.registration.RegistrationView;
import com.unihub.infrastructure.config.PaymentProperties;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class ZaloPayPaymentProvider implements ZaloPayClient {
  private static final DateTimeFormatter APP_TRANS_DATE = DateTimeFormatter.ofPattern("yyMMdd");
  private static final Logger logger = LoggerFactory.getLogger(ZaloPayPaymentProvider.class);

  private final PaymentProperties paymentProperties;
  private final ZaloPayMacSigner macSigner;
  private final ObjectMapper objectMapper;
  private final RestClient restClient;
  private final Clock clock;

  public ZaloPayPaymentProvider(
      PaymentProperties paymentProperties,
      ZaloPayMacSigner macSigner,
      ObjectMapper objectMapper,
      Clock clock) {
    this.paymentProperties = paymentProperties;
    this.macSigner = macSigner;
    this.objectMapper = objectMapper;
    this.clock = clock;

    PaymentProperties.ZaloPay props = paymentProperties.zalopay();
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(props == null ? 3000 : props.connectTimeoutMs());
    requestFactory.setReadTimeout(props == null ? 5000 : props.readTimeoutMs());
    this.restClient = RestClient.builder().requestFactory(requestFactory).build();
  }

  @Override
  public PaymentIntent createOrder(PaymentIntent paymentIntent, RegistrationView registrationView, UUID userId) {
    PaymentProperties.ZaloPay props = paymentProperties.zalopay();
    if (props == null || !props.enabled()) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_PROVIDER_DISABLED, HttpStatus.CONFLICT);
    }
    if (isBlank(props.appId()) || isBlank(props.key1()) || isBlank(props.callbackUrl())
        || isBlank(props.frontendReturnUrl())) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_PROVIDER_DISABLED, HttpStatus.CONFLICT);
    }

    String appTransId = paymentIntent.providerTransactionId() == null || paymentIntent.providerTransactionId().isBlank()
        ? generateAppTransId(paymentIntent.id())
        : paymentIntent.providerTransactionId();
    long appTime = Instant.now(clock).toEpochMilli();
    String redirectUrl = buildRedirectUrl(props.frontendReturnUrl(), paymentIntent.id());

    Map<String, Object> embedData = new LinkedHashMap<>();
    embedData.put("paymentIntentId", paymentIntent.id());
    embedData.put("registrationId", registrationView.registrationId());
    embedData.put("redirecturl", redirectUrl);

    String embedDataJson = writeJson(embedData);
    String itemsJson = writeJson(java.util.List.of(Map.of(
        "registrationId", registrationView.registrationId().toString(),
        "sessionId", registrationView.sessionId().toString(),
        "workshopTitle", registrationView.workshopTitle())));
    long amount = paymentIntent.amount().longValue();

    Map<String, String> orderParams = new LinkedHashMap<>();
    orderParams.put("app_id", props.appId());
    orderParams.put("app_trans_id", appTransId);
    orderParams.put("app_user", userId.toString());
    orderParams.put("app_time", String.valueOf(appTime));
    orderParams.put("item", itemsJson);
    orderParams.put("embed_data", embedDataJson);
    orderParams.put("amount", String.valueOf(amount));
    orderParams.put("description", "UniHub workshop registration " + registrationView.registrationId());
    orderParams.put("bank_code", "");
    orderParams.put("callback_url", props.callbackUrl());
    orderParams.put("mac", signCreateOrderRequest(props.appId(), appTransId, userId.toString(), amount, appTime,
        embedDataJson, itemsJson, props.key1()));

    MultiValueMap<String, String> formParams = new LinkedMultiValueMap<>();
    orderParams.forEach(formParams::add);

    try {
      String responseBody = restClient.post()
          .uri(props.endpoint())
          .contentType(MediaType.APPLICATION_FORM_URLENCODED)
          .body(formParams)
          .retrieve()
          .body(String.class);
      logger.info("ZaloPay create order response: {}", responseBody);
      ZaloPayCreateOrderResponse response = parseCreateOrderResponse(responseBody);
      logger.info(
          "ZaloPay create order parsed: returnCode={}, returnMessage={}, orderUrlPresent={}",
          response.returnCode(),
          response.returnMessage(),
          response.orderUrl() != null && !response.orderUrl().isBlank());
      if (response.returnCode() != 1 || response.orderUrl() == null || response.orderUrl().isBlank()) {
        throw new PaymentException(
            PaymentErrorCode.PAYMENT_PROVIDER_REJECTED,
            HttpStatus.BAD_GATEWAY,
            response.returnMessage());
      }

      return new PaymentIntent(
          paymentIntent.id(),
          paymentIntent.registrationId(),
          paymentIntent.provider(),
          paymentIntent.idempotencyKey(),
          appTransId,
          PaymentStatus.PENDING_PAYMENT,
          paymentIntent.amount(),
          paymentIntent.currency(),
          response.orderUrl(),
          paymentIntent.expiresAt(),
          paymentIntent.paidAt(),
          null,
          paymentIntent.createdAt(),
          LocalDateTime.now(clock));
    } catch (PaymentException ex) {
      throw ex;
    } catch (ResourceAccessException ex) {
      throw new PaymentException(
          PaymentErrorCode.PAYMENT_PROVIDER_UNAVAILABLE,
          HttpStatus.BAD_GATEWAY);
    } catch (RestClientResponseException ex) {
      logger.warn("ZaloPay create order HTTP error: {}", ex.getResponseBodyAsString());
      throw new PaymentException(
          PaymentErrorCode.PAYMENT_PROVIDER_REJECTED,
          HttpStatus.BAD_GATEWAY,
          ex.getResponseBodyAsString());
    } catch (Exception ex) {
      throw new PaymentException(
          PaymentErrorCode.PAYMENT_PROVIDER_ERROR,
          HttpStatus.BAD_GATEWAY);
    }
  }

  @Override
  public ZaloPayCallbackPayload verifyAndParseCallback(String data, String mac) {
    PaymentProperties.ZaloPay props = paymentProperties.zalopay();
    String expectedMac = macSigner.sign(data, props.key2());
    if (!expectedMac.equals(mac)) {
      throw new PaymentException(
          PaymentErrorCode.PAYMENT_CALLBACK_MAC_INVALID,
          HttpStatus.UNAUTHORIZED,
          "mac not equal");
    }

    try {
      JsonNode root = objectMapper.readTree(data);
      JsonNode embedNode = parseEmbedData(root.path("embed_data"));
      UUID paymentIntentId = embedNode.hasNonNull("paymentIntentId")
          ? UUID.fromString(embedNode.path("paymentIntentId").asText())
          : null;
      UUID registrationId = embedNode.hasNonNull("registrationId")
          ? UUID.fromString(embedNode.path("registrationId").asText())
          : null;
      BigDecimal amount = BigDecimal.valueOf(root.path("amount").asLong());
      String currency = root.path("currency").asText("VND");
      LocalDateTime paidAt = extractPaidAt(root);
      boolean success = isSuccess(root);
      String failureReason = root.path("return_message").asText(root.path("status").asText("payment failed"));
      return new ZaloPayCallbackPayload(
          root.path("app_trans_id").asText(null),
          paymentIntentId,
          registrationId,
          amount,
          currency,
          paidAt,
          success,
          failureReason);
    } catch (PaymentException ex) {
      throw ex;
    } catch (Exception ex) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_PROVIDER_ERROR, HttpStatus.BAD_REQUEST);
    }
  }

  String signCreateOrderRequest(
      String appId,
      String appTransId,
      String appUser,
      long amount,
      long appTime,
      String embedData,
      String item,
      String key1) {
    String dataToSign = String.join("|",
        appId,
        appTransId,
        appUser,
        String.valueOf(amount),
        String.valueOf(appTime),
        embedData,
        item);
    return macSigner.sign(dataToSign, key1);
  }

  private ZaloPayCreateOrderResponse parseCreateOrderResponse(String responseBody) throws Exception {
    JsonNode root = objectMapper.readTree(responseBody == null ? "{}" : responseBody);
    return new ZaloPayCreateOrderResponse(
        root.path("return_code").asInt(0),
        root.path("return_message").asText(PaymentErrorCode.PAYMENT_PROVIDER_REJECTED.defaultMessage()),
        root.path("order_url").asText(null));
  }

  private JsonNode parseEmbedData(JsonNode embedDataNode) throws Exception {
    if (embedDataNode == null || embedDataNode.isMissingNode() || embedDataNode.isNull()) {
      return objectMapper.createObjectNode();
    }
    if (embedDataNode.isObject()) {
      return embedDataNode;
    }
    return objectMapper.readTree(embedDataNode.asText("{}"));
  }

  private boolean isSuccess(JsonNode root) {
    if (root.has("status")) {
      JsonNode statusNode = root.path("status");
      if (statusNode.isIntegralNumber()) {
        return statusNode.asInt() == 1;
      }
      String status = statusNode.asText("").trim().toUpperCase();
      return "SUCCESS".equals(status) || "SUCCEEDED".equals(status) || "1".equals(status);
    }
    if (root.has("payment_status")) {
      String status = root.path("payment_status").asText("").trim().toUpperCase();
      return "SUCCESS".equals(status) || "SUCCEEDED".equals(status) || "1".equals(status);
    }
    if (root.has("return_code")) {
      return root.path("return_code").asInt() == 1;
    }
    return true;
  }

  private LocalDateTime extractPaidAt(JsonNode root) {
    if (root.hasNonNull("paid_at")) {
      return LocalDateTime.ofInstant(Instant.ofEpochMilli(root.path("paid_at").asLong()), ZoneOffset.UTC);
    }
    if (root.hasNonNull("server_time")) {
      return LocalDateTime.ofInstant(Instant.ofEpochMilli(root.path("server_time").asLong()), ZoneOffset.UTC);
    }
    return LocalDateTime.now(clock);
  }

  private String writeJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception ex) {
      throw new IllegalStateException("Unable to serialize ZaloPay payload", ex);
    }
  }

  private String generateAppTransId(UUID paymentIntentId) {
    String datePart = APP_TRANS_DATE.format(LocalDateTime.now(clock));
    String suffix = paymentIntentId.toString().replace("-", "").substring(0, 12);
    return datePart + "_" + suffix;
  }

  private String buildRedirectUrl(String baseUrl, UUID paymentIntentId) {
    if (baseUrl == null || baseUrl.isBlank()) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_PROVIDER_DISABLED, HttpStatus.CONFLICT);
    }
    String separator = baseUrl.contains("?") ? "&" : "?";
    return baseUrl + separator + "paymentIntentId=" + paymentIntentId;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private String toQueryString(Map<String, String> params) {
    StringBuilder builder = new StringBuilder();
    for (Map.Entry<String, String> entry : params.entrySet()) {
      if (builder.length() > 0) {
        builder.append('&');
      }
      builder.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8));
      builder.append('=');
      builder.append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
    }
    return builder.toString();
  }
}
