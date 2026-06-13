package com.attendance.system.repository;

import com.attendance.system.model.RosterEditAuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RosterEditAuditLogRepository extends JpaRepository<RosterEditAuditLogEntity, UUID> {
    List<RosterEditAuditLogEntity> findByVendor_IdOrderByCreatedAtDesc(UUID vendorId);
}
