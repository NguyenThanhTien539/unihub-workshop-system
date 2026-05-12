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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class ZaloPayPaymentProvider implements ZaloPayClient {
  private static final DateTimeFormatter APP_TRANS_DATE = DateTimeFormatter.ofPattern("yyMMdd");

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
    this.restClient = RestClient.builder().build();
  }

  @Override
  public PaymentIntent createOrder(PaymentIntent paymentIntent, RegistrationView registrationView, UUID userId) {
    PaymentProperties.ZaloPay props = paymentProperties.zalopay();
    if (props == null || !props.enabled()) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_PROVIDER_DISABLED, HttpStatus.CONFLICT);
    }

    String appTransId = paymentIntent.gatewayRef() == null || paymentIntent.gatewayRef().isBlank()
        ? generateAppTransId(paymentIntent.id())
        : paymentIntent.gatewayRef();
    long appTime = Instant.now(clock).toEpochMilli();

    Map<String, Object> embedData = new LinkedHashMap<>();
    embedData.put("paymentIntentId", paymentIntent.id());
    embedData.put("registrationId", registrationView.registrationId());
    embedData.put("redirecturl", props.frontendReturnUrl());

    String embedDataJson = writeJson(embedData);
    String itemsJson = "[]";
    long amount = paymentIntent.amount().longValue();
    String appId = props.appId();
    String dataToSign = String.join("|",
        appId,
        appTransId,
        userId.toString(),
        String.valueOf(amount),
        String.valueOf(appTime),
        embedDataJson,
        itemsJson);

    Map<String, String> orderParams = new LinkedHashMap<>();
    orderParams.put("app_id", appId);
    orderParams.put("app_trans_id", appTransId);
    orderParams.put("app_user", userId.toString());
    orderParams.put("app_time", String.valueOf(appTime));
    orderParams.put("amount", String.valueOf(amount));
    orderParams.put("item", itemsJson);
    orderParams.put("embed_data", embedDataJson);
    orderParams.put("description", "UniHub workshop registration " + registrationView.registrationId());
    orderParams.put("bank_code", "");
    orderParams.put("callback_url", props.callbackUrl());
    orderParams.put("mac", macSigner.sign(dataToSign, props.key1()));

    try {
      String responseBody = restClient.post()
          .uri(props.endpoint() + "?" + toQueryString(orderParams))
          .retrieve()
          .body(String.class);
      JsonNode root = objectMapper.readTree(responseBody == null ? "{}" : responseBody);
      if (root.path("return_code").asInt() != 1) {
        throw new PaymentException(PaymentErrorCode.PAYMENT_PROVIDER_ERROR, HttpStatus.BAD_GATEWAY,
            root.path("return_message").asText(PaymentErrorCode.PAYMENT_PROVIDER_ERROR.defaultMessage()));
      }
      return new PaymentIntent(
          paymentIntent.id(),
          paymentIntent.registrationId(),
          paymentIntent.idempotencyKey(),
          appTransId,
          PaymentStatus.PENDING_PAYMENT,
          paymentIntent.amount(),
          paymentIntent.currency(),
          root.path("order_url").asText(),
          paymentIntent.expiresAt(),
          paymentIntent.paidAt(),
          null,
          paymentIntent.createdAt(),
          LocalDateTime.now(clock));
    } catch (PaymentException ex) {
      throw ex;
    } catch (Exception ex) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_PROVIDER_ERROR, HttpStatus.BAD_GATEWAY);
    }
  }

  @Override
  public ZaloPayCallbackPayload verifyAndParseCallback(String data, String mac) {
    PaymentProperties.ZaloPay props = paymentProperties.zalopay();
    String expectedMac = macSigner.sign(data, props.key2());
    if (!expectedMac.equals(mac)) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_INVALID_SIGNATURE, HttpStatus.UNAUTHORIZED);
    }

    try {
      JsonNode root = objectMapper.readTree(data);
      String gatewayRef = root.path("app_trans_id").asText(null);
      JsonNode embedNode = parseEmbedData(root.path("embed_data"));
      UUID paymentIntentId = embedNode.hasNonNull("paymentIntentId")
          ? UUID.fromString(embedNode.path("paymentIntentId").asText())
          : null;
      BigDecimal amount = BigDecimal.valueOf(root.path("amount").asLong());
      String currency = root.path("currency").asText("VND");
      LocalDateTime paidAt = extractPaidAt(root);
      boolean success = isSuccess(root);
      String failureReason = root.path("return_message").asText(root.path("payment_status").asText("PAYMENT_FAILED"));
      return new ZaloPayCallbackPayload(gatewayRef, paymentIntentId, amount, currency, paidAt, success, failureReason);
    } catch (PaymentException ex) {
      throw ex;
    } catch (Exception ex) {
      throw new PaymentException(PaymentErrorCode.PAYMENT_PROVIDER_ERROR, HttpStatus.BAD_REQUEST);
    }
  }

  private JsonNode parseEmbedData(JsonNode embedDataNode) throws Exception {
    if (embedDataNode == null || embedDataNode.isMissingNode() || embedDataNode.isNull()) {
      return objectMapper.createObjectNode();
    }
    if (embedDataNode.isObject()) {
      return embedDataNode;
    }
    String raw = embedDataNode.asText("{}");
    return objectMapper.readTree(raw);
  }

  private boolean isSuccess(JsonNode root) {
    if (root.has("payment_status")) {
      String status = root.path("payment_status").asText("").trim().toUpperCase();
      return "SUCCESS".equals(status) || "SUCCEEDED".equals(status) || "1".equals(status);
    }
    if (root.has("status")) {
      JsonNode statusNode = root.path("status");
      if (statusNode.isInt() || statusNode.isLong()) {
        return statusNode.asInt() == 1;
      }
      String status = statusNode.asText("").trim().toUpperCase();
      return "SUCCESS".equals(status) || "SUCCEEDED".equals(status) || "1".equals(status);
    }
    if (root.has("return_code")) {
      return root.path("return_code").asInt() == 1;
    }
    return true;
  }

  private LocalDateTime extractPaidAt(JsonNode root) {
    if (root.hasNonNull("paid_at")) {
      long value = root.path("paid_at").asLong();
      return LocalDateTime.ofInstant(Instant.ofEpochMilli(value), ZoneOffset.UTC);
    }
    if (root.hasNonNull("server_time")) {
      long value = root.path("server_time").asLong();
      return LocalDateTime.ofInstant(Instant.ofEpochMilli(value), ZoneOffset.UTC);
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
