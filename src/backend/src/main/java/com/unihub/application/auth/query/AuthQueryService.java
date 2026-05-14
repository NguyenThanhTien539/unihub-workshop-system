package com.unihub.application.auth.query;

import com.unihub.application.auth.exception.AuthException;
import com.unihub.application.auth.model.CurrentUser;
import com.unihub.domain.role.RoleRepository;
import com.unihub.domain.student.Student;
import com.unihub.domain.student.StudentRepository;
import com.unihub.domain.user.User;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.domain.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthQueryService {
  private final UserRepository userRepository;
  private final RoleRepository roleRepository;
  private final StudentRepository studentRepository;

  public AuthQueryService(
      UserRepository userRepository,
      RoleRepository roleRepository,
      StudentRepository studentRepository
  ) {
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.studentRepository = studentRepository;
  }

  @Transactional(readOnly = true)
  public CurrentUser getCurrentUser(UUID userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new AuthException(UserErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED));

    return buildCurrentUser(user);
  }

  @Transactional(readOnly = true)
  public CurrentUser buildCurrentUser(User user) {
    List<String> roles = roleRepository.findRoleNamesByUserId(user.id());
    Student student = roles.contains("student")
        ? studentRepository.findByUserId(user.id()).orElse(null)
        : null;
    CurrentUser.StudentProfile profile = student == null
        ? null
        : new CurrentUser.StudentProfile(
            student.id(),
            student.studentCode(),
            student.faculty(),
            student.major(),
            student.className(),
            student.status().name());

    return new CurrentUser(user.id(), user.email(), user.fullName(), user.accountStatus().name(), roles, profile);
  }
}

