package com.unihub.infrastructure.storage;

import com.unihub.application.aisummary.ObjectStorageException;
import com.unihub.application.aisummary.ObjectStorageService;
import com.unihub.infrastructure.config.AiSummaryProperties;
import java.net.URI;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AnonymousCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
@ConditionalOnProperty(prefix = "app.ai-summary.storage", name = "type", havingValue = "minio", matchIfMissing = true)
public class MinioObjectStorageService implements ObjectStorageService {
  private static final Logger log = LoggerFactory.getLogger(MinioObjectStorageService.class);

  private final S3Client s3Client;
  private final String bucket;
  private final String endpoint;
  private final AtomicBoolean bucketReady = new AtomicBoolean(false);

  @Autowired
  public MinioObjectStorageService(AiSummaryProperties properties) {
    this(properties, createClient(properties));
  }

  MinioObjectStorageService(AiSummaryProperties properties, S3Client s3Client) {
    AiSummaryProperties.Storage storage = properties.effectiveStorage();
    this.s3Client = s3Client;
    this.bucket = storage.effectiveBucket();
    this.endpoint = storage.effectiveEndpoint();
  }

  @Override
  public String putObject(String objectKey, String contentType, byte[] bytes) {
    try {
      ensureBucketExists();
      s3Client.putObject(
          PutObjectRequest.builder()
              .bucket(bucket)
              .key(objectKey)
              .contentType(contentType)
              .contentLength((long) bytes.length)
              .build(),
          RequestBody.fromBytes(bytes));
      return objectKey;
    } catch (RuntimeException ex) {
      throw storageFailure("store", objectKey, ex);
    }
  }

  @Override
  public byte[] getObject(String objectKey) {
    try {
      ensureBucketExists();
      ResponseBytes<GetObjectResponse> response = s3Client.getObjectAsBytes(
          GetObjectRequest.builder()
              .bucket(bucket)
              .key(objectKey)
              .build());
      return response.asByteArray();
    } catch (RuntimeException ex) {
      throw storageFailure("read", objectKey, ex);
    }
  }

  private void ensureBucketExists() {
    if (bucketReady.get()) {
      return;
    }
    synchronized (bucketReady) {
      if (bucketReady.get()) {
        return;
      }
      try {
        s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
      } catch (NoSuchBucketException ex) {
        createBucket();
      } catch (S3Exception ex) {
        if (ex.statusCode() == 404) {
          createBucket();
        } else {
          throw ex;
        }
      }
      bucketReady.set(true);
    }
  }

  private void createBucket() {
    s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
    log.info("Created AI summary object storage bucket '{}' at {}", bucket, endpoint);
  }

  private ObjectStorageException storageFailure(String operation, String objectKey, RuntimeException ex) {
    log.warn("Unable to {} AI summary object '{}' in bucket '{}' at {}: {}",
        operation, objectKey, bucket, endpoint, ex.getMessage());
    return new ObjectStorageException("Object storage is unavailable", ex, isRetryable(ex));
  }

  private boolean isRetryable(RuntimeException ex) {
    if (ex instanceof SdkClientException) {
      return true;
    }
    if (ex instanceof S3Exception s3Exception) {
      int statusCode = s3Exception.statusCode();
      return statusCode == 404
          || statusCode == 408
          || statusCode == 429
          || statusCode == 500
          || statusCode == 502
          || statusCode == 503
          || statusCode == 504;
    }
    return true;
  }

  private static S3Client createClient(AiSummaryProperties properties) {
    AiSummaryProperties.Storage storage = properties.effectiveStorage();
    AwsCredentialsProvider credentialsProvider =
        storage.effectiveAccessKey().isBlank() || storage.effectiveSecretKey().isBlank()
            ? AnonymousCredentialsProvider.create()
            : StaticCredentialsProvider.create(
                AwsBasicCredentials.create(storage.effectiveAccessKey(), storage.effectiveSecretKey()));
    return S3Client.builder()
        .endpointOverride(URI.create(storage.effectiveEndpoint()))
        .region(Region.of(storage.effectiveRegion()))
        .credentialsProvider(credentialsProvider)
        .serviceConfiguration(S3Configuration.builder()
            .pathStyleAccessEnabled(true)
            .build())
        .build();
  }
}
