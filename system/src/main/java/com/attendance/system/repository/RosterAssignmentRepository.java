package com.attendance.system.repository;

import com.attendance.system.model.RosterAssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RosterAssignmentRepository extends JpaRepository<RosterAssignmentEntity, UUID> {
    List<RosterAssignmentEntity> findByVendor_IdAndAssignmentDateBetweenOrderByAssignmentDateAsc(UUID vendorId, LocalDate startDate, LocalDate endDate);
}
