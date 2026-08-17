package com.emre.meyvetakipsistemi.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

/*
  Uygulamanın TEK merkezi hata yakalayıcısıdır.

  Herhangi bir Controller veya Service'ten dışarı sızan hata buraya düşer ve
  frontend'e her zaman aynı biçimde (ErrorResponse) JSON olarak döner. Böylece:
    - Controller'larda tek tek try/catch yazmaya gerek kalmaz,
    - Kullanıcı Spring'in ham hata sayfasını ve stack trace'i asla görmez,
    - Frontend hata mesajını tek bir yerden okuyabilir (httpClient.js).

  Not: Servislerin çoğu iş kuralı hatalarını düz RuntimeException olarak
  fırlatıyor. Bu yüzden RuntimeException 400 (Gecersiz istek) kabul edilir -
  daha önce controller'ların tek tek yaptığı davranışla aynıdır. Gerçek bir
  beklenmedik hata (NullPointer gibi) ise en alttaki Exception yakalayıcısına
  düşer ve 500 döner.
*/
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Kayıt bulunamadı -> 404
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            ResourceNotFoundException exception, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, "Kayit bulunamadi", exception.getMessage(), request);
    }

    // Hatalı giriş bilgisi -> 401
    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleInvalidCredentials(
            InvalidCredentialsException exception, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, "Kimlik dogrulanamadi", exception.getMessage(), request);
    }

    // Yetkisiz işlem -> 403
    @ExceptionHandler({UnauthorizedActionException.class, AccessDeniedException.class})
    public ResponseEntity<ErrorResponse> handleForbidden(
            RuntimeException exception, HttpServletRequest request) {
        return build(HttpStatus.FORBIDDEN, "Yetkisiz islem",
                exception.getMessage() == null ? "Bu işlem için yetkiniz yok." : exception.getMessage(),
                request);
    }

    /*
      @Valid ile işaretlenmiş DTO'daki doğrulama hataları -> 400.
      Birden fazla alan hatalıysa hepsi tek mesajda birleştirilir.
    */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException exception, HttpServletRequest request) {

        String message = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getDefaultMessage())
                .collect(Collectors.joining(" "));

        return build(HttpStatus.BAD_REQUEST, "Gecersiz istek",
                message.isBlank() ? "Gönderilen bilgiler geçersiz." : message, request);
    }

    // Geçersiz parametre / iş kuralı ihlali -> 400
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException exception, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Gecersiz istek", exception.getMessage(), request);
    }

    // Servislerdeki iş kuralı hataları (düz RuntimeException) -> 400
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntime(
            RuntimeException exception, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, "Gecersiz istek",
                exception.getMessage() == null ? "İşlem tamamlanamadı." : exception.getMessage(),
                request);
    }

    // Beklenmedik her şey -> 500. Hatanın teknik detayı kullanıcıya gösterilmez.
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(
            Exception exception, HttpServletRequest request) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Sunucu hatasi",
                "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.", request);
    }

    // Tüm yakalayıcıların ortak kullandığı cevap üreticisi.
    private ResponseEntity<ErrorResponse> build(
            HttpStatus status, String error, String message, HttpServletRequest request) {

        ErrorResponse body = new ErrorResponse(
                LocalDateTime.now(),
                status.value(),
                error,
                message,
                request.getRequestURI()
        );

        return ResponseEntity.status(status).body(body);
    }
}
