package com.emre.meyvetakipsistemi.auth;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.auth.dto.LoginRequest;
import com.emre.meyvetakipsistemi.auth.dto.LoginResponse;
import com.emre.meyvetakipsistemi.auth.dto.RegisterRequest;
import com.emre.meyvetakipsistemi.auth.dto.RegisterResponse;
import com.emre.meyvetakipsistemi.auth.dto.ResendVerificationRequest;
import com.emre.meyvetakipsistemi.auth.dto.VerifyEmailRequest;
import com.emre.meyvetakipsistemi.mail.EmailService;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import com.emre.meyvetakipsistemi.user.UserRole;
import com.emre.meyvetakipsistemi.verification.EmailVerificationCode;
import com.emre.meyvetakipsistemi.verification.EmailVerificationCodeRepository;
import org.jspecify.annotations.NonNull;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

// Login işleminin kontrolünü yapan servis sınıfıdır.
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final EmailVerificationCodeRepository emailVerificationCodeRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    // Doğrulama kodunun kaç dakika geçerli olacağını belirler.
    private static final int VERIFICATION_CODE_VALID_MINUTES = 10;

    // Spring gerekli nesneleri buradan otomatik verir.
    public AuthService(
            UserRepository userRepository,
            AuditLogService auditLogService,
            EmailVerificationCodeRepository emailVerificationCodeRepository,
            EmailService emailService,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
        this.emailVerificationCodeRepository = emailVerificationCodeRepository;
        this.emailService = emailService;
        this.jwtService = jwtService;

        // Şifreleri güvenli şekilde kontrol etmek ve şifrelemek için kullanılır.
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    // Kullanıcı adı ve şifreyi kontrol eder.
    public LoginResponse login(@NonNull LoginRequest request) {

        Optional<User> optionalUser =
                userRepository.findByUsername(request.getUsername());

        // Kullanıcı bulunamazsa giriş başarısız olur.
        if (optionalUser.isEmpty()) {
            auditLogService.createLog(
                    null,
                    request.getUsername(),
                    AuditActionType.USER_LOGIN_FAILED,
                    "User",
                    null,
                    request.getUsername()
                            + " kullanıcı adı ile giriş başarısız oldu. Kullanıcı bulunamadı."
            );

            throw new RuntimeException("Kullanıcı bulunamadı");
        }

        User user = optionalUser.get();

        String enteredPassword = request.getPassword();
        String storedPassword = user.getPassword();

        boolean passwordCorrect;

        /*
         * Veritabanındaki şifre BCrypt formatındaysa
         * güvenli BCrypt kontrolü yapılır.
         */
        if (isBcryptPassword(storedPassword)) {
            passwordCorrect =
                    passwordEncoder.matches(enteredPassword, storedPassword);
        } else {
            /*
             * Eski kullanıcıların şifreleri düz metin olabilir.
             * Örneğin veritabanında doğrudan 123456 yazıyor olabilir.
             */
            passwordCorrect =
                    enteredPassword != null
                            && enteredPassword.equals(storedPassword);

            /*
             * Eski düz metin şifre doğruysa şifreyi hemen BCrypt'e çeviririz.
             * Böylece sonraki girişlerde artık güvenli BCrypt kontrolü yapılır.
             */
            if (passwordCorrect) {
                String encodedPassword =
                        passwordEncoder.encode(enteredPassword);

                user.setPassword(encodedPassword);
                userRepository.save(user);
            }
        }

        // Şifre yanlışsa giriş engellenir.
        if (!passwordCorrect) {
            auditLogService.createLog(
                    user.getId(),
                    user.getFullName(),
                    AuditActionType.USER_LOGIN_FAILED,
                    "User",
                    user.getId(),
                    user.getFullName()
                            + " giriş yapamadı. Şifre hatalı."
            );

            throw new RuntimeException("Şifre hatalı");
        }

        /*
         * Şifre doğru ama hesap henüz e-posta ile doğrulanmamışsa giriş engellenir.
         * Not: Bu kontrol yalnızca doğrulama akışından geçmiş kullanıcılar için uygulanır
         * (yani en az bir EmailVerificationCode kaydı olan kullanıcılar). Bu özellik eklenmeden
         * önce kayıt olmuş eski kullanıcıların hiçbirinde böyle bir kayıt yoktur, bu yüzden
         * onların girişi bu kontrolden etkilenmez ve bozulmaz.
         */
        if (Boolean.FALSE.equals(user.getIsVerified())
                && emailVerificationCodeRepository.existsByUser(user)) {

            auditLogService.createLog(
                    user.getId(),
                    user.getFullName(),
                    AuditActionType.USER_LOGIN_FAILED,
                    "User",
                    user.getId(),
                    user.getFullName() + " giriş yapamadı. E-posta doğrulanmamış."
            );

            throw new RuntimeException("E-posta adresinizi doğrulamanız gerekiyor.");
        }

        /*
         * E-posta doğrulanmış olsa (ya da eski bir kullanıcı olsa) bile, rolü hâlâ
         * PENDING ise ADMIN henüz bu kullanıcıya bir rol atamamış demektir; giriş
         * engellenir. Eski kullanıcıların rolü zaten PENDING olamayacağı için
         * (hepsi ADMIN/MAGAZA_PERSONELI/MAGAZA_MUDURU/SOFOR ile kayıtlı), bu kontrol
         * onları etkilemez.
         */
        if (user.getRole() == UserRole.PENDING) {

            auditLogService.createLog(
                    user.getId(),
                    user.getFullName(),
                    AuditActionType.USER_LOGIN_FAILED,
                    "User",
                    user.getId(),
                    user.getFullName() + " giriş yapamadı. Yönetici onayı bekleniyor."
            );

            throw new RuntimeException("Hesabınız yönetici onayı bekliyor.");
        }

        // Login başarılıysa sistem hareketi kaydedilir.
        auditLogService.createLog(
                user.getId(),
                user.getFullName(),
                AuditActionType.USER_LOGIN,
                "User",
                user.getId(),
                user.getFullName() + " sisteme giriş yaptı."
        );

        String token = jwtService.generateToken(user.getId(), user.getRole().name());

        // Kullanıcı bilgilerini frontend'e gönderir.
        // Şifre veya şifre hash'i gönderilmez.
        return new LoginResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole().name(),
                token
        );
    }

    /*
     * Yeni kullanıcı kaydı oluşturur.
     *
     * Alan doğrulamaları (boş mu, e-posta biçimi doğru mu, kullanıcı adı/e-posta
     * benzersiz mi) ARTIK BURADA DEĞİL, RegisterRequest üzerindeki anotasyonlarda
     * yapılır ve istek bu metoda ulaşmadan reddedilir (bkz. AuthController'daki
     * @Valid). Burada yalnızca anotasyonla ifade EDİLEMEYEN kural kalır: iki
     * alanı birbiriyle karşılaştıran şifre eşleşmesi.
     *
     * @Transactional: doğrulama e-postası gönderilemezse (EmailService hata fırlatırsa)
     * hem User hem de EmailVerificationCode kaydı veritabanına hiç yazılmamış gibi
     * geri alınır (rollback). Böylece mail gitmeyen bir kullanıcı yarım kayıtlı kalmaz.
     */
    @Transactional
    public RegisterResponse register(RegisterRequest request) {

        if (!request.getPassword().equals(request.getPasswordRepeat())) {
            throw new RuntimeException("Şifreler birbiriyle eşleşmiyor");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        /*
         * Rol client'tan gelse bile dikkate alınmaz. Her yeni kayıt PENDING (onay
         * bekliyor) durumunda başlar; gerçek bir operasyonel rol (MAGAZA_PERSONELI,
         * MAGAZA_MUDURU, SOFOR, ADMIN) yalnızca bir ADMIN tarafından, kullanıcı
         * yönetimi ekranından atanabilir. Bkz. UserService.assignRole.
         */
        user.setRole(UserRole.PENDING);

        // Yeni kayıtlarda e-posta doğrulanana kadar isVerified kesin olarak false olur.
        user.setIsVerified(false);

        User savedUser = userRepository.save(user);

        // Kayıt tamamlandıktan sonra e-posta doğrulama kodu üretilip kullanıcıya gönderilir.
        createAndSendVerificationCode(savedUser);

        return new RegisterResponse(
                savedUser.getId(),
                savedUser.getFullName(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getRole().name(),
                savedUser.getIsVerified(),
                "Kayıt başarılı. E-posta adresinize gönderilen doğrulama kodunu giriniz."
        );
    }

    // Kullanıcının e-postasına gönderilen 6 haneli kod ile doğrulama yapar.
    public String verifyEmail(VerifyEmailRequest request) {

        if (isBlank(request.getEmail())) {
            throw new RuntimeException("E-posta boş olamaz");
        }

        if (isBlank(request.getCode())) {
            throw new RuntimeException("Doğrulama kodu boş olamaz");
        }

        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (Boolean.TRUE.equals(user.getIsVerified())) {
            throw new RuntimeException("Bu hesap zaten doğrulanmış");
        }

        EmailVerificationCode verificationCode = emailVerificationCodeRepository
                .findFirstByUserAndCodeOrderByCreatedAtDesc(user, request.getCode())
                .orElseThrow(() -> new RuntimeException("Doğrulama kodu hatalı"));

        if (Boolean.TRUE.equals(verificationCode.getUsed())) {
            throw new RuntimeException("Bu doğrulama kodu zaten kullanılmış");
        }

        if (verificationCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Doğrulama kodunun süresi dolmuş");
        }

        verificationCode.setUsed(true);
        emailVerificationCodeRepository.save(verificationCode);

        user.setIsVerified(true);
        userRepository.save(user);

        return "E-posta adresiniz başarıyla doğrulandı. Giriş yapabilmek için yönetici onayı bekleniyor.";
    }

    /*
     * Kullanıcının doğrulama kodunu kaybetmesi/süresinin dolması durumunda yeni kod gönderir.
     * @Transactional: mail gönderimi başarısız olursa hem eski kodların "used=true"
     * yapılması hem de yeni kod kaydı geri alınır; kullanıcı kullanılamayan bir
     * kod kalabalığıyla veya sahte bir başarı mesajıyla baş başa kalmaz.
     */
    @Transactional
    public String resendVerification(ResendVerificationRequest request) {

        if (isBlank(request.getEmail())) {
            throw new RuntimeException("E-posta boş olamaz");
        }

        User user = userRepository.findByEmailIgnoreCase(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (Boolean.TRUE.equals(user.getIsVerified())) {
            throw new RuntimeException("Bu hesap zaten doğrulanmış");
        }

        invalidateActiveCodes(user);
        createAndSendVerificationCode(user);

        return "Yeni doğrulama kodu e-posta adresinize gönderildi.";
    }

    // Yeni bir 6 haneli kod üretir, kaydeder ve kullanıcıya e-posta ile gönderir.
    private void createAndSendVerificationCode(User user) {

        String code = generateVerificationCode();

        EmailVerificationCode verificationCode = new EmailVerificationCode();
        verificationCode.setUser(user);
        verificationCode.setCode(code);
        verificationCode.setExpiresAt(LocalDateTime.now().plusMinutes(VERIFICATION_CODE_VALID_MINUTES));
        verificationCode.setUsed(false);

        emailVerificationCodeRepository.save(verificationCode);

        emailService.sendVerificationCode(user.getEmail(), user.getFullName(), code);
    }

    // Kullanıcının önceden üretilmiş, henüz kullanılmamış kodlarını geçersiz kılar.
    private void invalidateActiveCodes(User user) {

        List<EmailVerificationCode> activeCodes =
                emailVerificationCodeRepository.findByUserAndUsedFalse(user);

        for (EmailVerificationCode activeCode : activeCodes) {
            activeCode.setUsed(true);
        }

        emailVerificationCodeRepository.saveAll(activeCodes);
    }

    // 100000-999999 arasında rastgele, her zaman 6 haneli bir kod üretir.
    private String generateVerificationCode() {
        int code = new SecureRandom().nextInt(1_000_000);
        return String.format("%06d", code);
    }

    // Bir metin alanının boş veya sadece boşluklardan oluşup oluşmadığını kontrol eder.
    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    /*
     * Veritabanındaki şifrenin BCrypt formatında olup olmadığını kontrol eder.
     * BCrypt şifreler genellikle $2a$, $2b$ veya $2y$ ile başlar.
     */
    private boolean isBcryptPassword(String password) {
        if (password == null) {
            return false;
        }

        return password.startsWith("$2a$")
                || password.startsWith("$2b$")
                || password.startsWith("$2y$");
    }
}