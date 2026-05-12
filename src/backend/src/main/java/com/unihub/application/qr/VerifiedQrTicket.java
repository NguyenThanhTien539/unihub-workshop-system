package com.unihub.application.qr;

import com.unihub.domain.qr.QrTicket;

public record VerifiedQrTicket(
    QrTicket qrTicket,
    QrTokenClaims claims) {
}
