package com.unihub.infrastructure.storage;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.unihub.application.aisummary.ObjectStorageException;
import com.unihub.infrastructure.config.AiSummaryProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

class MinioObjectStorageServiceTest {
  private S3Client s3Client;
  private MinioObjectStorageService service;

  @BeforeEach
  void setUp() {
    s3Client = org.mockito.Mockito.mock(S3Client.class);
    when(s3Client.headBucket(any(HeadBucketRequest.class)))
        .thenReturn(HeadBucketResponse.builder().build());
    service = new MinioObjectStorageService(properties(), s3Client);
  }

  @Test
  void minioStorageIsSelectedByMinioStorageType() {
    ConditionalOnProperty conditional = MinioObjectStorageService.class
        .getAnnotation(ConditionalOnProperty.class);

    assertEquals("app.ai-summary.storage", conditional.prefix());
    assertEquals("type", conditional.name()[0]);
    assertEquals("minio", conditional.havingValue());
  }

  @Test
  void putObjectStoresBytesWithS3Client() {
    when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
        .thenReturn(PutObjectResponse.builder().build());

    service.putObject("workshop-documents/w1/d1.pdf", "application/pdf", "%PDF".getBytes());

    ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
    verify(s3Client).putObject(requestCaptor.capture(), any(RequestBody.class));
    assertEquals("unihub-documents", requestCaptor.getValue().bucket());
    assertEquals("workshop-documents/w1/d1.pdf", requestCaptor.getValue().key());
    assertEquals("application/pdf", requestCaptor.getValue().contentType());
  }

  @Test
  void getObjectReadsBytesWithS3Client() {
    when(s3Client.getObjectAsBytes(any(GetObjectRequest.class))).thenReturn(
        ResponseBytes.fromByteArray(GetObjectResponse.builder().build(), "%PDF".getBytes()));

    byte[] bytes = service.getObject("workshop-documents/w1/d1.pdf");

    assertArrayEquals("%PDF".getBytes(), bytes);
  }

  @Test
  void s3ExceptionMapsToStorageUnavailable() {
    when(s3Client.getObjectAsBytes(any(GetObjectRequest.class)))
        .thenThrow(SdkClientException.builder().message("connection refused").build());

    ObjectStorageException ex = assertThrows(
        ObjectStorageException.class,
        () -> service.getObject("workshop-documents/w1/d1.pdf"));

    assertEquals("Object storage is unavailable", ex.getMessage());
    assertTrue(ex.isRetryable());
  }

  private static AiSummaryProperties properties() {
    return new AiSummaryProperties(
        true,
        "gemini",
        true,
        5000,
        10,
        20_000,
        30,
        new AiSummaryProperties.Storage(
            "minio",
            "./data/object-storage/workshop-documents",
            "unihub-documents",
            "http://minio:9000",
            "ap-southeast-1",
            "minioadmin",
            "minioadmin123"),
        new AiSummaryProperties.Worker(3, 5000, 3.0, 120_000),
        new AiSummaryProperties.Gemini("", "https://generativelanguage.googleapis.com", "gemini-2.5-flash-lite"));
  }
}
