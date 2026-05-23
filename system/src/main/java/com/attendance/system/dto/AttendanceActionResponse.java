package com.attendance.system.dto;

public record AttendanceActionResponse(
        String message,
        double distanceMeters,
        boolean withinGeofence,
        AttendanceRowResponse attendance
) {
}
