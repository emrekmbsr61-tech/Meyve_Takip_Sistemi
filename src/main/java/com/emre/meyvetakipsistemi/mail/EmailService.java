package com.emre.meyvetakipsistemi.mail;

import jakarta.annotation.PostConstruct;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.List;

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

    // Uygulama açılışında mail ayarının eksik olup olmadığını bildirir.
    // Gerçek değerler asla loglanmaz, sadece eksik/dolu bilgisi loglanır.
    // Uygulama başlangıcını engellemez (sadece uyarı loglar).
    @PostConstruct
    private void warnIfMailNotConfigured() {
        if (isBlank(mailUsername) || isBlank(mailPassword)) {
            logger.warn(
                    "MAIL_USERNAME veya MAIL_PASSWORD tanımlı değil. "
                            + "E-posta doğrulama kodları gönderilemeyecek."
            );
        }
    }

    // Doğrulama kodunu içeren e-postayı gönderir.
    // Başarısız olursa (yapılandırma eksik veya gönderim hatası) RuntimeException fırlatır.
    public void sendVerificationCode(String toEmail, String fullName, String code) {

        if (isBlank(mailUsername) || isBlank(mailPassword)) {
            throw new RuntimeException("MAIL_USERNAME veya MAIL_PASSWORD tanımlı değil.");
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

    /*
      HTML biçiminde e-posta gönderir (plan tamamlandığında gönderilen özet
      maili için kullanılır). SimpleMailMessage yalnızca düz metin
      gönderebildiği için burada MimeMessage kullanılır.

      Bu metot HATA FIRLATMAZ: mail gönderilemese bile çağıran işlemin
      (mal kabulün) geri alınmaması gerekir. Sorun yalnızca loglanır ve
      gönderilip gönderilmediği boolean olarak döner.
    */
    public boolean sendHtmlMail(List<String> recipients, String subject, String htmlBody) {
        if (isBlank(mailUsername) || isBlank(mailPassword)) {
            logger.warn("Mail ayarlari eksik oldugu icin ozet maili gonderilemedi.");
            return false;
        }

        if (recipients == null || recipients.isEmpty()) {
            logger.warn("Ozet maili icin gecerli alici adresi bulunamadi.");
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");

            helper.setTo(recipients.toArray(new String[0]));
            helper.setSubject(subject);
            helper.setText(htmlBody, true); // true = icerik HTML'dir

            mailSender.send(message);
            return true;
        } catch (MessagingException | MailException e) {
            logger.error("Ozet maili gonderilemedi: {}", e.getClass().getSimpleName());
            return false;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
