package com.emre.meyvetakipsistemi.auth.dto;

import com.emre.meyvetakipsistemi.user.validation.EmailNormalizer;
import lombok.Getter;
import lombok.Setter;

// Doğrulama kodunun tekrar gönderilmesi isteğinde gelen bilgiyi taşır.
@Getter
@Setter
public class ResendVerificationRequest {

    // Yeni kod gönderilecek hesabın e-posta adresidir.
    private String email;

    // Kayıt/doğrulama ile aynı tamamlama uygulanır (bkz. EmailNormalizer).
    public void setEmail(String email) {
        this.email = EmailNormalizer.normalize(email);
    }
}
