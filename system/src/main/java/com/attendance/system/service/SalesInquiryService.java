package com.attendance.system.service;

import com.attendance.system.dto.SalesInquiryRequest;
import com.attendance.system.model.SalesInquiryEntity;
import com.attendance.system.repository.SalesInquiryRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class SalesInquiryService {
    private final SalesInquiryRepository salesInquiryRepository;
    @Nullable
    private final JavaMailSender javaMailSender;
    private final String salesContactEmail;

    public SalesInquiryService(
            SalesInquiryRepository salesInquiryRepository,
            @Nullable JavaMailSender javaMailSender,
            @Value("${app.sales.contact-email}") String salesContactEmail
    ) {
        this.salesInquiryRepository = salesInquiryRepository;
        this.javaMailSender = javaMailSender;
        this.salesContactEmail = salesContactEmail;
    }

    @Transactional
    public void createInquiry(SalesInquiryRequest request) {
        SalesInquiryEntity inquiry = new SalesInquiryEntity();
        inquiry.setContactName(request.contactName().trim());
        inquiry.setContactEmail(request.contactEmail().trim());
        inquiry.setContactPhone(request.contactPhone().trim());
        inquiry.setCompanyName(request.companyName().trim());
        inquiry.setEmployeeCount(request.employeeCount());
        inquiry.setMessage(request.message() == null ? null : request.message().trim());
        inquiry.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        salesInquiryRepository.save(inquiry);

        if (javaMailSender == null) {
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(salesContactEmail);
            message.setSubject("Peeplify custom pricing inquiry");
            message.setText("""
                    New custom plan inquiry

                    Name: %s
                    Email: %s
                    Phone: %s
                    Company: %s
                    Employee count: %s

                    Message:
                    %s
                    """.formatted(
                    inquiry.getContactName(),
                    inquiry.getContactEmail(),
                    inquiry.getContactPhone(),
                    inquiry.getCompanyName(),
                    inquiry.getEmployeeCount(),
                    inquiry.getMessage() == null || inquiry.getMessage().isBlank() ? "No additional message." : inquiry.getMessage()
            ));
            javaMailSender.send(message);
        } catch (Exception ignored) {
            // Inquiry is still stored even if email delivery is not configured yet.
        }
    }
}
