package com.emre.meyvetakipsistemi.exception;

/*
  Aranan kayıt bulunamadığında fırlatılır (kullanıcı, plan, ürün vb.).
  GlobalExceptionHandler bunu 404 NOT FOUND olarak cevaplar.
*/
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
