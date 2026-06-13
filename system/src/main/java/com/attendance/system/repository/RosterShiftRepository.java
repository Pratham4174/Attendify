package com.attendance.system.repository;

import com.attendance.system.model.RosterShiftEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RosterShiftRepository extends JpaRepository<RosterShiftEntity, UUID> {
    List<RosterShiftEntity> findByVendor_IdOrderByBranch_NameAscNameAsc(UUID vendorId);
    List<RosterShiftEntity> findByVendor_IdAndBranch_IdOrderByNameAsc(UUID vendorId, UUID branchId);
    Optional<RosterShiftEntity> findByIdAndVendor_Id(UUID id, UUID vendorId);
    boolean existsByVendor_IdAndBranch_IdAndCodeIgnoreCase(UUID vendorId, UUID branchId, String code);
    boolean existsByVendor_IdAndBranch_IdAndCodeIgnoreCaseAndIdNot(UUID vendorId, UUID branchId, String code, UUID id);
}
