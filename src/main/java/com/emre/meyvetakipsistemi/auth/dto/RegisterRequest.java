package com.emre.meyvetakipsistemi.auth.dto;

import com.emre.meyvetakipsistemi.user.validation.EmailNormalizer;
import com.emre.meyvetakipsistemi.user.validation.UniqueEmail;
import com.emre.meyvetakipsistemi.user.validation.UniqueUsername;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/*
  Frontend'den kayıt (register) için gelen bilgileri taşır.
  Dikkat: burada bilinçli olarak "role" alanı yoktur, rol backend tarafından atanır.

  Doğrulama kuralları ARTIK BURADA, alanların üstünde durur. Önceden bu
  kontroller AuthService içinde tek tek elle yazılıyordu (if bloklarıyla).
  Anotasyona taşımanın faydası:
    - Kural, ait olduğu alanın yanında görünür; okuyan kişi tek bakışta anlar.
    - İstek Service'e ULAŞMADAN reddedilir.
    - Birden fazla alan hatalıysa hepsi TEK seferde kullanıcıya bildirilir
      (elle yazılan if'ler ilk hatada durur, kullanıcı hataları teker teker görür).
*/
@Getter
@Setter
public class RegisterRequest {

    // Kullanıcının ad soyad bilgisidir.
    @NotBlank(message = "Ad soyad boş olamaz")
    private String fullName;

    /*
      Kullanıcının giriş yaparken kullanacağı kullanıcı adıdır.
      @UniqueUsername: aynı kullanıcı adından ikinci bir hesap açılmasını engeller
      (kontrol: user/validation/UniqueUsernameValidator).
    */
    @NotBlank(message = "Kullanıcı adı boş olamaz")
    @Pattern(regexp = "\\S+", message = "Kullanıcı adı boşluk içeremez")
    @UniqueUsername
    private String username;

    /*
      Kullanıcının e-posta adresidir.

      @Email: adresin e-posta biçiminde olup olmadığını Jakarta Validation'ın
      kendisi anlar. Önceden bunun için elle yazılmış katı bir düzenli ifade
      (regex) vardı ve ".com" gibi bir uzantıyı ZORUNLU tutuyordu; kurum içi
      adresler gibi geçerli biçimleri gereksiz yere reddediyordu. Standart
      anotasyon bu işi hem daha doğru hem de bakım gerektirmeden yapar.

      @UniqueEmail: aynı e-postadan ikinci bir hesap açılmasını engeller
      (kontrol: user/validation/UniqueEmailValidator).
    */
    @NotBlank(message = "E-posta boş olamaz")
    @Email(message = "E-posta adresi geçerli biçimde değil")
    @UniqueEmail
    private String email;

    /*
      Lombok'un ürettiği setter yerine bu metot kullanılır.
      Kullanıcı "@" yazmadan sadece "emre" girdiyse, adres burada tamamlanır
      (bkz. EmailNormalizer). Tamamlama, isteğin JSON'dan okunduğu anda yapılır;
      yani yukarıdaki @Email ve @UniqueEmail kuralları TAMAMLANMIŞ adresi görür.
    */
    public void setEmail(String email) {
        this.email = EmailNormalizer.normalize(email);
    }

    // Kullanıcının belirlediği şifredir.
    @NotBlank(message = "Şifre boş olamaz")
    @Size(min = 6, message = "Şifre en az 6 karakter olmalı")
    private String password;

    /*
      Şifrenin tekrar girilmiş halidir.
      Not: "password ile eşleşiyor mu" kontrolü burada YAPILAMAZ, çünkü anotasyon
      yalnızca kendi alanını görür, komşu alanı göremez. İki alanı karşılaştıran
      bu kural AuthService içinde kalır (bkz. register).
    */
    @NotBlank(message = "Şifre tekrar alanı boş olamaz")
    private String passwordRepeat;
}
