package com.nexus.projects;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateProjectRequest(
        @NotBlank(message = "Project name is required")
        @Size(max = 120, message = "Project name must be 120 characters or fewer")
        String name,

        @Size(max = 2000, message = "Description must be 2000 characters or fewer")
        String description) {
}
