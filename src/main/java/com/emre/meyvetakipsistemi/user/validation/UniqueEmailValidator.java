package com.emre.meyvetakipsistemi.user.validation;

import com.emre.meyvetakipsistemi.user.UserRepository;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/*
  @UniqueEmail kuralının gerçek kontrolünü yapan sınıftır.
  Spring, UserRepository'yi buraya otomatik verir (constructor injection).
*/
public class UniqueEmailValidator implements ConstraintValidator<UniqueEmail, String> {

    private final UserRepository userRepository;

    public UniqueEmailValidator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean isValid(String email, ConstraintValidatorContext context) {
        /*
          NULL/BOŞ DEĞER BURADA HATA SAYILMAZ.

          Sebebi: "alan boş bırakılamaz" kuralı @NotBlank'in işidir. Burada da
          boşluğu hata saymak, kullanıcı alanı boş bıraktığında iki ayrı hata
          mesajı görmesine yol açar ("E-posta boş olamaz" + "Bu e-posta zaten
          kullanılıyor"). Her kural yalnızca kendi işine bakar.
        */
        if (email == null || email.isBlank()) {
            return true;
        }

        /*
          existsBy... kullanılır, findBy... DEĞİL: burada kaydın kendisine
          ihtiyaç yok, yalnızca "var mı yok mu" bilgisine ihtiyaç var. Bu,
          veritabanından gereksiz veri çekilmesini önler.

          IgnoreCase: "Emre@mail.com" ile "emre@mail.com" aynı adrestir; büyük
          küçük harf farkıyla aynı e-postadan ikinci bir hesap açılamamalıdır.
        */
        return !userRepository.existsByEmailIgnoreCase(email.trim());
    }
}
