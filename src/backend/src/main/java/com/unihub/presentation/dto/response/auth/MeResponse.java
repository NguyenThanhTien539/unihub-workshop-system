package com.unihub.presentation.dto.response.auth;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

public record MeResponse(
    @JsonUnwrapped
    UserResponse user
) {
}

