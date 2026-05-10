package com.unihub.presentation.mapper.auth;

import com.unihub.application.auth.model.CurrentUser;
import com.unihub.application.auth.model.LoginResult;
import com.unihub.application.auth.model.TokenPair;
import com.unihub.presentation.dto.response.auth.AuthResponse;
import com.unihub.presentation.dto.response.auth.MeResponse;
import com.unihub.presentation.dto.response.auth.StudentProfileResponse;
import com.unihub.presentation.dto.response.auth.TokenResponse;
import com.unihub.presentation.dto.response.auth.UserResponse;
import org.springframework.stereotype.Component;

@Component
public class AuthResponseMapper {
  public AuthResponse toAuthResponse(LoginResult result) {
    return new AuthResponse(
        result.token().accessToken(),
        result.token().refreshToken(),
        result.token().expiresIn(),
        result.user().roles());
  }

  public TokenResponse toTokenResponse(TokenPair tokenPair) {
    return new TokenResponse(
        tokenPair.accessToken(),
        tokenPair.refreshToken(),
        tokenPair.expiresIn());
  }

  public MeResponse toMeResponse(CurrentUser currentUser) {
    return new MeResponse(toUserResponse(currentUser));
  }

  private UserResponse toUserResponse(CurrentUser currentUser) {
    StudentProfileResponse profile = currentUser.studentProfile() == null
        ? null
        : new StudentProfileResponse(
            currentUser.studentProfile().studentId(),
            currentUser.studentProfile().studentCode(),
            currentUser.studentProfile().status());

    return new UserResponse(
        currentUser.id(),
        currentUser.email(),
        currentUser.fullName(),
        currentUser.roles(),
        profile);
  }
}
