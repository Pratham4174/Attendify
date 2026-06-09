package com.attendance.system.repository;

import com.attendance.system.model.AttendanceCorrectionAuditEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AttendanceCorrectionAuditRepository extends JpaRepository<AttendanceCorrectionAuditEntity, UUID> {
    List<AttendanceCorrectionAuditEntity> findByCorrectionRequest_IdOrderByCreatedAtAsc(UUID correctionRequestId);
}
