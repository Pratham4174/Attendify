package com.attendance.system.security;

import com.attendance.system.service.VendorAccessPolicyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Map;

@Component
public class VendorAccessEnforcementFilter extends OncePerRequestFilter {
    private final VendorAccessPolicyService vendorAccessPolicyService;
    private final ObjectMapper objectMapper;

    public VendorAccessEnforcementFilter(
            VendorAccessPolicyService vendorAccessPolicyService,
            ObjectMapper objectMapper
    ) {
        this.vendorAccessPolicyService = vendorAccessPolicyService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/api/public/") || path.startsWith("/api/auth/login") || path.startsWith("/api/auth/forgot-password");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Object principal = SecurityContextHolder.getContext().getAuthentication() == null
                ? null
                : SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        if (principal instanceof AuthenticatedUser authenticatedUser) {
            try {
                vendorAccessPolicyService.assertAuthenticatedAccessAllowed(authenticatedUser);
            } catch (ResponseStatusException exception) {
                response.setStatus(exception.getStatusCode().value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                objectMapper.writeValue(response.getWriter(), Map.of("error", exception.getReason()));
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
