package com.unihub.domain.role;

import java.util.List;
import java.util.UUID;

public interface RoleRepository {
  List<String> findRoleNamesByUserId(UUID userId);
}

