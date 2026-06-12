package com.attendance.system.service;

import com.attendance.system.model.UserEntity;
import com.attendance.system.model.UserRole;
import com.attendance.system.model.VendorEntity;
import com.attendance.system.repository.UserRepository;
import com.attendance.system.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class VendorAccessPolicyService {
    private final UserRepository userRepository;

    public VendorAccessPolicyService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public void assertLoginAllowed(UserEntity user) {
        assertVendorAccess(user.getVendor(), user.getRole());
    }

    @Transactional(readOnly = true)
    public void assertAuthenticatedAccessAllowed(AuthenticatedUser authenticatedUser) {
        UserEntity user = userRepository.findById(authenticatedUser.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));
        assertVendorAccess(user.getVendor(), user.getRole());
    }

    private void assertVendorAccess(VendorEntity vendor, UserRole role) {
        if (vendor.getAccessExpiresAt() == null) {
            return;
        }

        if (vendor.getAccessExpiresAt().isAfter(OffsetDateTime.now(ZoneOffset.UTC))) {
            return;
        }

        throw new ResponseStatusException(
                HttpStatus.PAYMENT_REQUIRED,
                role == UserRole.VENDOR_ADMIN
                        ? "Workspace access has expired. Renew your plan to continue."
                        : "Workspace access has expired. Please contact your admin to renew the plan."
        );
    }
}
