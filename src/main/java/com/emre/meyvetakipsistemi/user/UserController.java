package com.emre.meyvetakipsistemi.user;

import com.emre.meyvetakipsistemi.user.dto.AssignRoleRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
    @Autowired
    private UserService userService;

    @PostMapping
    public User createUser(@RequestBody User user) {
        return userService.createUser(user);
    }

    @GetMapping
    public List<User> getAllUsers(){
        return userService.getAllUsers();
    }

    // Dikkat: "/pending" sabit yolu, Spring tarafından "/{id}" ile çakışmadan
    // önce eşleşir; bu yüzden "pending" bir id olarak yorumlanmaz.
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingUsers(@RequestParam Long adminId) {
        try {
            return ResponseEntity.ok(userService.getPendingUsers(adminId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public User getUserById(@PathVariable Long id)
    {        //urldeki id değerini alır
        return userService.getUserById(id);
    }

    // ADMIN, onay bekleyen (veya herhangi bir) kullanıcıya rol atar.
    @PutMapping("/{id}/role")
    public ResponseEntity<?> assignRole(@PathVariable Long id, @RequestBody AssignRoleRequest request) {
        try {
            return ResponseEntity.ok(userService.assignRole(request.getAdminId(), id, request.getRole()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

}
