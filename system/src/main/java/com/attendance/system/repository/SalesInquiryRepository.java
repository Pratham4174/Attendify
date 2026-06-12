package com.attendance.system.repository;

import com.attendance.system.model.SalesInquiryEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SalesInquiryRepository extends JpaRepository<SalesInquiryEntity, UUID> {
}
