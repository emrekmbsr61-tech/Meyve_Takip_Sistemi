package com.emre.meyvetakipsistemi.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

// Login başarılı olunca frontend'e dönecek kullanıcı bilgisidir.
// Frontend'e User'ın tamamını değil, sadece seçtiğimiz alanları göndermemizi sağlar.
@Getter
@AllArgsConstructor
public class LoginResponse {

    // Kullanıcının database id bilgisidir.
    private Long id;

    // Kullanıcının kullanıcı adıdır.
    private String username;

    // Kullanıcının ad soyad bilgisidir.
    private String fullName;

    // Kullanıcının sistemdeki rol bilgisidir.
    private String role;

    // Giriş sonrası üretilen JWT token'dır. Frontend, sonraki tüm isteklerde
    // bunu "Authorization: Bearer <token>" header'ı olarak göndermelidir.
    private String token;
}