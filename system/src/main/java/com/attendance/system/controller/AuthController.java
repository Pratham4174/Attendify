package com.attendance.system.controller;

import com.attendance.system.dto.LoginRequest;
import com.attendance.system.dto.LoginResponse;
import com.attendance.system.security.AuthenticatedUser;
import com.attendance.system.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public LoginResponse.UserSummary me(Authentication authentication) {
        return authService.currentUser((AuthenticatedUser) authentication.getPrincipal());
    }
}
