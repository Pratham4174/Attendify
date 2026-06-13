package com.attendance.system.dto;

public record RosterAssignmentResponse(
        String id,
        String employeeId,
        String employeeName,
        String branchId,
        String branchName,
        String shiftId,
        String shiftCode,
        String shiftName,
        String assignmentDate,
        String assignmentType,
        String status,
        String startTime,
        String endTime,
        String colorHex,
        String notes
) {
}
