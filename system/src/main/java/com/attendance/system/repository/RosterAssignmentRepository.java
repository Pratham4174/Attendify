package com.attendance.system.repository;

import com.attendance.system.model.RosterAssignmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface RosterAssignmentRepository extends JpaRepository<RosterAssignmentEntity, UUID> {
    List<RosterAssignmentEntity> findByVendor_IdAndAssignmentDateBetweenOrderByAssignmentDateAsc(UUID vendorId, LocalDate startDate, LocalDate endDate);
    List<RosterAssignmentEntity> findByVendor_IdAndBranch_IdAndAssignmentDateBetweenOrderByEmployee_NameAscAssignmentDateAsc(UUID vendorId, UUID branchId, LocalDate startDate, LocalDate endDate);
    List<RosterAssignmentEntity> findByEmployee_IdAndAssignmentDateBetweenOrderByAssignmentDateAsc(UUID employeeId, LocalDate startDate, LocalDate endDate);
    List<RosterAssignmentEntity> findByEmployee_IdAndAssignmentDateOrderByCreatedAtAsc(UUID employeeId, LocalDate assignmentDate);
    List<RosterAssignmentEntity> findByBranch_IdAndAssignmentDateAndRosterShift_Id(UUID branchId, LocalDate assignmentDate, UUID shiftId);
    java.util.Optional<RosterAssignmentEntity> findByIdAndVendor_Id(UUID id, UUID vendorId);
}
