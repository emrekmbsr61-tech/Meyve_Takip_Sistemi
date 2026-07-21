/*
    Username var mı, şifre dogru mu, giriş başarılı mı
*/
package com.emre.meyvetakipsistemi.auth;

import com.emre.meyvetakipsistemi.auth.dto.LoginRequest;
import com.emre.meyvetakipsistemi.auth.dto.LoginResponse;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import org.springframework.stereotype.Service;

// Login işleminin kontrolünü yapan servis sınıfıdır.
@Service
public class AuthService {

    // Kullanıcıyı veritabanında aramak için kullanılır.
    private final UserRepository userRepository;

    // Spring, UserRepository nesnesini buradan otomatik verir.
    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Kullanıcı adı ve şifreyi kontrol eder.
    public LoginResponse login(LoginRequest request) {

        // Username ile users tablosunda kullanıcı aranır.
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        // Girilen şifre veritabanındaki şifreyle karşılaştırılır.
        if (!user.getPassword().equals(request.getPassword())) {
            throw new RuntimeException("Şifre hatalı");
        }

        // Login başarılıysa frontend'e güvenli kullanıcı bilgisi döner.
        return new LoginResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole().name()
        );
    }
}