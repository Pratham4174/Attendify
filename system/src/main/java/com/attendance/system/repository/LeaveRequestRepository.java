package com.attendance.system.repository;

import com.attendance.system.model.LeaveRequestEntity;
import com.attendance.system.model.LeaveStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequestEntity, UUID> {
    List<LeaveRequestEntity> findByVendor_IdOrderByStartDateDescCreatedAtDesc(UUID vendorId);
    List<LeaveRequestEntity> findByEmployee_IdOrderByCreatedAtDesc(UUID employeeId);
    Optional<LeaveRequestEntity> findByIdAndVendor_Id(UUID id, UUID vendorId);
    List<LeaveRequestEntity> findByEmployee_IdAndStatusIn(UUID employeeId, List<LeaveStatus> statuses);
    List<LeaveRequestEntity> findByEmployee_IdAndStatusAndEndDateGreaterThanEqualAndStartDateLessThanEqual(
            UUID employeeId,
            LeaveStatus status,
            LocalDate startDate,
            LocalDate endDate
    );
}
