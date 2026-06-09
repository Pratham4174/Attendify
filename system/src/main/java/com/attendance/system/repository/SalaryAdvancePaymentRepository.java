package com.attendance.system.repository;

import com.attendance.system.model.SalaryAdvancePaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface SalaryAdvancePaymentRepository extends JpaRepository<SalaryAdvancePaymentEntity, UUID> {
    List<SalaryAdvancePaymentEntity> findByVendor_IdAndPaymentDateBetweenOrderByPaymentDateDescCreatedAtDesc(
            UUID vendorId,
            LocalDate startDate,
            LocalDate endDate
    );
}
