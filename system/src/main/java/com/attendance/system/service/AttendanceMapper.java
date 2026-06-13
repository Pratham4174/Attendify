package com.attendance.system.service;

import com.attendance.system.dto.AttendanceRowResponse;
import com.attendance.system.dto.BranchResponse;
import com.attendance.system.dto.EmployeeResponse;
import com.attendance.system.dto.EmployeeOverviewResponse;
import com.attendance.system.model.AttendanceRecordEntity;
import com.attendance.system.model.BranchEntity;
import com.attendance.system.model.EmployeeEntity;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class AttendanceMapper {
    public AttendanceRowResponse toAttendanceRow(AttendanceRecordEntity record) {
        return new AttendanceRowResponse(
                record.getId().toString(),
                record.getEmployee().getId().toString(),
                record.getEmployee().getName(),
                record.getBranch().getId().toString(),
                record.getBranch().getName(),
                record.getAttendanceDate().toString(),
                record.getCheckInTime().toString(),
                record.getCheckOutTime() == null ? null : record.getCheckOutTime().toString(),
                record.getStatus().name(),
                record.getCheckInDistanceMeters().doubleValue(),
                record.getCheckOutDistanceMeters() == null ? null : record.getCheckOutDistanceMeters().doubleValue(),
                record.getCheckInPhotoRef(),
                record.getCheckOutPhotoRef()
        );
    }

    public EmployeeOverviewResponse.EmployeeSummary toEmployeeSummary(EmployeeEntity employee) {
        return new EmployeeOverviewResponse.EmployeeSummary(
                employee.getId().toString(),
                employee.getBranch().getId().toString(),
                employee.getEmployeeCode(),
                employee.getName(),
                employee.getEmail(),
                employee.getPhone(),
                employee.getStatus(),
                employee.getDesignation(),
                employee.getProfileImageRef(),
                employee.getCreatedAt().toString()
        );
    }

    public EmployeeOverviewResponse.BranchSummary toBranchSummary(BranchEntity branch) {
        return new EmployeeOverviewResponse.BranchSummary(
                branch.getId().toString(),
                branch.getName(),
                branch.getAddress(),
                branch.getLatitude().doubleValue(),
                branch.getLongitude().doubleValue(),
                branch.getRadiusMeters().doubleValue()
        );
    }

    public EmployeeResponse toEmployeeResponse(EmployeeEntity employee, boolean loginEnabled) {
        return new EmployeeResponse(
                employee.getId().toString(),
                employee.getEmployeeCode(),
                employee.getName(),
                employee.getDesignation(),
                employee.getEmail(),
                employee.getPhone(),
                employee.getStatus(),
                employee.getBranch().getId().toString(),
                employee.getBranch().getName(),
                employee.getMonthlySalary().toPlainString(),
                employee.getMonthlyLeaveAllowance(),
                employee.getAdvancePaid().toPlainString(),
                loginEnabled,
                employee.getProfileImageRef(),
                employee.getCreatedAt().toString()
        );
    }

    public BranchResponse toBranchResponse(BranchEntity branch) {
        return new BranchResponse(
                branch.getId().toString(),
                branch.getName(),
                branch.getAddress(),
                branch.getLatitude().doubleValue(),
                branch.getLongitude().doubleValue(),
                branch.getRadiusMeters().doubleValue(),
                branch.getShiftStartTime().toString(),
                branch.getShiftEndTime().toString(),
                branch.getGraceMinutes(),
                Math.max(1, branch.getHalfDayMinutes() / 60),
                Math.max(1, branch.getFullDayMinutes() / 60),
                branch.getWeeklyOffMode(),
                splitCsv(branch.getWeeklyOffDaysCsv())
        );
    }

    private List<String> splitCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .toList();
    }
}
