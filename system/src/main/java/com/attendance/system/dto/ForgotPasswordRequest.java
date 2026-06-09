package com.attendance.system.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 6, max = 30) String phone,
        @NotBlank @Size(min = 6, max = 72) String newPassword
) {
}
