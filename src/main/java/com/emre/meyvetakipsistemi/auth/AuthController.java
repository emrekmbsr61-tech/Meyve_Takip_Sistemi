package com.emre.meyvetakipsistemi.auth;

import com.emre.meyvetakipsistemi.auth.dto.LoginRequest;
import com.emre.meyvetakipsistemi.auth.dto.RegisterRequest;
import com.emre.meyvetakipsistemi.auth.dto.ResendVerificationRequest;
import com.emre.meyvetakipsistemi.auth.dto.VerifyEmailRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// Frontend'den gelen login isteğini karşılar.
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:8081")
public class AuthController {

    // Login kontrolünü yapmak için AuthService kullanılır.
    private final AuthService authService;

    // Spring, AuthService nesnesini buradan otomatik verir.
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Login isteğini alır, sonucu frontend'e döner.
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    // Kayıt isteğini alır, sonucu frontend'e döner.
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // E-posta doğrulama isteğini alır, sonucu frontend'e döner.
    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody VerifyEmailRequest request) {
        try {
            return ResponseEntity.ok(authService.verifyEmail(request));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Doğrulama kodunun tekrar gönderilmesi isteğini alır, sonucu frontend'e döner.
    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody ResendVerificationRequest request) {
        try {
            return ResponseEntity.ok(authService.resendVerification(request));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}