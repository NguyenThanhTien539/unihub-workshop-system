package com.unihub.presentation.dto.response.auth;

import java.util.List;
import java.util.UUID;

public record MeResponse(
    UUID id,
    String email,
    String fullName,
    String accountStatus,
    List<String> roles,
    StudentProfileResponse studentProfile
) {
}

