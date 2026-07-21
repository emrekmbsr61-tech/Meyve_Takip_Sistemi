package com.emre.meyvetakipsistemi.auth;

import com.emre.meyvetakipsistemi.auth.dto.LoginRequest;
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
}