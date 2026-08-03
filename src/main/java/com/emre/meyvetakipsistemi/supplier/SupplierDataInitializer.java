package com.emre.meyvetakipsistemi.supplier;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/*
  Uygulama açılışında suppliers tablosu boşsa başlangıç tedarikçi kayıtlarını
  BİR KEZ ekler (saveAll, yalnızca supplierRepository.count() == 0 iken çalışır).

  Buradaki veri, kullanıcının paylaştığı gerçek tedarikçi listesinden (brokerCode/
  name/phone) dönüştürülmüştür: brokerCode -> supplierCode, name -> supplierName,
  phone -> phone (hepsi null), isActive -> true. Broker.java, BrokerRepository
  veya brokers tablosu OLUŞTURULMADI; tedarikçi bilgisi doğrudan Supplier
  modeline yazılıyor.
*/
@Component
public class SupplierDataInitializer implements CommandLineRunner {

    private final SupplierRepository supplierRepository;

    public SupplierDataInitializer(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    @Override
    public void run(String... args) {
        if (supplierRepository.count() > 0) {
            return;
        }

        supplierRepository.saveAll(List.of(
                buildSupplier("1", "bilal", null),
                buildSupplier("2", "4 kom", null),
                buildSupplier("5", "doğuş", null),
                buildSupplier("7", "mazin oğlu", null),
                buildSupplier("9", "pınar", null),
                buildSupplier("10", "direk", null),
                buildSupplier("13", "yusuf oğulları", null),
                buildSupplier("16", "göktaş", null),
                buildSupplier("18", "aras", null),
                buildSupplier("20", "kara bıyık", null),
                buildSupplier("22", "adil oğulları", null),
                buildSupplier("25", "nuri oğulu", null),
                buildSupplier("26", "ceylan", null),
                buildSupplier("27", "acar kom", null),
                buildSupplier("28", "gençler", null),
                buildSupplier("30", "aytarım", null),
                buildSupplier("31", "yıldız", null),
                buildSupplier("33", "erciyes", null),
                buildSupplier("34", "efsane", null),
                buildSupplier("35", "a.oğulu", null),
                buildSupplier("36", "koçer", null),
                buildSupplier("38", "yeşilcikli hasan", null),
                buildSupplier("40", "aslanlar", null),
                buildSupplier("43", "bahçeci oğlu", null),
                buildSupplier("44", "koçaklar", null),
                buildSupplier("45", "furkan", null),
                buildSupplier("46", "pektaş", null),
                buildSupplier("47", "köy başı", null),
                buildSupplier("48", "toprak", null),
                buildSupplier("49", "kaplan", null),
                buildSupplier("51", "zümrüt", null),
                buildSupplier("53", "piçer", null),
                buildSupplier("54", "kalkan", null),
                buildSupplier("57", "atasoy", null),
                buildSupplier("58", "nasip", null),
                buildSupplier("60", "üçler", null),
                buildSupplier("62", "mert", null),
                buildSupplier("63", "öz kaplan", null),
                buildSupplier("64", "özgür şide", null),
                buildSupplier("65", "ekinci", null),
                buildSupplier("67", "candan", null),
                buildSupplier("70", "ümit öztürk", null),
                buildSupplier("71", "fatih", null),
                buildSupplier("72", "şahin", null),
                buildSupplier("75", "türkmenler", null),
                buildSupplier("77", "altıntop", null),
                buildSupplier("78", "suvay", null),
                buildSupplier("79", "nuh ağızı ballı er", null),
                buildSupplier("80", "bahçecigil", null),
                buildSupplier("83", "çerkezoğlu", null),
                buildSupplier("84", "okaytu", null),
                buildSupplier("86", "taşanlıgil", null),
                buildSupplier("88", "aktaş", null),
                buildSupplier("90", "diriliş", null),
                buildSupplier("92", "kardeşler", null),
                buildSupplier("93", "öztaş", null),
                buildSupplier("97", "güneş", null),
                buildSupplier("99", "kent", null),
                buildSupplier("101", "bilgiler", null),
                buildSupplier("103", "ekrenler", null),
                buildSupplier("104", "ergin", null),
                buildSupplier("105", "reisler", null),
                buildSupplier("106", "artıranlar(ATEŞ)", null),
                buildSupplier("108", "ELSA", null),
                buildSupplier("110", "TEKE", null),
                buildSupplier("112", "KAVCU", null),
                buildSupplier("114", "PALTA", null),
                buildSupplier("115", "NURHAMİ", null),
                buildSupplier("116", "KARAPINAR", null),
                buildSupplier("117", "BERK", null),
                buildSupplier("118", "TEKİN", null)
        ));
    }

    private Supplier buildSupplier(String supplierCode, String supplierName, String phone) {
        Supplier supplier = new Supplier();
        supplier.setSupplierCode(supplierCode);
        supplier.setSupplierName(supplierName);
        supplier.setPhone(phone);
        supplier.setIsActive(true);
        return supplier;
    }
}
