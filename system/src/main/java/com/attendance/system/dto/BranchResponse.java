package com.attendance.system.dto;

public record BranchResponse(
        String id,
        String name,
        String address,
        double latitude,
        double longitude,
        double radiusMeters,
        String shiftStartTime,
        String shiftEndTime,
        int graceMinutes
) {
}
