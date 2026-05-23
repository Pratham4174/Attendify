package com.attendance.system.dto;

public record AttendanceRowResponse(
        String recordId,
        String employeeId,
        String employeeName,
        String branchId,
        String branchName,
        String date,
        String checkInTime,
        String checkOutTime,
        String status,
        double checkInDistanceMeters,
        Double checkOutDistanceMeters,
        String checkInPhotoRef,
        String checkOutPhotoRef
) {
}
