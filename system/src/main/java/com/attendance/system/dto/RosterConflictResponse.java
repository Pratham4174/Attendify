package com.attendance.system.dto;

public record RosterConflictResponse(
        String type,
        String severity,
        String assignmentDate,
        String employeeId,
        String employeeName,
        String shiftId,
        String shiftName,
        String message
) {
}
