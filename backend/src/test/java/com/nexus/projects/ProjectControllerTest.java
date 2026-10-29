package com.nexus.projects;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProjectController.class)
@Import(ProjectExceptionHandler.class)
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @Test
    void listsProjects() throws Exception {
        ProjectResponse project = new ProjectResponse(
                UUID.randomUUID(), "Demo", "Sample project",
                OffsetDateTime.parse("2026-01-01T10:00:00Z"),
                OffsetDateTime.parse("2026-01-01T10:00:00Z"));
        when(jdbcTemplate.query(anyString(), any(RowMapper.class))).thenReturn(List.of(project));

        mockMvc.perform(get("/api/v1/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Demo"));
    }

    @Test
    void createsProjectAndReturnsCreatedStatus() throws Exception {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), any(UUID.class)))
                .thenAnswer(invocation -> {
                    UUID id = invocation.getArgument(2);
                    return List.of(new ProjectResponse(
                            id, "New Project", "Description",
                            OffsetDateTime.parse("2026-01-01T10:00:00Z"),
                            OffsetDateTime.parse("2026-01-01T10:00:00Z")));
                });

        mockMvc.perform(post("/api/v1/projects")
                        .contentType("application/json")
                        .content("""
                                {"name":" New Project ","description":" Description "}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("New Project"))
                .andExpect(jsonPath("$.description").value("Description"));
    }

    @Test
    void rejectsBlankProjectName() throws Exception {
        mockMvc.perform(post("/api/v1/projects")
                        .contentType("application/json")
                        .content("""
                                {"name":"   "}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_error"));
    }

    @Test
    void returnsNotFoundForUnknownProject() throws Exception {
        UUID id = UUID.randomUUID();
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(id))).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/projects/" + id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("not_found"));
    }
}
