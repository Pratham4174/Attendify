package com.attendance.system.repository;

import com.attendance.system.model.VendorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VendorRepository extends JpaRepository<VendorEntity, UUID> {
    Optional<VendorEntity> findByCode(String code);
}
