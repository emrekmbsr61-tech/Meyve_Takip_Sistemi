package com.emre.meyvetakipsistemi.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/*
  Bir hata oluştuğunda frontend'e DAİMA bu biçimde JSON döner.
  Böylece hangi endpoint olursa olsun hata cevabının şekli aynıdır ve
  frontend tek bir yerde (httpClient.js) okuyabilir.

  Örnek:
  {
    "timestamp": "2026-08-17T14:03:11",
    "status": 400,
    "error": "Gecersiz istek",
    "message": "Geçerli bir miktar girilmelidir",
    "path": "/api/need-lists/plan"
  }
*/
@Getter
@AllArgsConstructor
public class ErrorResponse {

    // Hatanın oluştuğu zaman.
    private LocalDateTime timestamp;

    // HTTP durum kodu (400, 401, 403, 404, 500 ...).
    private int status;

    // Durum kodunun kısa adı.
    private String error;

    // Kullanıcıya gösterilebilecek sade Türkçe açıklama.
    private String message;

    // İsteğin gittiği adres.
    private String path;
}
