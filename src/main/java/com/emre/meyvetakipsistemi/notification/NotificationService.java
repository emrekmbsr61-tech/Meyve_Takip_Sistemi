package com.emre.meyvetakipsistemi.notification;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/*
  Sistemde bir olay olduğunda (yeni ihtiyaç, yeni görev, teslimat/kabul
  tamamlandı gibi) ilgili TEK kullanıcıya WebSocket üzerinden gerçek zamanlı
  bildirim göndermek için kullanılan tek, merkezi servistir. Diğer servisler
  (NeedListService, PurchaseService, TaskAssignmentService, AcceptanceService)
  bir işlemi bitirdiklerinde bu servisi çağırır.

  Her kullanıcının kendi özel adresi vardır: /topic/notifications/{userId}.
  Frontend, login olduktan sonra SADECE kendi userId'sine ait bu adrese
  abone olur (bkz. frontend websocketService.js).
*/
@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public NotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /*
      type: frontend'in "hangi ekranı yeniden çekeceğine" karar vermesi için
      kısa bir etiket (örn. "ALIM_GOREVI_ATANDI").
      message: kullanıcıya gösterilebilecek sade Türkçe metin.
    */
    public void notifyUser(Long userId, String type, String message) {
        messagingTemplate.convertAndSend(
                "/topic/notifications/" + userId,
                Map.of("type", type, "message", message)
        );
    }
}
