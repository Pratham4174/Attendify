package com.attendance.system.dto;

import com.attendance.system.model.UserRole;

public record LoginResponse(
        String token,
        UserSummary user
) {
    public record UserSummary(
            String userId,
            String vendorId,
            String vendorName,
            String employeeId,
            String name,
            String email,
            UserRole role
    ) {
    }
}
