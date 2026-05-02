package com.unihub.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.presentation.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

@Component
public class JsonAccessDeniedHandler implements AccessDeniedHandler {
  private final ObjectMapper objectMapper;

  public JsonAccessDeniedHandler(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
      throws IOException {
    response.setStatus(HttpStatus.FORBIDDEN.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");

    ApiResponse<?> payload = ApiResponse.error(
        UserErrorCode.AUTH_FORBIDDEN.code(),
        UserErrorCode.AUTH_FORBIDDEN.defaultMessage()
    );
    response.getWriter().write(objectMapper.writeValueAsString(payload));
    response.getWriter().flush();
  }
}

