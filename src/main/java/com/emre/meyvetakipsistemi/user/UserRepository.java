package com.emre.meyvetakipsistemi.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
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

    // Onay bekleyen kullanıcıları (PENDING rolündekileri) listelemek için kullanılır.
    List<User> findByRole(UserRole role);

    /*
      Admin onay ekranında, yalnızca e-posta doğrulamasını TAMAMLAMIŞ PENDING
      kullanıcıları göstermek için kullanılır. Henüz doğrulama kodunu girmemiş
      bir kullanıcı, doğrulanana kadar bu listeye hiç düşmemelidir (bkz.
      UserService.getPendingUsers).
    */
    List<User> findByRoleAndIsVerifiedTrue(UserRole role);

    /*
      Belirli bir roldeki, id'si en küçük kullanıcıyı bulur.
      Purchase tamamlanınca TOPLAMA görevi atanacak SOFOR'u seçmek için kullanılır:
      birden fazla SOFOR varsa, görev ataması geçici olarak deterministik şekilde
      id'si en küçük olana yapılır (bkz. PurchaseService).
    */
    Optional<User> findFirstByRoleOrderByIdAsc(UserRole role);

}
