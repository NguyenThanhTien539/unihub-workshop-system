package com.unihub.infrastructure.security;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class UserPrincipalConverter implements Converter<Jwt, UsernamePasswordAuthenticationToken> {
  @Override
  public UsernamePasswordAuthenticationToken convert(Jwt jwt) {
    String subject = jwt.getSubject();
    UUID userId = UUID.fromString(subject);
    String email = jwt.getClaimAsString("email");
    List<String> roles = jwt.getClaimAsStringList("roles");
    if (roles == null) {
      roles = List.of();
    }

    Collection<GrantedAuthority> authorities = roles.stream()
        .map(this::toAuthority)
        .map(SimpleGrantedAuthority::new)
        .collect(Collectors.toSet());

    UserPrincipal principal = new UserPrincipal(userId, email, roles);
    return new UsernamePasswordAuthenticationToken(principal, jwt.getTokenValue(), authorities);
  }

  private String toAuthority(String role) {
    String normalized = role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
    normalized = normalized.replaceAll("[^A-Z0-9]+", "_");
    return "ROLE_" + normalized;
  }
}

