package com.unihub.application.workshop;

import java.util.UUID;

public record UpdateWorkshopCommand(
    UUID workshopId,
    String title,
    String speaker,
    String description) {
}
