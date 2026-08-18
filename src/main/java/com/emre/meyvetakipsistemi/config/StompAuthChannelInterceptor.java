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

import java.util.Map;

/*
  Her STOMP mesajı backend'e ulaşmadan önce buradan geçer. İki noktada kontrol
  yapılır:

  1) CONNECT (bağlantı kurulurken):
     İstemci Authorization header'ında JWT token gönderir. Token geçersizse
     bağlantı reddedilir. Geçerliyse token'daki kullanıcı id'si oturuma yazılır.

  2) SUBSCRIBE (bir adrese abone olurken):
     Kullanıcının YALNIZCA KENDİ bildirim adresini dinleyebildiği doğrulanır.

  2. maddenin sebebi gerçek bir güvenlik açığıydı: önceden yalnızca token'ın
  geçerliliğine bakılıyor, abone olunan adres kontrol edilmiyordu. Bu yüzden
  giriş yapmış herhangi bir kullanıcı /topic/notifications/8 gibi BAŞKASININ
  adresine abone olup onun bildirimlerini okuyabiliyordu (test sırasında
  bizzat denenip doğrulandı).
*/
@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    // Bildirim adreslerinin ortak ön eki: /topic/notifications/{userId}
    private static final String NOTIFICATION_PREFIX = "/topic/notifications/";

    // Oturumda kullanıcı id'sinin saklandığı anahtar.
    private static final String USER_ID_KEY = "userId";

    private final JwtService jwtService;

    public StompAuthChannelInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            handleConnect(accessor);
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            handleSubscribe(accessor);
        }

        return message;
    }

    // Bağlantı anında token doğrulanır ve kullanıcı id'si oturuma yazılır.
    private void handleConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");

        String token = (authHeader != null && authHeader.startsWith("Bearer "))
                ? authHeader.substring(7)
                : null;

        if (token == null || !jwtService.isTokenValid(token)) {
            throw new IllegalArgumentException("Gecersiz veya eksik token - WebSocket baglantisi reddedildi");
        }

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();

        if (sessionAttributes != null) {
            sessionAttributes.put(USER_ID_KEY, jwtService.extractUserId(token));
        }
    }

    /*
      Abone olunmak istenen adres bir bildirim adresiyse, adresteki kullanıcı
      id'si ile bağlantıyı kuran kullanıcının id'si aynı olmak zorundadır.
      Bildirim dışındaki adresler bu kontrolün dışındadır.
    */
    private void handleSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();

        if (destination == null || !destination.startsWith(NOTIFICATION_PREFIX)) {
            return;
        }

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        Object sessionUserId = sessionAttributes == null ? null : sessionAttributes.get(USER_ID_KEY);

        if (sessionUserId == null) {
            throw new IllegalArgumentException("Kimlik dogrulanmadan abone olunamaz");
        }

        String requestedUserId = destination.substring(NOTIFICATION_PREFIX.length());

        if (!String.valueOf(sessionUserId).equals(requestedUserId)) {
            throw new IllegalArgumentException("Baskasinin bildirimlerine abone olunamaz");
        }
    }
}
