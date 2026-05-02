package com.unihub.domain.student;

import java.util.Optional;
import java.util.UUID;

public interface StudentRepository {
  Optional<Student> findByUserId(UUID userId);
}

