package com.emre.meyvetakipsistemi.auth;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.auth.dto.LoginRequest;
import com.emre.meyvetakipsistemi.auth.dto.LoginResponse;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

// Login işleminin kontrolünü yapan servis sınıfıdır.
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final PasswordEncoder passwordEncoder;

    // Spring gerekli nesneleri buradan otomatik verir.
    public AuthService(
            UserRepository userRepository,
            AuditLogService auditLogService
    ) {
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;

        // Şifreleri güvenli şekilde kontrol etmek ve şifrelemek için kullanılır.
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    // Kullanıcı adı ve şifreyi kontrol eder.
    public LoginResponse login(LoginRequest request) {

        Optional<User> optionalUser =
                userRepository.findByUsername(request.getUsername());

        // Kullanıcı bulunamazsa giriş başarısız olur.
        if (optionalUser.isEmpty()) {
            auditLogService.createLog(
                    null,
                    request.getUsername(),
                    AuditActionType.USER_LOGIN_FAILED,
                    "User",
                    null,
                    request.getUsername()
                            + " kullanıcı adı ile giriş başarısız oldu. Kullanıcı bulunamadı."
            );

            throw new RuntimeException("Kullanıcı bulunamadı");
        }

        User user = optionalUser.get();

        String enteredPassword = request.getPassword();
        String storedPassword = user.getPassword();

        boolean passwordCorrect;

        /*
         * Veritabanındaki şifre BCrypt formatındaysa
         * güvenli BCrypt kontrolü yapılır.
         */
        if (isBcryptPassword(storedPassword)) {
            passwordCorrect =
                    passwordEncoder.matches(enteredPassword, storedPassword);
        } else {
            /*
             * Eski kullanıcıların şifreleri düz metin olabilir.
             * Örneğin veritabanında doğrudan 123456 yazıyor olabilir.
             */
            passwordCorrect =
                    enteredPassword != null
                            && enteredPassword.equals(storedPassword);

            /*
             * Eski düz metin şifre doğruysa şifreyi hemen BCrypt'e çeviririz.
             * Böylece sonraki girişlerde artık güvenli BCrypt kontrolü yapılır.
             */
            if (passwordCorrect) {
                String encodedPassword =
                        passwordEncoder.encode(enteredPassword);

                user.setPassword(encodedPassword);
                userRepository.save(user);
            }
        }

        // Şifre yanlışsa giriş engellenir.
        if (!passwordCorrect) {
            auditLogService.createLog(
                    user.getId(),
                    user.getFullName(),
                    AuditActionType.USER_LOGIN_FAILED,
                    "User",
                    user.getId(),
                    user.getFullName()
                            + " giriş yapamadı. Şifre hatalı."
            );

            throw new RuntimeException("Şifre hatalı");
        }

        // Login başarılıysa sistem hareketi kaydedilir.
        auditLogService.createLog(
                user.getId(),
                user.getFullName(),
                AuditActionType.USER_LOGIN,
                "User",
                user.getId(),
                user.getFullName() + " sisteme giriş yaptı."
        );

        // Kullanıcı bilgilerini frontend'e gönderir.
        // Şifre veya şifre hash'i gönderilmez.
        return new LoginResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole().name()
        );
    }

    /*
     * Veritabanındaki şifrenin BCrypt formatında olup olmadığını kontrol eder.
     * BCrypt şifreler genellikle $2a$, $2b$ veya $2y$ ile başlar.
     */
    private boolean isBcryptPassword(String password) {
        if (password == null) {
            return false;
        }

        return password.startsWith("$2a$")
                || password.startsWith("$2b$")
                || password.startsWith("$2y$");
    }
}