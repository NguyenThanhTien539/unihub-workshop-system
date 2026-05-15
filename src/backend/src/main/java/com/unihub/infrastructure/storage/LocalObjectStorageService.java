package com.unihub.infrastructure.storage;

import com.unihub.application.aisummary.ObjectStorageException;
import com.unihub.application.aisummary.ObjectStorageService;
import com.unihub.infrastructure.config.AiSummaryProperties;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.stereotype.Service;

@Service
public class LocalObjectStorageService implements ObjectStorageService {
  private final Path baseDirectory;

  public LocalObjectStorageService(AiSummaryProperties properties) {
    this.baseDirectory = Path.of(properties.effectiveStorage().effectiveLocalDirectory())
        .toAbsolutePath()
        .normalize();
  }

  @Override
  public String putObject(String objectKey, String contentType, byte[] bytes) {
    try {
      Path target = resolveSafePath(objectKey);
      Files.createDirectories(target.getParent());
      Files.write(target, bytes);
      return objectKey;
    } catch (IOException ex) {
      throw new ObjectStorageException("Unable to store object", ex);
    }
  }

  @Override
  public byte[] getObject(String objectKey) {
    try {
      return Files.readAllBytes(resolveSafePath(objectKey));
    } catch (IOException ex) {
      throw new ObjectStorageException("Unable to read object", ex);
    }
  }

  private Path resolveSafePath(String objectKey) {
    Path resolved = baseDirectory.resolve(objectKey).normalize();
    if (!resolved.startsWith(baseDirectory)) {
      throw new ObjectStorageException("Invalid object key", null);
    }
    return resolved;
  }
}
