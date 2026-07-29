package com.emre.meyvetakipsistemi.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/*
  Kullanıcıya doğrulama kodu içeren e-postayı göndermekten sorumludur.
  Mail sunucusu yapılandırılmamışsa veya gönderim başarısız olursa işlemi
  SESSİZCE yutmaz; çağıran tarafın (AuthService) işlemi geri almasını
  sağlamak için Türkçe mesajlı bir hata fırlatır.
*/
@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    // application.properties -> spring.mail.username/password üzerinden,
    // onlar da MAIL_USERNAME/MAIL_PASSWORD ortam değişkenlerinden okunur.
    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    // Doğrulama kodunu içeren e-postayı gönderir.
    // Başarısız olursa (yapılandırma eksik veya gönderim hatası) RuntimeException fırlatır.
    public void sendVerificationCode(String toEmail, String fullName, String code) {

        if (isBlank(mailUsername) || isBlank(mailPassword)) {
            throw new RuntimeException("E-posta servisi yapılandırılmamış.");
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Meyve Takip Sistemi - E-posta Dogrulama Kodu");
            message.setText(
                    "Merhaba " + fullName + ",\n\n"
                            + "Meyve Takip Sistemi hesabinizi dogrulamak icin kodunuz: " + code + "\n"
                            + "Bu kod 10 dakika sureyle gecerlidir.\n\n"
                            + "Bu istegi siz yapmadiysaniz bu e-postayi yok sayabilirsiniz."
            );

            mailSender.send(message);
        } catch (MailException e) {
            // Dikkat: doğrulama kodu ve mail şifresi burada kesinlikle loglanmaz,
            // sadece alıcı adresi ve istisna tipi loglanır.
            logger.error(
                    "Dogrulama e-postasi gonderilemedi (alici: {}): {}",
                    toEmail,
                    e.getClass().getSimpleName()
            );

            throw new RuntimeException("Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
