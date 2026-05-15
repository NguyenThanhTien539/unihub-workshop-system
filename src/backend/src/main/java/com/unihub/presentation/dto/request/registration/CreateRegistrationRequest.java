package com.unihub.presentation.dto.request.registration;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateRegistrationRequest(
    @NotNull UUID sessionId
) {
}
