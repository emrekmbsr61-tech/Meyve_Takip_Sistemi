package com.emre.meyvetakipsistemi.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/*
  JWT (JSON Web Token) uretme ve dogrulama islerini yapan servistir.
  Token, kullanicinin kimligini (id ve rol) tasir; sifre gibi hassas bilgi
  ASLA icermez. application.properties'teki jwt.secret ile imzalanir.
*/
@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    // Kullanici basariyla giris yaptiginda AuthService tarafindan cagirilir.
    public String generateToken(Long userId, String role) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", role)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    // Gelen bir istekteki token gecerli mi (imza dogru mu, suresi dolmus mu) kontrol eder.
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // Token icindeki kullanici id'sini okur.
    public Long extractUserId(String token) {
        return Long.valueOf(parseClaims(token).getSubject());
    }

    // Token icindeki rol bilgisini okur.
    public String extractRole(String token) {
        return parseClaims(token).get("role", String.class);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
