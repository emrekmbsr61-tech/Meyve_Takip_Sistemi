package com.emre.meyvetakipsistemi.user.dto;

import com.emre.meyvetakipsistemi.user.UserRole;
import lombok.AllArgsConstructor;
import lombok.Getter;

/*
  Bir kullanıcının dışarı açılabilecek GÜVENLİ bilgilerini taşır.

  ÖNEMLİ: Buraya password (veya şifre hash'i) alanı KESİNLİKLE eklenmemelidir.
  Daha önce User entity'si doğrudan döndürülüyordu ve şifre hash'i API
  cevaplarında dışarı sızıyordu; bu DTO tam olarak bunu engellemek için var.
*/
@Getter
@AllArgsConstructor
public class UserResponse {

    private Long id;

    private String username;

    private String email;

    private String fullName;

    private UserRole role;

    private Boolean isVerified;
}
