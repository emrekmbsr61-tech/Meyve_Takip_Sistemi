package com.emre.meyvetakipsistemi.user.validation;

import com.emre.meyvetakipsistemi.user.UserRepository;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/*
  @UniqueUsername kuralının gerçek kontrolünü yapan sınıftır.
  UniqueEmailValidator ile birebir aynı mantığı izler (bkz. oradaki açıklamalar).
*/
public class UniqueUsernameValidator implements ConstraintValidator<UniqueUsername, String> {

    private final UserRepository userRepository;

    public UniqueUsernameValidator(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public boolean isValid(String username, ConstraintValidatorContext context) {
        // Boşluk kontrolü @NotBlank'in işidir; burada hata sayılmaz.
        if (username == null || username.isBlank()) {
            return true;
        }

        return !userRepository.existsByUsernameIgnoreCase(username.trim());
    }
}
