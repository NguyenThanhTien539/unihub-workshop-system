package com.unihub.application.payment;

import java.util.UUID;

public record CreatePaymentUrlCommand(UUID userId, UUID paymentIntentId) {
}
