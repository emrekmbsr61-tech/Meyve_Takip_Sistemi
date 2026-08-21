package com.emre.meyvetakipsistemi.user.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/*
  "Bu kullanıcı adı sistemde zaten kayıtlı olmasın" kuralını temsil eden özel
  doğrulama anotasyonudur. @UniqueEmail ile aynı desende çalışır; kontrolü
  aşağıda belirtilen UniqueUsernameValidator yapar.
*/
@Constraint(validatedBy = UniqueUsernameValidator.class)
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
public @interface UniqueUsername {

    String message() default "Bu kullanıcı adı zaten kullanılıyor";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
