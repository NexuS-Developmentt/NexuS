package com.nexus.projects;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ProjectResponse(
        UUID id,
        String name,
        String description,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
