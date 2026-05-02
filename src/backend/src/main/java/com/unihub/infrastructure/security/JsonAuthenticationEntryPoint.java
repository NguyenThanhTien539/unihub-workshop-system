package com.unihub.infrastructure.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unihub.domain.user.UserErrorCode;
import com.unihub.presentation.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

@Component
public class JsonAuthenticationEntryPoint implements AuthenticationEntryPoint {
  private final ObjectMapper objectMapper;

  public JsonAuthenticationEntryPoint(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
      throws IOException {
    UserErrorCode errorCode;
    String authHeader = request.getHeader("Authorization");

    if (authHeader == null || authHeader.isBlank()) {
      errorCode = UserErrorCode.AUTH_TOKEN_MISSING;
    } else if (ex instanceof InvalidBearerTokenException && ex.getMessage() != null
        && ex.getMessage().toLowerCase().contains("expired")) {
      errorCode = UserErrorCode.AUTH_TOKEN_EXPIRED;
    } else {
      errorCode = UserErrorCode.AUTH_TOKEN_INVALID;
    }

    response.setStatus(HttpStatus.UNAUTHORIZED.value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding("UTF-8");

    ApiResponse<?> payload = ApiResponse.error(errorCode.code(), errorCode.defaultMessage());
    response.getWriter().write(objectMapper.writeValueAsString(payload));
    response.getWriter().flush();
  }
}

