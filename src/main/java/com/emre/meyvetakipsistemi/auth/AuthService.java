package com.emre.meyvetakipsistemi.auth;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.auth.dto.LoginRequest;
import com.emre.meyvetakipsistemi.auth.dto.LoginResponse;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

// Login işleminin kontrolünü yapan servis sınıfıdır.
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    // Spring gerekli nesneleri buradan otomatik verir.
    public AuthService(
            UserRepository userRepository,
            AuditLogService auditLogService
    ) {
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    // Kullanıcı adı ve şifreyi kontrol eder.
    public LoginResponse login(LoginRequest request) {

        Optional<User> optionalUser = userRepository.findByUsername(request.getUsername());

        if (optionalUser.isEmpty()) {
            auditLogService.createLog(
                    null,
                    request.getUsername(),
                    AuditActionType.USER_LOGIN_FAILED,
                    "User",
                    null,
                    request.getUsername() + " kullanıcı adı ile giriş başarısız oldu. Kullanıcı bulunamadı."
            );

            throw new RuntimeException("Kullanıcı bulunamadı");
        }

        User user = optionalUser.get();

        if (!user.getPassword().equals(request.getPassword())) {
            auditLogService.createLog(
                    user.getId(),
                    user.getFullName(),
                    AuditActionType.USER_LOGIN_FAILED,
                    "User",
                    user.getId(),
                    user.getFullName() + " giriş yapamadı. Şifre hatalı."
            );

            throw new RuntimeException("Şifre hatalı");
        }

        //login başarılıysa sisteme girilir
        auditLogService.createLog(
                user.getId(),
                user.getFullName(),
                AuditActionType.USER_LOGIN,
                "User",
                user.getId(),
                user.getFullName() + " sisteme giriş yaptı."
        );

        //kullanıcı bilgilerini frontende gönder
        return new LoginResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole().name()
        );
    }
}