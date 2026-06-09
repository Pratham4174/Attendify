package com.attendance.system.repository;

import com.attendance.system.model.HolidayEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HolidayRepository extends JpaRepository<HolidayEntity, UUID> {
    List<HolidayEntity> findByVendor_IdOrderByHolidayDateAsc(UUID vendorId);
    List<HolidayEntity> findByVendor_IdAndHolidayDateBetweenOrderByHolidayDateAsc(UUID vendorId, LocalDate startDate, LocalDate endDate);
    Optional<HolidayEntity> findByIdAndVendor_Id(UUID id, UUID vendorId);
    boolean existsByVendor_IdAndHolidayDate(UUID vendorId, LocalDate holidayDate);
}
