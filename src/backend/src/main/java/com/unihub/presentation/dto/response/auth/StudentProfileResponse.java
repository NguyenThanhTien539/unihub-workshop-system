package com.unihub.presentation.dto.response.auth;

import java.util.UUID;

public record StudentProfileResponse(
    UUID studentId,
    String studentCode,
    String status
) {
}

