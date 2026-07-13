package com.emre.meyvetakipsistemi.user;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

/*

  UserService, kullanıcı işlemlerine ait iş mantığını içerir

 */

@Service
public class UserService {

    @Autowired
    private UserRepository  userRepository;

    //yeni kullanıcı kaydı oluştuma
    public User createUser(User user){
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
