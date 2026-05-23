package com.attendance.system.service;

import com.attendance.system.dto.LoginRequest;
import com.attendance.system.dto.LoginResponse;
import com.attendance.system.model.UserEntity;
import com.attendance.system.repository.UserRepository;
import com.attendance.system.security.AuthenticatedUser;
import com.attendance.system.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmailIgnoreCase(request.email())
                .filter(UserEntity::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials.");
        }

        return new LoginResponse(jwtService.generateToken(user), toUserSummary(user));
    }

    @Transactional(readOnly = true)
    public LoginResponse.UserSummary currentUser(AuthenticatedUser authenticatedUser) {
        UserEntity user = userRepository.findById(authenticatedUser.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));
        return toUserSummary(user);
    }

    private LoginResponse.UserSummary toUserSummary(UserEntity user) {
        return new LoginResponse.UserSummary(
                user.getId().toString(),
                user.getVendor().getId().toString(),
                user.getVendor().getName(),
                user.getEmployee() == null ? null : user.getEmployee().getId().toString(),
                user.getName(),
                user.getEmail(),
                user.getRole()
        );
    }
}
