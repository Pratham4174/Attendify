package com.attendance.system.repository;

import com.attendance.system.model.RosterTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RosterTemplateRepository extends JpaRepository<RosterTemplateEntity, UUID> {
    List<RosterTemplateEntity> findByVendor_IdOrderByNameAsc(UUID vendorId);
    Optional<RosterTemplateEntity> findByIdAndVendor_Id(UUID id, UUID vendorId);
}
