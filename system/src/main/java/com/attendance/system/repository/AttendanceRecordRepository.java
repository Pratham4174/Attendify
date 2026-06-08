package com.attendance.system.repository;

import com.attendance.system.model.AttendanceRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecordEntity, UUID> {
    List<AttendanceRecordEntity> findByVendor_IdOrderByAttendanceDateDescCheckInTimeDesc(UUID vendorId);
    List<AttendanceRecordEntity> findByEmployee_IdOrderByAttendanceDateDescCheckInTimeDesc(UUID employeeId);
    Optional<AttendanceRecordEntity> findFirstByEmployee_IdAndAttendanceDateOrderByCheckInTimeDesc(UUID employeeId, LocalDate attendanceDate);
    Optional<AttendanceRecordEntity> findFirstByEmployee_IdAndAttendanceDateAndCheckOutTimeIsNull(UUID employeeId, LocalDate attendanceDate);
    long countByVendor_IdAndAttendanceDate(UUID vendorId, LocalDate attendanceDate);
    long countByVendor_IdAndAttendanceDateAndCheckOutTimeIsNotNull(UUID vendorId, LocalDate attendanceDate);
    long countByVendor_IdAndBranch_IdAndAttendanceDate(UUID vendorId, UUID branchId, LocalDate attendanceDate);
    long countByEmployee_IdAndAttendanceDateBetween(UUID employeeId, LocalDate startDate, LocalDate endDate);
}
