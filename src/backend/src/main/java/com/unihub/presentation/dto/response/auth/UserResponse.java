package com.unihub.presentation.dto.response.auth;

import java.util.List;
import java.util.UUID;

public record UserResponse(
    UUID id,
    String email,
    String fullName,
    List<String> roles,
    StudentProfileResponse studentProfile
) {
}

