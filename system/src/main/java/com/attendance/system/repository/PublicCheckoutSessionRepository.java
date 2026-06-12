package com.attendance.system.repository;

import com.attendance.system.model.PublicCheckoutSessionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PublicCheckoutSessionRepository extends JpaRepository<PublicCheckoutSessionEntity, UUID> {
    Optional<PublicCheckoutSessionEntity> findByCashfreeOrderId(String cashfreeOrderId);
    List<PublicCheckoutSessionEntity> findByVendor_IdOrderByCreatedAtDesc(UUID vendorId);
}
