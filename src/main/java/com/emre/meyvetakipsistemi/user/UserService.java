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

    //yeni kullanıcı kaydı oluştuma
    public User createUser(User user){
        user.setPassword(passwordEncoder.encode(user.getPassword()));
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

}
