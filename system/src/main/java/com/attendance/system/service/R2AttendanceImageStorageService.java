package com.attendance.system.service;

import com.attendance.system.model.AttendanceRecordEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Base64;
import java.util.UUID;

public class R2AttendanceImageStorageService implements AttendanceImageStorageService {
    private final S3Client s3Client;
    private final String bucket;
    private final String publicBaseUrl;

    public R2AttendanceImageStorageService(S3Client s3Client, String bucket, String publicBaseUrl) {
        this.s3Client = s3Client;
        this.bucket = bucket;
        this.publicBaseUrl = publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
    }

    @Override
    public String storeCheckInImage(AttendanceRecordEntity record, String imageDataUrl) {
        return upload(record, imageDataUrl, "check-in");
    }

    @Override
    public String storeCheckOutImage(AttendanceRecordEntity record, String imageDataUrl) {
        return upload(record, imageDataUrl, "check-out");
    }

    private String upload(AttendanceRecordEntity record, String imageDataUrl, String mode) {
        ParsedImage parsedImage = parseDataUrl(imageDataUrl);
        LocalDate attendanceDate = record.getAttendanceDate();
        String key = "attendance/%s/%s/%s/%s-%s.%s".formatted(
                record.getVendor().getId(),
                record.getEmployee().getId(),
                attendanceDate,
                mode,
                UUID.randomUUID(),
                parsedImage.extension()
        );

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(parsedImage.contentType())
                .contentLength((long) parsedImage.bytes().length)
                .build();

        s3Client.putObject(request, RequestBody.fromBytes(parsedImage.bytes()));
        return URI.create(publicBaseUrl + "/" + key).toString();
    }

    private ParsedImage parseDataUrl(String imageDataUrl) {
        if (imageDataUrl == null || imageDataUrl.isBlank() || !imageDataUrl.startsWith("data:")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attendance image is missing.");
        }

        int commaIndex = imageDataUrl.indexOf(',');
        if (commaIndex < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attendance image format is invalid.");
        }

        String metadata = imageDataUrl.substring(5, commaIndex);
        String payload = imageDataUrl.substring(commaIndex + 1);
        if (!metadata.contains(";base64")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attendance image must be base64 encoded.");
        }

        String contentType = metadata.substring(0, metadata.indexOf(';'));
        String extension = switch (contentType) {
            case "image/jpeg", "image/jpg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only JPG, PNG, or WEBP attendance images are supported.");
        };

        byte[] bytes;
        try {
          bytes = Base64.getDecoder().decode(payload.getBytes(StandardCharsets.UTF_8));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attendance image could not be decoded.");
        }

        if (bytes.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attendance image is empty.");
        }

        return new ParsedImage(contentType, extension, bytes);
    }

    private record ParsedImage(String contentType, String extension, byte[] bytes) {
    }
}
