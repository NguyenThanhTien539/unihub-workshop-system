package com.unihub.presentation.dto.request.workshop;

public record UpdateWorkshopRequest(
    String title,
    String speaker,
    String description) {
}
