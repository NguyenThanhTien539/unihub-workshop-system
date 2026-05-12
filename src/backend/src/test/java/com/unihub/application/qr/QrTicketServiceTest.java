package com.unihub.application.qr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.unihub.domain.qr.QrTicket;
import com.unihub.domain.qr.QrTicketRepository;
import com.unihub.domain.qr.QrTicketStatus;
import com.unihub.domain.registration.Registration;
import com.unihub.domain.registration.RegistrationStatus;
import com.unihub.domain.registration.RegistrationType;
import com.unihub.infrastructure.config.QrProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class QrTicketServiceTest {
  @Mock private QrTicketRepository qrTicketRepository;
  @Mock private QrTokenCodec qrTokenCodec;
  @Mock private QrCodeGenerator qrCodeGenerator;

  private QrTicketService service;

  @BeforeEach
  void setUp() {
    service = new QrTicketService(
        qrTicketRepository,
        qrTokenCodec,
        qrCodeGenerator,
        new QrProperties("unihub", 60, 256),
        Clock.fixed(Instant.parse("2026-05-08T10:00:00Z"), ZoneOffset.UTC));
  }

  @Test
  void ensureQrTicketCreatesExactlyOneTicketAndReturnsDataUrl() {
    UUID registrationId = UUID.randomUUID();
    Registration registration = new Registration(registrationId, UUID.randomUUID(), UUID.randomUUID(),
        RegistrationStatus.CONFIRMED, RegistrationType.FREE, null,
        LocalDateTime.of(2026, 5, 8, 10, 0), null, null,
        LocalDateTime.of(2026, 5, 8, 10, 0), LocalDateTime.of(2026, 5, 8, 10, 0));
    when(qrTicketRepository.findByRegistrationId(registrationId)).thenReturn(Optional.empty());
    when(qrTokenCodec.createPayload(org.mockito.ArgumentMatchers.any(QrTicket.class))).thenReturn("payload");
    when(qrTicketRepository.save(org.mockito.ArgumentMatchers.any(QrTicket.class))).thenAnswer(invocation -> invocation.getArgument(0));
    when(qrCodeGenerator.generatePng("payload", 256)).thenReturn(new byte[] {1, 2, 3});

    QrTicketData data = service.ensureQrTicket(registration);

    assertNotNull(data.qrTicketId());
    assertEquals("payload", data.payload());
    verify(qrTicketRepository).save(org.mockito.ArgumentMatchers.any(QrTicket.class));
  }
}
