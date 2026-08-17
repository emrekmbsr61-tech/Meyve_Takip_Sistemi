package com.emre.meyvetakipsistemi.user;

import com.emre.meyvetakipsistemi.user.dto.AssignRoleRequest;
import com.emre.meyvetakipsistemi.user.dto.UserResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
    @Autowired
    private UserService userService;

    @PostMapping
    public UserResponse createUser(@RequestBody User user) {
        return userService.createUser(user);
    }

    @GetMapping
    public List<UserResponse> getAllUsers(){
        return userService.getAllUsers();
    }

    /*
      Dikkat: "/pending" sabit yolu, Spring tarafından "/{id}" ile çakışmadan
      önce eşleşir; bu yüzden "pending" bir id olarak yorumlanmaz.

      @PreAuthorize: Bu endpoint'e yalnızca ADMIN rolündeki kullanıcı girebilir.
      Rol, isteğin içinden değil doğrulanmış JWT token'dan okunur.
    */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingUsers(@RequestParam Long adminId) {
        return ResponseEntity.ok(userService.getPendingUsers(adminId));
    }

    @GetMapping("/{id}")
    public UserResponse getUserById(@PathVariable Long id)
    {        //urldeki id değerini alır
        return userService.getUserById(id);
    }

    // ADMIN, onay bekleyen (veya herhangi bir) kullanıcıya rol atar.
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}/role")
    public ResponseEntity<?> assignRole(@PathVariable Long id, @RequestBody AssignRoleRequest request) {
        return ResponseEntity.ok(userService.assignRole(request.getAdminId(), id, request.getRole()));
    }

}
