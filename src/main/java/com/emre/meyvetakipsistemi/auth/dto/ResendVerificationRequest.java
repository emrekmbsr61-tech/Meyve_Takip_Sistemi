package com.emre.meyvetakipsistemi.auth.dto;

import lombok.Getter;
import lombok.Setter;

// Doğrulama kodunun tekrar gönderilmesi isteğinde gelen bilgiyi taşır.
@Getter
@Setter
public class ResendVerificationRequest {

    // Yeni kod gönderilecek hesabın e-posta adresidir.
    private String email;
}
