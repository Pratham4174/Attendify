package com.attendance.system.security;

import com.attendance.system.model.UserEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {
    private final SecretKey secretKey;
    private final long expirationSeconds;

    public JwtService(
            @Value("${app.security.jwt-secret}") String secret,
            @Value("${app.security.jwt-expiration-seconds}") long expirationSeconds
    ) {
        this.secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.expirationSeconds = expirationSeconds;
    }

    public String generateToken(UserEntity user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setSubject(user.getId().toString())
                .claim("vendorId", user.getVendor().getId().toString())
                .claim("vendorName", user.getVendor().getName())
                .claim("employeeId", user.getEmployee() == null ? null : user.getEmployee().getId().toString())
                .claim("role", user.getRole().name())
                .claim("name", user.getName())
                .claim("email", user.getEmail())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(expirationSeconds)))
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public AuthenticatedUser parse(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();

        return new AuthenticatedUser(
                UUID.fromString(claims.getSubject()),
                UUID.fromString(claims.get("vendorId", String.class)),
                claims.get("employeeId", String.class) == null ? null : UUID.fromString(claims.get("employeeId", String.class)),
                claims.get("vendorName", String.class),
                claims.get("name", String.class),
                claims.get("email", String.class),
                Enum.valueOf(com.attendance.system.model.UserRole.class, claims.get("role", String.class))
        );
    }
}
