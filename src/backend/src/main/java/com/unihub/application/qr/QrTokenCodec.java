package com.unihub.application.qr;

import com.unihub.domain.qr.QrTicket;

public interface QrTokenCodec {
  String createPayload(QrTicket qrTicket);
}
