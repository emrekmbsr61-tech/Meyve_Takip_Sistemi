package com.emre.meyvetakipsistemi.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/*
 * UserRepository, users tablosu ile veritabanı işlemlerini yapar.
 * JpaRepository sayesinde save, findAll, findById, delete gibi temel işlemler hazır gelir.

 */

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username); //login için username e gore kullanıcı arama

    // E-posta doğrulama ve yeniden kod gönderme işlemlerinde kullanıcıyı e-posta ile bulmak için kullanılır.
    Optional<User> findByEmailIgnoreCase(String email);

    // Kayıt sırasında büyük/küçük harf farkı gözetmeden benzersizlik kontrolü için kullanılır.
    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);


}
