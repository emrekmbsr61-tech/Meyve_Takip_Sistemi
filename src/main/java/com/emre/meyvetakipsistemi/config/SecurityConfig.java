package com.emre.meyvetakipsistemi.config;

import com.emre.meyvetakipsistemi.auth.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/*
  Hangi API adreslerinin token gerektirmeden (public), hangilerinin gecerli
  bir JWT token gerektirerek (authenticated) calisacagini burada tanimlariz.

  /api/auth/** herkese acik kalir (login/register/verify-email icin token
  henuz yoktur, o yuzden bu adreslere erismek icin token istenemez).
  Diger TUM endpoint'ler artik gecerli bir token ister (Faz 1: sadece
  "giris yapilmis mi" kontrolu - mevcut rol kontrolleri Service katmaninda
  oldugu gibi kaliyor, buraya dokunulmadi).
*/
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                /*
                  Varsayilan davranista token eksik/gecersiz oldugunda Spring
                  Security 403 doner; token tabanli bir API icin 401 (Unauthorized)
                  daha dogru anlam tasir ("kimligini dogrulaman lazim"), bu yuzden
                  ozel olarak 401'e ceviriyoruz.
                */
                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                        (request, response, authException) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Gecerli bir token gerekli")
                ))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/auth/**",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/ws/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /*
      Spring Security devreye girince Controller'lardaki tekil @CrossOrigin
      anotasyonlari artik yeterli olmuyor (Security filter'i istekleri once
      kendisi karsiliyor); bu yuzden CORS ayari merkezi olarak burada
      yapiliyor. Mevcut @CrossOrigin anotasyonlari dosyalarda kalabilir,
      artik etkisizler ama zarar da vermiyorlar.
    */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
