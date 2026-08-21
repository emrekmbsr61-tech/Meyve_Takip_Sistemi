package com.emre.meyvetakipsistemi.auth;

import com.emre.meyvetakipsistemi.auth.dto.LoginRequest;
import com.emre.meyvetakipsistemi.auth.dto.RegisterRequest;
import com.emre.meyvetakipsistemi.auth.dto.ResendVerificationRequest;
import com.emre.meyvetakipsistemi.auth.dto.VerifyEmailRequest;
import com.emre.meyvetakipsistemi.exception.InvalidCredentialsException;
import jakarta.validation.Valid;
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

    /*
      Login isteğini alır. Buradaki catch hatayı yutmaz; yalnızca "giriş
      başarısız" hatalarının 400 yerine 401 dönmesi için türünü değiştirir.
      Cevabın biçimini yine GlobalExceptionHandler üretir.
    */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (RuntimeException e) {
            throw new InvalidCredentialsException(e.getMessage());
        }
    }

    /*
      Kayıt isteğini alır, sonucu frontend'e döner.

      @Valid ZORUNLUDUR: RegisterRequest üzerindeki doğrulama kuralları
      (@NotBlank, @Email, @UniqueEmail, @UniqueUsername) yalnızca bu anotasyon
      varsa çalıştırılır. Olmasaydı kurallar dosyada yazılı olurdu ama hiçbiri
      devreye girmezdi.
    */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    // E-posta doğrulama isteğini alır, sonucu frontend'e döner.
    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(authService.verifyEmail(request));
    }

    // Doğrulama kodunun tekrar gönderilmesi isteğini alır, sonucu frontend'e döner.
    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody ResendVerificationRequest request) {
        return ResponseEntity.ok(authService.resendVerification(request));
    }
}