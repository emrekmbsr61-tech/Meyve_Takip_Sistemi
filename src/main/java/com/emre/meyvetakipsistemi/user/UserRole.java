package com.emre.meyvetakipsistemi.user;

/*
    Sistemdeki kullanıcı rollerini temsil eder.
 */
public enum UserRole {
    ADMIN,
    MAGAZA_PERSONELI,
    MAGAZA_MUDURU,
    SOFOR,

    // Kayıt olmuş ama henüz ADMIN tarafından gerçek bir rol atanmamış kullanıcı.
    // Bu roldeyken giriş yapılamaz.
    PENDING
}
