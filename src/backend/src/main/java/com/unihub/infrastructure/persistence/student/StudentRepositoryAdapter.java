package com.unihub.infrastructure.persistence.student;

import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import com.unihub.domain.student.StudentStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class StudentRepositoryAdapter implements StudentRepository {
  private static final String SQL_FIND_BY_USER_ID = """
      SELECT id, user_id, student_code, status
      FROM students
      WHERE user_id = :userId
      LIMIT 1
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public StudentRepositoryAdapter(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  @Override
  public Optional<Student> findByUserId(UUID userId) {
    MapSqlParameterSource params = new MapSqlParameterSource("userId", userId);
    List<Student> rows = jdbcTemplate.query(SQL_FIND_BY_USER_ID, params, studentRowMapper());
    return rows.stream().findFirst();
  }

  private RowMapper<Student> studentRowMapper() {
    return (rs, rowNum) -> new Student(
        rs.getObject("id", UUID.class),
        rs.getObject("user_id", UUID.class),
        rs.getString("student_code"),
        StudentStatus.valueOf(rs.getString("status"))
    );
  }
}
