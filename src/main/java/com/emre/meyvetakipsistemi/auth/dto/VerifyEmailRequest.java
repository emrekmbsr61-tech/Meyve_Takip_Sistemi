package com.emre.meyvetakipsistemi.auth.dto;

import lombok.Getter;
import lombok.Setter;

// Frontend'den e-posta doğrulama için gelen bilgileri taşır.
@Getter
@Setter
public class VerifyEmailRequest {

    // Doğrulanacak hesabın e-posta adresidir.
    private String email;

    // Kullanıcının e-postasına gönderilen 6 haneli koddur.
    private String code;
}
