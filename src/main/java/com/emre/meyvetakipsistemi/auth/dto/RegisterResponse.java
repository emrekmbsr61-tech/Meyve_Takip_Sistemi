package com.emre.meyvetakipsistemi.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// Kayıt başarılı olunca frontend'e dönecek bilgidir.
// Dikkat: şifre veya şifre hash'i kesinlikle burada bulunmaz.
@Getter
@AllArgsConstructor
public class RegisterResponse {

    // Yeni oluşturulan kullanıcının database id bilgisidir.
    private Long id;

    // Kullanıcının ad soyad bilgisidir.
    private String fullName;

    // Kullanıcının kullanıcı adıdır.
    private String username;

    // Kullanıcının e-posta adresidir.
    private String email;

    // Kullanıcının sistemdeki rol bilgisidir (backend tarafından atanır).
    private String role;

    // Kullanıcının e-posta doğrulamasının yapılıp yapılmadığı bilgisidir.
    private Boolean isVerified;

    // Frontend'e gösterilecek sonuç mesajıdır.
    private String message;
}
