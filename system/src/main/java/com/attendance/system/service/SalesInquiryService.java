package com.attendance.system.service;

import com.attendance.system.dto.SalesInquiryRequest;
import com.attendance.system.dto.SalesInquiryResponse;
import com.attendance.system.model.SalesInquiryEntity;
import com.attendance.system.repository.SalesInquiryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    private static final Logger log = LoggerFactory.getLogger(SalesInquiryService.class);
    private final SalesInquiryRepository salesInquiryRepository;
    @Nullable
    private final JavaMailSender javaMailSender;
    private final String salesContactEmail;
    @Nullable
    private final String salesFromEmail;

    public SalesInquiryService(
            SalesInquiryRepository salesInquiryRepository,
            @Nullable JavaMailSender javaMailSender,
            @Value("${app.sales.contact-email}") String salesContactEmail,
            @Value("${app.sales.from-email:}") @Nullable String salesFromEmail
    ) {
        this.salesInquiryRepository = salesInquiryRepository;
        this.javaMailSender = javaMailSender;
        this.salesContactEmail = salesContactEmail;
        this.salesFromEmail = salesFromEmail == null || salesFromEmail.isBlank() ? null : salesFromEmail.trim();
    }

    @Transactional
    public SalesInquiryResponse createInquiry(SalesInquiryRequest request) {
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
            log.warn("Sales inquiry email not sent because JavaMailSender is unavailable. Inquiry id={}", inquiry.getId());
            return new SalesInquiryResponse(
                    "Your request was saved, but email delivery is not configured yet. Please check the backend mail settings.",
                    false,
                    true
            );
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(salesContactEmail);
            if (salesFromEmail != null) {
                message.setFrom(salesFromEmail);
            }
            message.setReplyTo(inquiry.getContactEmail());
            message.setSubject("Peeplify contact request");
            message.setText("""
                    New Peeplify contact request

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
            return new SalesInquiryResponse("Thanks. Your request was sent successfully.", true, true);
        } catch (Exception exception) {
            log.warn("Sales inquiry email delivery failed for inquiry id={}: {}", inquiry.getId(), exception.getMessage());
            return new SalesInquiryResponse(
                    "Your request was saved, but the email could not be delivered right now. Please check the server mail settings.",
                    false,
                    true
            );
        }
    }
}
