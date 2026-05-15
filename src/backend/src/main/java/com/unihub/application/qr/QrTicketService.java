package com.unihub.application.qr;

import com.unihub.domain.qr.QrTicket;
import com.unihub.domain.qr.QrTicketRepository;
import com.unihub.domain.qr.QrTicketStatus;
import com.unihub.domain.registration.Registration;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.infrastructure.config.QrProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class QrTicketService {
  private final QrTicketRepository qrTicketRepository;
  private final QrTokenCodec qrTokenCodec;
  private final QrCodeGenerator qrCodeGenerator;
  private final QrProperties qrProperties;
  private final Clock clock;

  public QrTicketService(
      QrTicketRepository qrTicketRepository,
      QrTokenCodec qrTokenCodec,
      QrCodeGenerator qrCodeGenerator,
      QrProperties qrProperties,
      Clock clock) {
    this.qrTicketRepository = qrTicketRepository;
    this.qrTokenCodec = qrTokenCodec;
    this.qrCodeGenerator = qrCodeGenerator;
    this.qrProperties = qrProperties;
    this.clock = clock;
  }

  public QrTicket ensureQrTicketRecord(Registration registration) {
    validateConfirmed(registration);
    return qrTicketRepository.findByRegistrationId(registration.id())
        .orElseGet(() -> createTicket(registration));
  }

  public QrTicketData getQrTicketData(Registration registration) {
    QrTicket qrTicket = ensureQrTicketRecord(registration);
    return toData(qrTicket);
  }

  public QrTicketData getQrTicketData(UUID registrationId) {
    QrTicket qrTicket = qrTicketRepository.findByRegistrationId(registrationId)
        .orElseThrow(() -> new IllegalStateException("QR ticket not found"));
    return toData(qrTicket);
  }

  public VerifiedQrTicket verifyQrToken(String qrToken) {
    QrTokenClaims claims = qrTokenCodec.verifyPayload(qrToken);
    QrTicket qrTicket = qrTicketRepository.findByTokenHash(sha256(qrToken))
        .orElseThrow(() -> new IllegalStateException("QR ticket not found"));
    if (!qrTicket.id().equals(claims.ticketId()) || !qrTicket.registrationId().equals(claims.registrationId())) {
      throw new QrTokenVerificationException("QR payload does not match stored ticket");
    }
    return new VerifiedQrTicket(qrTicket, claims);
  }

  private void validateConfirmed(Registration registration) {
    if (registration.status() != RegistrationStatus.CONFIRMED) {
      throw new IllegalStateException("QR ticket can only be generated for confirmed registrations");
    }
  }

  private QrTicket createTicket(Registration registration) {
    LocalDateTime issuedAt = registration.confirmedAt() == null ? LocalDateTime.now(clock) : registration.confirmedAt();
    LocalDateTime expiresAt = issuedAt.plusMinutes(qrProperties.ttlMinutes());
    QrTicket draft = new QrTicket(
        UUID.randomUUID(),
        registration.id(),
        null,
        QrTicketStatus.ACTIVE,
        issuedAt,
        expiresAt,
        null,
        issuedAt);
    String payload = qrTokenCodec.createPayload(draft);
    QrTicket persisted = new QrTicket(
        draft.id(),
        draft.registrationId(),
        sha256(payload),
        draft.status(),
        draft.issuedAt(),
        draft.expiresAt(),
        draft.revokedAt(),
        draft.createdAt());
    return qrTicketRepository.save(persisted);
  }

  private QrTicketData toData(QrTicket qrTicket) {
    String payload = qrTokenCodec.createPayload(qrTicket);
    String dataUrl = "data:image/png;base64," + Base64.getEncoder().encodeToString(
        qrCodeGenerator.generatePng(payload, qrProperties.imageSize()));
    return new QrTicketData(qrTicket.id(), payload, dataUrl, qrTicket.expiresAt(), qrTicket.status().name());
  }

  private String sha256(String value) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 algorithm unavailable", ex);
    }
  }
}
