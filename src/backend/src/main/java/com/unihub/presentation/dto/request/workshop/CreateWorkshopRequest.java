package com.unihub.presentation.dto.request.workshop;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateWorkshopRequest(
    @NotBlank String title,
    @NotBlank String speaker,
    @NotBlank String description,
    @Valid List<CreateWorkshopSessionRequest> sessions) {
}
