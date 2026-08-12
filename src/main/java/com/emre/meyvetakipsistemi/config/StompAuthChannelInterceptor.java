package com.emre.meyvetakipsistemi.config;

import com.emre.meyvetakipsistemi.auth.JwtService;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

/*
  Her STOMP mesajı backend'e ulaşmadan önce buradan geçer. Bizim tek
  ilgilendiğimiz an, bağlantının İLK kurulduğu CONNECT anıdır - istemci bu
  sırada Authorization header'ında JWT token'ı gönderir (bkz. frontend
  websocketService.js). Token doğrulaması, HTTP tarafında zaten var olan
  JwtService ile yapılır - yeni bir doğrulama mantığı yazılmaz.

  Token geçerli değilse bağlantı reddedilir (exception fırlatılır); geçerliyse
  hiçbir şey yapılmasına gerek yok, çünkü bu projede bildirimler zaten
  /topic/notifications/{userId} adresine, doğru userId bilinerek gönderiliyor -
  WebSocket katmanında ayrıca "bu kullanıcı kim" bilgisini saklamaya gerek yok.
*/
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtService jwtService;

    public StompAuthChannelInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            String token = (authHeader != null && authHeader.startsWith("Bearer "))
                    ? authHeader.substring(7)
                    : null;

            if (token == null || !jwtService.isTokenValid(token)) {
                throw new IllegalArgumentException("Gecersiz veya eksik token - WebSocket baglantisi reddedildi");
            }
        }

        return message;
    }
}
