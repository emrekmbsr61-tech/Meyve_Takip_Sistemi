package com.emre.meyvetakipsistemi.auth.dto;

import com.emre.meyvetakipsistemi.user.validation.EmailNormalizer;
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

    /*
      Kayıt sırasındakiyle AYNI tamamlama uygulanır (bkz. EmailNormalizer).
      Kullanıcı "emre" yazarak kaydolduysa veritabanında "emre@gmail.com" durur;
      doğrulama ekranında yine "emre" yazdığında hesabın bulunabilmesi için
      adresin burada da aynı şekilde tamamlanması gerekir.
    */
    public void setEmail(String email) {
        this.email = EmailNormalizer.normalize(email);
    }
}
