package com.unihub.application.registration;

import java.util.UUID;

public record CreateFreeRegistrationCommand(UUID userId, UUID sessionId) {
}
