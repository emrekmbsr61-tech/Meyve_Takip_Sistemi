package com.emre.meyvetakipsistemi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/*
  @EnableScheduling: arka planda belirli aralıklarla çalışan görevleri açar.
  Şu an tek kullanıcısı OverdueTaskScheduler'dır (süresi geçen görevleri
  otomatik OVERDUE yapar).
*/
@SpringBootApplication
@EnableScheduling
public class MeyveTakipSistemiApplication {

	public static void main(String[] args) {
		SpringApplication.run(MeyveTakipSistemiApplication.class, args);
	}

}
