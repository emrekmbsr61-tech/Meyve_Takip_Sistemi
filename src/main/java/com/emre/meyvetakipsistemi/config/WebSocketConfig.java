package com.emre.meyvetakipsistemi.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/*
  WebSocket + STOMP altyapısını kurar.

  - registerStompEndpoints: React Native/Expo istemcisinin bağlanacağı adres:
    /ws. SockJS KULLANILMIYOR - SockJS tarayıcıya özel bir fallback
    kütüphanesidir, React Native'de zaten yerleşik WebSocket kullanılabildiği
    için gerek yok.
  - configureMessageBroker: /topic ile başlayan adreslere gönderilen mesajlar,
    o adrese abone olan istemcilere Spring tarafından otomatik dağıtılır
    (bkz. NotificationService.notifyUser).
  - configureClientInboundChannel: her STOMP mesajının (özellikle CONNECT'in)
    StompAuthChannelInterceptor'dan geçmesini sağlar - token doğrulama burada
    olur.
*/
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    public WebSocketConfig(StompAuthChannelInterceptor stompAuthChannelInterceptor) {
        this.stompAuthChannelInterceptor = stompAuthChannelInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns("*");
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthChannelInterceptor);
    }
}
