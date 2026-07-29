package com.emre.meyvetakipsistemi.verification;

import com.emre.meyvetakipsistemi.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/*
 * EmailVerificationCode kayıtları ile veritabanı işlemlerini yapar.
 */
public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, Long> {

    // Kullanıcının henüz kullanılmamış (aktif) kodlarını bulur.
    // Yeni kod üretilirken bu kodlar "used=true" yapılarak geçersiz kılınır.
    List<EmailVerificationCode> findByUserAndUsedFalse(User user);

    // Kullanıcının girdiği kodu, en son oluşturulan kayıttan başlayarak bulur.
    Optional<EmailVerificationCode> findFirstByUserAndCodeOrderByCreatedAtDesc(User user, String code);

    // Kullanıcının daha önce hiç doğrulama kodu alıp almadığını kontrol eder.
    // Bu bilgi, e-posta doğrulama özelliğinden önce kayıt olmuş eski kullanıcıları
    // yeni kayıt olan kullanıcılardan ayırt etmek için login kontrolünde kullanılır.
    boolean existsByUser(User user);
}
