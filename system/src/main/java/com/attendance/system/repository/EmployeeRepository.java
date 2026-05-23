package com.attendance.system.repository;

import com.attendance.system.model.EmployeeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmployeeRepository extends JpaRepository<EmployeeEntity, UUID> {
    List<EmployeeEntity> findByVendor_IdOrderByNameAsc(UUID vendorId);
    Optional<EmployeeEntity> findByIdAndVendor_Id(UUID id, UUID vendorId);
}
