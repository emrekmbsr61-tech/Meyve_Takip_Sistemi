package com.emre.meyvetakipsistemi.auth;

import com.emre.meyvetakipsistemi.exception.UnauthorizedActionException;
import com.emre.meyvetakipsistemi.user.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/*
  İSTEĞİ GERÇEKTEN KİMİN YAPTIĞINI söyleyen tek güvenilir kaynaktır.

  Neden gerekli: Servislerin çoğu kullanıcı kimliğini isteğin İÇİNDEN
  (ör. ?userId=5 veya request body'deki createdBy) okuyor. Bu bilgi
  istemciden geldiği için kullanıcı onu değiştirebilir - yani başkasının
  kimliğiyle işlem yapabilir. Buradaki metotlar ise kimliği, imzası backend
  tarafından doğrulanmış JWT token'dan okur (bkz. JwtAuthenticationFilter,
  kullanıcı id'sini principal olarak, rolü de ROLE_<rol> yetkisi olarak koyar).

  Kural: Bir kaydın sahibini doğrulaman gerekiyorsa istekteki id'ye DEĞİL,
  buradaki getCurrentUserId() sonucuna güven.
*/
@Service
public class CurrentUserService {

    // Giriş yapmış kullanıcının id'sini döner; kimlik yoksa hata fırlatır.
    public Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new UnauthorizedActionException("Bu işlem için giriş yapmalısınız.");
        }

        return userId;
    }

    // Giriş yapmış kullanıcı ADMIN mi?
    public boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            return false;
        }

        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (authority.getAuthority().equals("ROLE_" + UserRole.ADMIN.name())) {
                return true;
            }
        }

        return false;
    }

    /*
      Bir kaydı yalnızca sahibinin veya ADMIN'in değiştirebileceğini garanti eder.
      Şartnamedeki kural: "Sadece kendi oluşturduğu kaydı güncelleyebilir (ADMIN hariç)."
    */
    public void requireOwnerOrAdmin(Long ownerId, String message) {
        if (isAdmin()) {
            return;
        }

        if (ownerId == null || !ownerId.equals(getCurrentUserId())) {
            throw new UnauthorizedActionException(message);
        }
    }
}
