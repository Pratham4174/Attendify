package com.attendance.system.repository;

import com.attendance.system.model.BranchEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BranchRepository extends JpaRepository<BranchEntity, UUID> {
    List<BranchEntity> findByVendor_IdOrderByNameAsc(UUID vendorId);
    Optional<BranchEntity> findByIdAndVendor_Id(UUID id, UUID vendorId);
    long countByVendor_Id(UUID vendorId);
}
