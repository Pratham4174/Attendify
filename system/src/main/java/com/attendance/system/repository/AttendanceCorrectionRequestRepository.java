package com.attendance.system.repository;

import com.attendance.system.model.AttendanceCorrectionRequestEntity;
import com.attendance.system.model.AttendanceCorrectionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceCorrectionRequestRepository extends JpaRepository<AttendanceCorrectionRequestEntity, UUID> {
    List<AttendanceCorrectionRequestEntity> findByEmployee_IdOrderByCreatedAtDesc(UUID employeeId);
    List<AttendanceCorrectionRequestEntity> findByVendor_IdOrderByCreatedAtDesc(UUID vendorId);
    Optional<AttendanceCorrectionRequestEntity> findByIdAndVendor_Id(UUID id, UUID vendorId);
    boolean existsByEmployee_IdAndAttendanceDateAndStatus(UUID employeeId, LocalDate attendanceDate, AttendanceCorrectionStatus status);
}
