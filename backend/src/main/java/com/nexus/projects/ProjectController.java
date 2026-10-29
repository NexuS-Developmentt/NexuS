package com.nexus.projects;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private static final RowMapper<ProjectResponse> PROJECT_ROW_MAPPER = ProjectController::mapProject;

    private final JdbcTemplate jdbcTemplate;

    public ProjectController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public List<ProjectResponse> listProjects() {
        return jdbcTemplate.query("""
                SELECT id, name, description, created_at, updated_at
                FROM projects
                ORDER BY created_at DESC, id
                """, PROJECT_ROW_MAPPER);
    }

    @GetMapping("/{id}")
    public ProjectResponse getProject(@PathVariable UUID id) {
        return jdbcTemplate.query("""
                SELECT id, name, description, created_at, updated_at
                FROM projects
                WHERE id = ?
                """, PROJECT_ROW_MAPPER, id)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ProjectNotFoundException(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse createProject(@Valid @RequestBody CreateProjectRequest request) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO projects (id, name, description)
                VALUES (?, ?, ?)
                """, id, request.name().trim(), normalizeDescription(request.description()));
        return getProject(id);
    }

    private static String normalizeDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.trim();
    }

    private static ProjectResponse mapProject(ResultSet resultSet, int rowNumber) throws SQLException {
        return new ProjectResponse(
                resultSet.getObject("id", UUID.class),
                resultSet.getString("name"),
                resultSet.getString("description"),
                resultSet.getObject("created_at", OffsetDateTime.class),
                resultSet.getObject("updated_at", OffsetDateTime.class));
    }
}
