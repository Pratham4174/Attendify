package com.attendance.system.controller;

import com.attendance.system.dto.PropertyRegistrationRequest;
import com.attendance.system.dto.PropertyRegistrationResponse;
import com.attendance.system.service.PropertyRegistrationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicController {
    private final PropertyRegistrationService propertyRegistrationService;

    public PublicController(PropertyRegistrationService propertyRegistrationService) {
        this.propertyRegistrationService = propertyRegistrationService;
    }

    @PostMapping("/property-registration")
    public PropertyRegistrationResponse registerProperty(@Valid @RequestBody PropertyRegistrationRequest request) {
        return propertyRegistrationService.register(request);
    }
}
