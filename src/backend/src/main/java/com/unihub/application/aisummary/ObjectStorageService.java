package com.unihub.application.aisummary;

public interface ObjectStorageService {
  String putObject(String objectKey, String contentType, byte[] bytes);

  byte[] getObject(String objectKey);
}
