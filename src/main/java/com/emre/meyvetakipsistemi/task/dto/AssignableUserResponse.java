package com.emre.meyvetakipsistemi.task.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/*
  Müdürün görev atarken seçebileceği tek bir personelin bilgisi.

  Yalnızca seçim listesinde gösterilmesi gereken alanlar taşınır: e-posta,
  kullanıcı adı, doğrulama durumu gibi bilgilerin bu ekranda işi yoktur ve
  dışarı açılmaz.
*/
@Getter
@AllArgsConstructor
public class AssignableUserResponse {

    private Long id;

    private String fullName;

    // Ekranda gösterilecek okunabilir rol adı, örn. "Mağaza Personeli".
    private String roleLabel;
}
