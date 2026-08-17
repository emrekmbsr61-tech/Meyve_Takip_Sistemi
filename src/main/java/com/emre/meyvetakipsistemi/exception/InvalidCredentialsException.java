package com.emre.meyvetakipsistemi.exception;

/*
  Giriş bilgileri hatalı olduğunda fırlatılır (kullanıcı adı/şifre yanlış,
  hesap doğrulanmamış vb.). GlobalExceptionHandler bunu 401 UNAUTHORIZED
  olarak cevaplar - "kimliğini doğrulaman lazım" anlamındadır.
*/
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }
}
