package com.attendance.system.service;

import com.attendance.system.model.BranchEntity;
import com.attendance.system.model.EmployeeEntity;
import com.attendance.system.model.UserEntity;
import com.attendance.system.model.UserRole;
import com.attendance.system.model.VendorEntity;
import com.attendance.system.repository.BranchRepository;
import com.attendance.system.repository.EmployeeRepository;
import com.attendance.system.repository.UserRepository;
import com.attendance.system.repository.VendorRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Component
public class TenantDataSeeder implements ApplicationRunner {
    private final VendorRepository vendorRepository;
    private final BranchRepository branchRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public TenantDataSeeder(
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

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }

        VendorEntity hotelOne = createVendor("hotel-one", "Hotel One");
        VendorEntity hotelTwo = createVendor("hotel-two", "Hotel Two");

        BranchEntity hotelOneMain = createBranch(hotelOne, "Hotel One Main", "MG Road, Bengaluru", 12.975673, 77.606415, 50);
        BranchEntity hotelOneAnnex = createBranch(hotelOne, "Hotel One Annex", "Koramangala, Bengaluru", 12.935192, 77.624481, 50);
        BranchEntity hotelTwoMain = createBranch(hotelTwo, "Hotel Two Main", "Andheri East, Mumbai", 19.118601, 72.868675, 50);

        EmployeeEntity ravi = createEmployee(hotelOne, hotelOneMain, "HOT1-001", "Ravi Kumar", "ravi@hotelone.test", "+91-9876543201", "Store Supervisor");
        EmployeeEntity anika = createEmployee(hotelOne, hotelOneAnnex, "HOT1-002", "Anika Shah", "anika@hotelone.test", "+91-9876543202", "Cashier");
        EmployeeEntity neha = createEmployee(hotelTwo, hotelTwoMain, "HOT2-001", "Neha Iyer", "neha@hoteltwo.test", "+91-9876543203", "Operations Lead");

        createUser(hotelOne, null, "Hotel One Admin", "admin@hotelone.test", "password", UserRole.VENDOR_ADMIN);
        createUser(hotelTwo, null, "Hotel Two Admin", "admin@hoteltwo.test", "password", UserRole.VENDOR_ADMIN);
        createUser(hotelOne, ravi, ravi.getName(), ravi.getEmail(), "password", UserRole.EMPLOYEE);
        createUser(hotelOne, anika, anika.getName(), anika.getEmail(), "password", UserRole.EMPLOYEE);
        createUser(hotelTwo, neha, neha.getName(), neha.getEmail(), "password", UserRole.EMPLOYEE);
    }

    private VendorEntity createVendor(String code, String name) {
        VendorEntity vendor = new VendorEntity();
        vendor.setCode(code);
        vendor.setName(name);
        vendor.setStatus("ACTIVE");
        return vendorRepository.save(vendor);
    }

    private BranchEntity createBranch(VendorEntity vendor, String name, String address, double latitude, double longitude, double radius) {
        BranchEntity branch = new BranchEntity();
        branch.setVendor(vendor);
        branch.setName(name);
        branch.setAddress(address);
        branch.setLatitude(BigDecimal.valueOf(latitude));
        branch.setLongitude(BigDecimal.valueOf(longitude));
        branch.setRadiusMeters(BigDecimal.valueOf(radius));
        return branchRepository.save(branch);
    }

    private EmployeeEntity createEmployee(
            VendorEntity vendor,
            BranchEntity branch,
            String code,
            String name,
            String email,
            String phone,
            String designation
    ) {
        EmployeeEntity employee = new EmployeeEntity();
        employee.setVendor(vendor);
        employee.setBranch(branch);
        employee.setEmployeeCode(code);
        employee.setName(name);
        employee.setEmail(email);
        employee.setPhone(phone);
        employee.setStatus("ACTIVE");
        employee.setDesignation(designation);
        employee.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return employeeRepository.save(employee);
    }

    private void createUser(VendorEntity vendor, EmployeeEntity employee, String name, String email, String password, UserRole role) {
        UserEntity user = new UserEntity();
        user.setVendor(vendor);
        user.setEmployee(employee);
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setActive(true);
        userRepository.save(user);
    }
}
