package com.attendance.system.repository;

import com.attendance.system.model.AttendanceLocationLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceLocationLogRepository extends JpaRepository<AttendanceLocationLogEntity, UUID> {
    Optional<AttendanceLocationLogEntity> findFirstByAttendanceRecord_IdOrderByCapturedAtDesc(UUID attendanceRecordId);
    long countByAttendanceRecord_Id(UUID attendanceRecordId);
    List<AttendanceLocationLogEntity> findByVendor_IdAndAttendanceRecord_AttendanceDateOrderByEmployee_NameAscCapturedAtAsc(UUID vendorId, LocalDate attendanceDate);
    boolean existsByAttendanceRecord_IdAndCapturedAtAfter(UUID attendanceRecordId, OffsetDateTime capturedAt);
}
