package com.emre.meyvetakipsistemi.exception;

/*
  Kullanıcı giriş yapmış ama bu işlemi yapmaya yetkisi yoksa fırlatılır
  (ör. başka birinin kaydını silmeye çalışmak, rolü yetmeyen bir işlem).
  GlobalExceptionHandler bunu 403 FORBIDDEN olarak cevaplar.
*/
public class UnauthorizedActionException extends RuntimeException {

    public UnauthorizedActionException(String message) {
        super(message);
    }
}
