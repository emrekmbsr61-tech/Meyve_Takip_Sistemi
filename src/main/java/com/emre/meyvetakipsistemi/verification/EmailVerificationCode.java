package com.emre.meyvetakipsistemi.verification;

import com.emre.meyvetakipsistemi.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/*
  Kullanıcının e-posta adresini doğrulamak için gönderilen 6 haneli kodu tutar.
  Bir kullanıcının birden fazla kaydı olabilir (eski kodlar "used" alanı true
  yapılarak geçersiz kılınır, silinmez).
*/
@Entity
@Table(name = "email_verification_codes")
@Getter
@Setter
public class EmailVerificationCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Kodun ait olduğu kullanıcı.
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 6 haneli doğrulama kodu (örn: "482913").
    private String code;

    // Kodun geçerlilik süresinin bittiği an (oluşturulduktan 10 dakika sonrası).
    private LocalDateTime expiresAt;

    // Kod bir kere kullanıldıysa veya yeni bir kod üretilerek geçersiz kılındıysa true olur.
    private Boolean used = false;

    private LocalDateTime createdAt = LocalDateTime.now();
}
