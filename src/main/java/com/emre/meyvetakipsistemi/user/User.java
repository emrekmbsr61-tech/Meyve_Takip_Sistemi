package com.emre.meyvetakipsistemi.user;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/*
  User entity'si sistemdeki kullanıcıları temsil eder.
*/

@Entity
@Table(name= "users" )
@Getter
@Setter

public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)// ID değeri veritabanı tarafından otomatik üretilir.
    private Long id;
    private String username;
    private String email;
    private String password;// İleride UserService içinde hashlenerek kaydedilecek.

    @Enumerated(EnumType.STRING)// Rol bilgisi veritabanına ADMIN, SOFOR gibi yazı olarak kaydedilir.
    private UserRole role;
    private String fullName;
    private Boolean isVerified=false;// Yeni kullanıcı başlangıçta e-posta doğrulanmamış kabul edilir.



}
