package com.attendance.system.repository;

import com.attendance.system.model.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
    Optional<UserEntity> findByEmployee_Id(UUID employeeId);
    List<UserEntity> findByEmployee_IdIn(Collection<UUID> employeeIds);
}
