package com.emre.meyvetakipsistemi.user;

import com.emre.meyvetakipsistemi.exception.ResourceNotFoundException;
import com.emre.meyvetakipsistemi.user.dto.UserResponse;
import org.springframework.beans.factory.annotation.Autowired;
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

    /*
      User entity'sini dışarı açılabilecek güvenli hale çevirir.
      Şifre alanı buraya HİÇBİR ZAMAN taşınmaz (bkz. UserResponse).
    */
    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getIsVerified()
        );
    }

    /*
      Onay bekleyen (PENDING rolündeki) kullanıcıları listeler. Yalnızca ADMIN çağırabilir.
      Yalnızca isVerified=true olanlar döner: e-posta doğrulamasını henüz
      tamamlamamış bir kullanıcı, kod girmeden bu listeye düşmemelidir.
    */
    public List<UserResponse> getPendingUsers(Long adminId) {
        requireAdmin(adminId);
        return userRepository.findByRoleAndIsVerifiedTrue(UserRole.PENDING)
                .stream().map(this::toResponse).toList();
    }

    /*
      Bir kullanıcıya mevcut UserRole enum'undaki rollerden birini atar.
      Yalnızca ADMIN çağırabilir. PENDING rolü tekrar atanamaz (bu bir "onay"
      işlemidir, kullanıcıyı tekrar bekleme durumuna düşürmek anlamsızdır).
    */
    public UserResponse assignRole(Long adminId, Long targetUserId, String roleName) {
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
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        targetUser.setRole(newRole);

        return toResponse(userRepository.save(targetUser));
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
