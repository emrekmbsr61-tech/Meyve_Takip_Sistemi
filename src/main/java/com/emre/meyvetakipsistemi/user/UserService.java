package com.emre.meyvetakipsistemi.user;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;

/*

  UserService, kullanıcı işlemlerine ait iş mantığını içerir
  Kullanıcı kaydedilmeden önce şifre burada hashlenir.

 */

@Service
public class UserService {

    @Autowired
    private UserRepository  userRepository;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    /*
      Yeni kullanıcı kaydı oluşturur.
      Not: /api/auth/register akışıyla aynı güvenlik kuralı burada da uygulanır:
      client "role" alanında ne gönderirse göndersin dikkate alınmaz, her yeni
      kullanıcı ADMIN onayı bekleyen PENDING rolüyle kaydedilir. Aksi halde bu
      eski/ham endpoint, yönetici onay sistemini tamamen atlamak için kullanılabilirdi.
    */
    public User createUser(User user){
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setRole(UserRole.PENDING);
        user.setIsVerified(false);
        return userRepository.save(user);
    }

    //tüm kullanıcıları listeleme
    public List<User>   getAllUsers(){
        return userRepository.findAll();
    }

    //Id değerine göre tek bir kullanıcı getirme
    public  User getUserById(Long id){
        return userRepository.findById(id)
                .orElseThrow();
    }

    /*
      Onay bekleyen (PENDING rolündeki) kullanıcıları listeler. Yalnızca ADMIN çağırabilir.
      Yalnızca isVerified=true olanlar döner: e-posta doğrulamasını henüz
      tamamlamamış bir kullanıcı, kod girmeden bu listeye düşmemelidir.
    */
    public List<User> getPendingUsers(Long adminId) {
        requireAdmin(adminId);
        return userRepository.findByRoleAndIsVerifiedTrue(UserRole.PENDING);
    }

    /*
      Bir kullanıcıya mevcut UserRole enum'undaki rollerden birini atar.
      Yalnızca ADMIN çağırabilir. PENDING rolü tekrar atanamaz (bu bir "onay"
      işlemidir, kullanıcıyı tekrar bekleme durumuna düşürmek anlamsızdır).
    */
    public User assignRole(Long adminId, Long targetUserId, String roleName) {
        requireAdmin(adminId);

        if (roleName == null || roleName.isBlank()) {
            throw new RuntimeException("Rol boş olamaz");
        }

        UserRole newRole;

        try {
            newRole = UserRole.valueOf(roleName.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Geçersiz rol: " + roleName);
        }

        if (newRole == UserRole.PENDING) {
            throw new RuntimeException("Kullanıcıya PENDING rolü atanamaz");
        }

        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        targetUser.setRole(newRole);

        return userRepository.save(targetUser);
    }

    /*
      Çağıranın gerçekten ADMIN olup olmadığını kontrol eder.
      Not: Projede henüz Spring Security/JWT/oturum yapısı olmadığı için kimlik
      doğrulaması, istemcinin gönderdiği adminId üzerinden yapılır. Bu, projenin
      geri kalanındaki (NeedList.createdBy, Acceptance.receivedBy gibi) mevcut
      kimlik yaklaşımıyla aynıdır; gerçek bir @PreAuthorize/JWT koruması değildir.
    */
    private void requireAdmin(Long adminId) {
        if (adminId == null) {
            throw new RuntimeException("Bu işlem için yönetici kimliği gereklidir");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Yönetici bulunamadı"));

        if (admin.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Bu işlem için yönetici yetkisi gereklidir");
        }
    }

}
