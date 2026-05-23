package com.attendance.system.dto;

public record BranchResponse(
        String id,
        String name,
        String address,
        double latitude,
        double longitude,
        double radiusMeters
) {
}
