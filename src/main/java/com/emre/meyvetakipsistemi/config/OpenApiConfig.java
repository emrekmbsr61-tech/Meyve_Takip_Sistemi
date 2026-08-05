package com.emre.meyvetakipsistemi.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/*
  Swagger UI'da görünen başlık/açıklama bilgisini tanımlar. Endpoint'leri
  otomatik olarak springdoc-openapi bulur (bkz. pom.xml'deki
  springdoc-openapi-starter-webmvc-ui bağımlılığı); bu sınıf yalnızca
  dokümantasyonun üst bilgisini (metadata) belirtir, hiçbir endpoint veya
  iş mantığı içermez.
*/
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI meyveTakipSistemiOpenAPI() {
        return new OpenAPI().info(
                new Info()
                        .title("Meyve Takip Sistemi API")
                        .description(
                                "Meyve Takip Sistemi backend REST API dokümantasyonu. "
                                        + "Ana iş akışı: İhtiyaç (NeedList) -> Alım (Purchase) -> "
                                        + "Toplama (Collection) -> Mal Kabul (Acceptance) -> "
                                        + "Plan Sonuç Özeti (PlanSummary)."
                        )
                        .version("0.0.1")
        );
    }
}