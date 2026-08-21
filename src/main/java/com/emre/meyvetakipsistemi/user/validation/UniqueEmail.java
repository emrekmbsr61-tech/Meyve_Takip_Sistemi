package com.emre.meyvetakipsistemi.user.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/*
  "Bu e-posta sistemde zaten kayıtlı olmasın" kuralını temsil eden özel
  doğrulama anotasyonudur.

  Nasıl çalışır: Bir DTO alanının üstüne @UniqueEmail yazıldığında, istek
  Controller'a ulaştığı anda (@Valid sayesinde) aşağıda belirtilen
  UniqueEmailValidator otomatik olarak çalıştırılır. Böylece "bu e-posta
  alınmış mı" kontrolü Service içinde elle yazılmak zorunda kalmaz.

  @Constraint : bu kuralı hangi sınıfın uygulayacağını söyler.
  @Target     : anotasyonun nereye yazılabileceği (burada: bir alanın üstüne).
  @Retention  : kuralın çalışma zamanında da okunabilir olması gerekir,
                çünkü doğrulama uygulama çalışırken yapılır.
*/
@Constraint(validatedBy = UniqueEmailValidator.class)
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
public @interface UniqueEmail {

    String message() default "Bu e-posta adresi zaten kullanılıyor";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
