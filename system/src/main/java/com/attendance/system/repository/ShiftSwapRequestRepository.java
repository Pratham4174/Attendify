package com.attendance.system.repository;

import com.attendance.system.model.ShiftSwapRequestEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShiftSwapRequestRepository extends JpaRepository<ShiftSwapRequestEntity, UUID> {
    List<ShiftSwapRequestEntity> findByVendor_IdOrderByRequestedAtDesc(UUID vendorId);
    List<ShiftSwapRequestEntity> findByRequesterEmployee_IdOrderByRequestedAtDesc(UUID employeeId);
    Optional<ShiftSwapRequestEntity> findByIdAndVendor_Id(UUID id, UUID vendorId);
}
