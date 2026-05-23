package com.attendance.system.dto;

import java.util.List;

public record AdminTrackingResponse(
        String date,
        List<EmployeeDayRoute> employees
) {
    public record EmployeeDayRoute(
            String employeeId,
            String employeeName,
            String branchName,
            String attendanceStatus,
            String checkInTime,
            String checkOutTime,
            boolean trackingActive,
            int totalPings,
            List<RoutePoint> points
    ) {
    }

    public record RoutePoint(
            String capturedAt,
            double latitude,
            double longitude,
            Double accuracyMeters
    ) {
    }
}
