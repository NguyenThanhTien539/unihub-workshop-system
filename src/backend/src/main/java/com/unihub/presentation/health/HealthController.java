package com.unihub.presentation.health;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class HealthController {
  private final JdbcTemplate jdbcTemplate;

  public HealthController(JdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok");
  }

  @GetMapping("/health/db")
  public Map<String, String> healthDb() {
    Integer ping = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
    return Map.of(
        "status", "ok",
        "db", ping != null && ping == 1 ? "up" : "down"
    );
  }
}

