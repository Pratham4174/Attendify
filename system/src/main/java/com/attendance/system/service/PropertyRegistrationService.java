package com.attendance.system.service;

import com.attendance.system.dto.PropertyRegistrationRequest;
import com.attendance.system.dto.PropertyRegistrationResponse;
import com.attendance.system.model.BranchEntity;
import com.attendance.system.model.EmployeeEntity;
import com.attendance.system.model.UserEntity;
import com.attendance.system.model.UserRole;
import com.attendance.system.model.VendorEntity;
import com.attendance.system.repository.BranchRepository;
import com.attendance.system.repository.EmployeeRepository;
import com.attendance.system.repository.UserRepository;
import com.attendance.system.repository.VendorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@Service
public class PropertyRegistrationService {
    private final VendorRepository vendorRepository;
    private final BranchRepository branchRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public PropertyRegistrationService(
            VendorRepository vendorRepository,
            BranchRepository branchRepository,
            EmployeeRepository employeeRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.vendorRepository = vendorRepository;
        this.branchRepository = branchRepository;
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public PropertyRegistrationResponse register(PropertyRegistrationRequest request) {
        String propertyCode = request.propertyCode().trim().toLowerCase(Locale.ROOT);
        if (vendorRepository.existsByCode(propertyCode)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Property code is already registered.");
        }
        if (userRepository.existsByEmailIgnoreCase(request.adminEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Admin email is already registered.");
        }

        Set<String> seenEmployeeCodes = new HashSet<>();
        Set<String> seenEmployeeEmails = new HashSet<>();
        for (PropertyRegistrationRequest.EmployeeSeed employee : request.employees()) {
            String employeeCode = employee.employeeCode().trim().toUpperCase(Locale.ROOT);
            String email = employee.email().trim().toLowerCase(Locale.ROOT);
            if (!seenEmployeeCodes.add(employeeCode)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee codes must be unique.");
            }
            if (!seenEmployeeEmails.add(email)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Employee emails must be unique.");
            }
            if (employeeRepository.existsByEmailIgnoreCase(email) || userRepository.existsByEmailIgnoreCase(email)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "One of the employee emails is already registered.");
            }
        }

        VendorEntity vendor = new VendorEntity();
        vendor.setCode(propertyCode);
        vendor.setName(request.propertyName().trim());
        vendor.setStatus("ACTIVE");
        vendor = vendorRepository.save(vendor);

        BranchEntity branch = new BranchEntity();
        branch.setVendor(vendor);
        branch.setName(request.branchName().trim());
        branch.setAddress(request.branchAddress().trim());
        branch.setLatitude(BigDecimal.valueOf(request.latitude()));
        branch.setLongitude(BigDecimal.valueOf(request.longitude()));
        branch.setRadiusMeters(BigDecimal.valueOf(request.radiusMeters()));
        branch = branchRepository.save(branch);

        UserEntity admin = new UserEntity();
        admin.setVendor(vendor);
        admin.setName(request.adminName().trim());
        admin.setEmail(request.adminEmail().trim().toLowerCase(Locale.ROOT));
        admin.setPasswordHash(passwordEncoder.encode(request.adminPassword()));
        admin.setRole(UserRole.VENDOR_ADMIN);
        admin.setActive(true);
        userRepository.save(admin);

        int createdEmployees = 0;
        for (PropertyRegistrationRequest.EmployeeSeed seed : request.employees()) {
            EmployeeEntity employee = new EmployeeEntity();
            employee.setVendor(vendor);
            employee.setBranch(branch);
            employee.setEmployeeCode(seed.employeeCode().trim().toUpperCase(Locale.ROOT));
            employee.setName(seed.name().trim());
            employee.setEmail(seed.email().trim().toLowerCase(Locale.ROOT));
            employee.setPhone(seed.phone().trim());
            employee.setStatus("ACTIVE");
            employee.setDesignation(seed.designation().trim());
            employee.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
            employee = employeeRepository.save(employee);

            UserEntity employeeUser = new UserEntity();
            employeeUser.setVendor(vendor);
            employeeUser.setEmployee(employee);
            employeeUser.setName(employee.getName());
            employeeUser.setEmail(employee.getEmail());
            employeeUser.setPasswordHash(passwordEncoder.encode("password"));
            employeeUser.setRole(UserRole.EMPLOYEE);
            employeeUser.setActive(true);
            userRepository.save(employeeUser);
            createdEmployees++;
        }

        return new PropertyRegistrationResponse(
                "Property registered successfully. You can now sign in with the admin account.",
                vendor.getId().toString(),
                branch.getId().toString(),
                createdEmployees,
                admin.getEmail()
        );
    }
}
