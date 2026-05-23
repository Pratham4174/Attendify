package com.attendance.system.security;

import com.attendance.system.model.UserRole;

import java.util.UUID;

public record AuthenticatedUser(
        UUID userId,
        UUID vendorId,
        UUID employeeId,
        String vendorName,
        String name,
        String email,
        UserRole role
) {
}
