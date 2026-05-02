package com.unihub.domain.user;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository {
  Optional<User> findByEmail(String email);

  Optional<User> findById(UUID id);
}

