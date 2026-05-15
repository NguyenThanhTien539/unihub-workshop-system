package com.unihub.application.registration;

import java.util.UUID;

public record CreatePaidRegistrationCommand(UUID userId, UUID sessionId, String idempotencyKey) {
}
