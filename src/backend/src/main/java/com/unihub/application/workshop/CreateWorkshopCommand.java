package com.unihub.application.workshop;

import java.util.List;
import java.util.UUID;

public record CreateWorkshopCommand(
    String title,
    String speaker,
    String description,
    UUID createdByUserId,
    List<CreateSessionCommand> sessions) {
}
