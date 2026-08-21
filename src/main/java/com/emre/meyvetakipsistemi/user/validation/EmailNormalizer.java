package com.emre.meyvetakipsistemi.user.validation;

/*
  Kullanıcının yazdığı e-posta metnini, kaydedilmeden önce tam adrese çevirir.

  Amaç: kullanıcı her seferinde "@gmail.com" yazmak zorunda kalmasın. Sadece
  "emre" yazması yeterlidir; sistem bunu "emre@gmail.com" olarak tamamlar.
  Zaten "@" içeren bir adres yazdıysa ona hiç dokunulmaz.

  Nerede çalışır: E-posta taşıyan isteklerin (RegisterRequest, VerifyEmailRequest,
  ResendVerificationRequest) setEmail metotlarında. Böylece tamamlama, DOĞRULAMA
  ÇALIŞMADAN ÖNCE yapılır - aksi halde @Email anotasyonu "emre" değerini görür
  ve isteği daha en başta reddederdi.

  Neden üç isteğin hepsinde: Kullanıcı kayıt olurken "emre" yazıp veritabanına
  "emre@gmail.com" olarak kaydedilirse, doğrulama ekranında yine "emre" yazdığında
  sistem onu bulamazdı. Aynı kural her yerde uygulanınca bu tutarsızlık oluşmaz.
*/
public final class EmailNormalizer {

    /*
      Adreste "@" yoksa sonuna eklenecek alan adı.
      Kurum farklı bir alan adı kullanacaksa değiştirilmesi gereken tek yer burasıdır.
    */
    private static final String DEFAULT_DOMAIN = "gmail.com";

    // Bu sınıftan nesne üretilmesi anlamsız olduğu için kurucu gizlenir.
    private EmailNormalizer() {
    }

    public static String normalize(String email) {
        if (email == null) {
            return null;
        }

        String trimmed = email.trim();

        /*
          Boş bırakılmışsa dokunulmaz: "alan boş olamaz" kararını @NotBlank verir.
          Burada boşluğa alan adı eklersek, boş alan sessizce "@gmail.com" gibi
          geçerli görünen anlamsız bir değere dönüşürdü.
        */
        if (trimmed.isEmpty()) {
            return trimmed;
        }

        // Kullanıcı zaten tam adres yazmışsa olduğu gibi bırakılır.
        if (trimmed.contains("@")) {
            return trimmed;
        }

        return trimmed + "@" + DEFAULT_DOMAIN;
    }
}
