package com.emre.meyvetakipsistemi.auth.dto;

import lombok.Getter;
import lombok.Setter;

// Frontend'den kayıt (register) için gelen bilgileri taşır.
// Dikkat: burada bilinçli olarak "role" alanı yoktur, rol backend tarafından atanır.
@Getter
@Setter
public class RegisterRequest {

    // Kullanıcının ad soyad bilgisidir.
    private String fullName;

    // Kullanıcının giriş yaparken kullanacağı kullanıcı adıdır.
    private String username;

    // Kullanıcının e-posta adresidir.
    private String email;

    // Kullanıcının belirlediği şifredir.
    private String password;

    // Şifrenin tekrar girilmiş halidir, password ile eşleşmesi kontrol edilir.
    private String passwordRepeat;
}
