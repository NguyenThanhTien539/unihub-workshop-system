package com.unihub.infrastructure.security;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = RbacSecurityTestEndpoints.class)
@Import({
        SecurityConfig.class,
        UserPrincipalConverter.class,
        JsonAuthenticationEntryPoint.class,
        JsonAccessDeniedHandler.class
})
@TestPropertySource(properties = {
        "app.auth.jwt.secret=01234567890123456789012345678901",
        "app.security.cors.allowed-origins=http://localhost:3000"
})
public class RbacSecurityTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicCanAccessWorkshopList() throws Exception {
        mockMvc.perform(get("/api/workshops"))
                .andExpect(status().isOk());
    }

    @Test
    void publicCannotAccessProtectedEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/auth-test"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void studentCannotAccessAdminOrCheckinButCanAccessRegistrationsAndPayments() throws Exception {
        mockMvc.perform(get("/api/admin/auth-test").with(roleJwt("student")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/checkin/sessions").with(roleJwt("student")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/registrations/auth-test").with(roleJwt("student")))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/payments/intents").with(roleJwt("student")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/payments/10000000-0000-0000-0000-000000000001/status").with(roleJwt("student")))
                .andExpect(status().isOk());
    }

    @Test
    void organizerCanAccessAdminButCannotAccessRegistrationsOrCheckin() throws Exception {
        mockMvc.perform(get("/api/admin/auth-test").with(roleJwt("organizer")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/csv-imports/10000000-0000-0000-0000-000000000001").with(roleJwt("organizer")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/registrations/auth-test").with(roleJwt("organizer")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/checkin/sessions").with(roleJwt("organizer")))
                .andExpect(status().isForbidden());
    }

    @Test
    void checkinStaffCanAccessCheckinButCannotAccessAdmin() throws Exception {
        mockMvc.perform(get("/api/checkin/sessions").with(roleJwt("checkin_staff")))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/checkin/validate").with(roleJwt("checkin_staff")))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/checkin/sync").with(roleJwt("checkin_staff")))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/auth-test").with(roleJwt("checkin_staff")))
                .andExpect(status().isForbidden());
    }

    @Test
    void authenticatedUsersCanAccessOwnNotifications() throws Exception {
        mockMvc.perform(get("/api/notifications/me").with(roleJwt("student")))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/notifications/10000000-0000-0000-0000-000000000001/read").with(roleJwt("student")))
                .andExpect(status().isOk());
    }

    @Test
    void paymentCallbackIsPublicAtSecurityLayer() throws Exception {
        mockMvc.perform(post("/api/payments/zalopay/callback"))
                .andExpect(status().isOk());
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor roleJwt(String role) {
        String authority = "ROLE_" + role.toUpperCase().replaceAll("[^A-Z0-9]+", "_");
        return jwt()
                .authorities(new SimpleGrantedAuthority(authority))
                .jwt(jwt -> jwt
                        .subject("20000000-0000-0000-0000-000000000001")
                        .claim("email", role + "@university.edu.vn")
                        .claim("roles", List.of(role))
                        .claim("token_type", "access"));
    }
}
