package com.attendance.system.service;

import com.attendance.system.dto.ForgotPasswordRequest;
import com.attendance.system.dto.LoginRequest;
import com.attendance.system.dto.LoginResponse;
import com.attendance.system.dto.MessageResponse;
import com.attendance.system.model.UserEntity;
import com.attendance.system.model.UserRole;
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

    @Transactional
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        UserEntity user = userRepository.findByEmailIgnoreCase(request.email())
                .filter(UserEntity::isActive)
                .filter(existingUser -> existingUser.getRole() == UserRole.EMPLOYEE)
                .filter(existingUser -> existingUser.getEmployee() != null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee account not found."));

        String requestedPhone = normalizePhone(request.phone());
        String employeePhone = normalizePhone(user.getEmployee().getPhone());
        if (!employeePhone.equals(requestedPhone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and phone do not match our records.");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        return new MessageResponse("Password updated successfully. You can sign in now.");
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

    private String normalizePhone(String value) {
        return value == null ? "" : value.replaceAll("[^0-9]", "");
    }
}
