package com.emre.meyvetakipsistemi.mail;

import com.emre.meyvetakipsistemi.acceptance.Acceptance;
import com.emre.meyvetakipsistemi.acceptance.AcceptanceRepository;
import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.auditlog.AuditStatus;
import com.emre.meyvetakipsistemi.collection.Collection;
import com.emre.meyvetakipsistemi.collection.CollectionRepository;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.plansummary.PlanSummaryService;
import com.emre.meyvetakipsistemi.plansummary.dto.PlanSummaryItemResponse;
import com.emre.meyvetakipsistemi.plansummary.dto.PlanSummaryResponse;
import com.emre.meyvetakipsistemi.purchase.Purchase;
import com.emre.meyvetakipsistemi.purchase.PurchaseRepository;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import com.emre.meyvetakipsistemi.user.UserRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/*
  Bir planın son aşaması (Mal Kabul) tamamlandığında, sürecin tamamını özetleyen
  HTML e-postayı hazırlar ve ilgili kişilere gönderir.

  Alıcılar: o planda işlem yapan personeller (ihtiyacı oluşturan, alımı yapan
  müdür, toplamayı yapan şoför, kabulü yapan personel) ve tüm ADMIN'ler.

  Mailin içeriği PlanSummaryService'ten gelir - yani "Sonucu Gör" ekranındaki
  ile BİREBİR aynı veridir, ikinci bir hesaplama yapılmaz.

  Önemli: Bu sınıftaki hiçbir hata mal kabul işlemini geri aldıramaz; gönderim
  başarısız olsa bile yalnızca AuditLog'a not düşülür.
*/
@Service
public class PlanSummaryMailService {

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    private final PlanSummaryService planSummaryService;
    private final NeedListRepository needListRepository;
    private final PurchaseRepository purchaseRepository;
    private final CollectionRepository collectionRepository;
    private final AcceptanceRepository acceptanceRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final AuditLogService auditLogService;

    // Plan özeti mailinin gönderilip gönderilmeyeceği (varsayılan: açık).
    @Value("${meyve.mail.plan-summary.enabled:true}")
    private boolean planSummaryMailEnabled;

    public PlanSummaryMailService(
            PlanSummaryService planSummaryService,
            NeedListRepository needListRepository,
            PurchaseRepository purchaseRepository,
            CollectionRepository collectionRepository,
            AcceptanceRepository acceptanceRepository,
            UserRepository userRepository,
            EmailService emailService,
            AuditLogService auditLogService
    ) {
        this.planSummaryService = planSummaryService;
        this.needListRepository = needListRepository;
        this.purchaseRepository = purchaseRepository;
        this.collectionRepository = collectionRepository;
        this.acceptanceRepository = acceptanceRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.auditLogService = auditLogService;
    }

    // Plan tamamlandığında çağrılır (bkz. AcceptanceService.create).
    public void sendPlanCompletedMail(Long planId, Long triggeredByUserId, String triggeredByName) {
        /*
          Geliştirme sırasında her mal kabulde mail almak rahatsız edici olabilir.
          application.properties'te
              meyve.mail.plan-summary.enabled=false
          yazarak gönderim kapatılabilir; sistemin geri kalanı aynen çalışır.
          Varsayılan açıktır çünkü bu mail şartname gereği zorunludur.
        */
        if (!planSummaryMailEnabled) {
            return;
        }

        try {
            PlanSummaryResponse summary = planSummaryService.buildSummary(planId);
            List<String> recipients = resolveRecipients(planId);

            if (recipients.isEmpty()) {
                return;
            }

            BigDecimal financialLoss = calculateFinancialLoss(planId, summary);
            String html = buildHtml(summary, financialLoss);
            String subject = "Plan #" + planId + " tamamlandi - " + summary.getStoreName();

            boolean sent = emailService.sendHtmlMail(recipients, subject, html);

            auditLogService.createLogSafely(
                    triggeredByUserId,
                    triggeredByName,
                    AuditActionType.ACCEPTANCE_CREATED,
                    "Plan",
                    planId,
                    sent
                            ? "Plan #" + planId + " için özet mail gönderildi (alıcılar: "
                                    + String.join(", ", recipients) + ")."
                            : "Plan #" + planId + " için özet mail GÖNDERİLEMEDİ.",
                    planId,
                    sent ? AuditStatus.SUCCESS : AuditStatus.WARNING,
                    null
            );
        } catch (Exception exception) {
            // Mail hatası hiçbir zaman mal kabulü geri aldırmaz.
            auditLogService.createLogSafely(
                    triggeredByUserId,
                    triggeredByName,
                    AuditActionType.ACCEPTANCE_CREATED,
                    "Plan",
                    planId,
                    "Plan #" + planId + " için özet mail hazırlanamadı.",
                    planId,
                    AuditStatus.WARNING,
                    null
            );
        }
    }

    // Planda işlem yapan personellerin ve tüm ADMIN'lerin e-posta adreslerini toplar.
    private List<String> resolveRecipients(Long planId) {
        Set<Long> userIds = new LinkedHashSet<>();

        for (NeedList need : needListRepository.findByPlanId(planId)) {
            if (need.getCreatedBy() != null) userIds.add(need.getCreatedBy());
        }

        for (Purchase purchase : purchaseRepository.findByPlanId(planId)) {
            if (purchase.getCreatedBy() != null) userIds.add(purchase.getCreatedBy());
        }

        for (Collection collection : collectionRepository.findByPlanId(planId)) {
            if (collection.getCreatedBy() != null) userIds.add(collection.getCreatedBy());
        }

        for (Acceptance acceptance : acceptanceRepository.findByPlanId(planId)) {
            if (acceptance.getReceivedBy() != null) userIds.add(acceptance.getReceivedBy());
        }

        Set<String> emails = new LinkedHashSet<>();

        for (Long userId : userIds) {
            userRepository.findById(userId)
                    .map(User::getEmail)
                    .filter(email -> email != null && !email.isBlank())
                    .ifPresent(emails::add);
        }

        for (User admin : userRepository.findByRole(UserRole.ADMIN)) {
            if (admin.getEmail() != null && !admin.getEmail().isBlank()) {
                emails.add(admin.getEmail());
            }
        }

        return new ArrayList<>(emails);
    }

    /*
      Firelerden kaynaklanan parasal zararı hesaplar.
      Mantık: mağazaya ulaşmayan her birim (ihtiyaç - kabul edilen) alış
      fiyatıyla çarpılır. Alış fiyatı bilinmiyorsa o ürün hesaba katılmaz.
    */
    private BigDecimal calculateFinancialLoss(Long planId, PlanSummaryResponse summary) {
        BigDecimal total = BigDecimal.ZERO;

        for (PlanSummaryItemResponse item : summary.getItems()) {
            Double required = item.getRequiredQuantity();
            Double accepted = item.getAcceptedQuantity();
            BigDecimal unitPrice = item.getUnitPrice();

            if (required == null || accepted == null || unitPrice == null) {
                continue;
            }

            double missing = required - accepted;

            if (missing <= 0) {
                continue;
            }

            total = total.add(unitPrice.multiply(BigDecimal.valueOf(missing)));
        }

        return total.setScale(2, RoundingMode.HALF_UP);
    }

    // Mailin HTML gövdesini üretir. Mobil uyumlu olması için sabit genişlik kullanılmaz.
    private String buildHtml(PlanSummaryResponse summary, BigDecimal financialLoss) {
        boolean hasProblem = summary.getInconsistentProductCount() > 0;
        boolean hasLoss = financialLoss.compareTo(BigDecimal.ZERO) > 0;

        String bannerColor = hasLoss ? "#B3261E" : (hasProblem ? "#A65C00" : "#2E7D32");
        String bannerText = hasLoss
                ? "KRİTİK: Kayıp tespit edildi"
                : (hasProblem ? "UYARI: Miktar farkları var" : "BAŞARILI: Tüm miktarlar tutarlı");

        StringBuilder html = new StringBuilder();

        html.append("<!doctype html><html><body style=\"margin:0;padding:16px;")
                .append("background:#F4F7F4;font-family:Arial,Helvetica,sans-serif;color:#17211B;\">")
                .append("<div style=\"max-width:640px;margin:0 auto;background:#FFFFFF;")
                .append("border:1px solid #DDE7DF;border-radius:12px;overflow:hidden;\">");

        // Renkli durum banner'i
        html.append("<div style=\"background:").append(bannerColor)
                .append(";color:#FFFFFF;padding:16px 20px;\">")
                .append("<div style=\"font-size:18px;font-weight:bold;\">").append(bannerText).append("</div>")
                .append("<div style=\"font-size:13px;margin-top:4px;\">Plan #")
                .append(summary.getPlanId()).append(" - ").append(escape(summary.getStoreName()))
                .append("</div></div>");

        // Genel bilgiler
        html.append("<div style=\"padding:16px 20px;\">")
                .append(infoRow("Tarih", LocalDateTime.now().format(DATE_FORMAT)))
                .append(infoRow("Toplam tutar", calculateTotalAmount(summary).toPlainString() + " TL"))
                .append(infoRow("Ürün sayısı", String.valueOf(summary.getTotalProductCount())))
                .append(infoRow("Farklı çıkan ürün", String.valueOf(summary.getInconsistentProductCount())))
                .append(infoRow("Durum", escape(summary.getSummaryMessage())))
                .append("</div>");

        // Detay tablosu
        html.append("<div style=\"padding:0 20px 8px;overflow-x:auto;\">")
                .append("<table style=\"width:100%;border-collapse:collapse;font-size:13px;\">")
                .append("<thead><tr style=\"background:#EAF5EC;\">")
                .append(th("Ürün")).append(th("İhtiyaç")).append(th("Alım"))
                .append(th("Toplama")).append(th("Kabul")).append(th("Farklar"))
                .append("</tr></thead><tbody>");

        for (PlanSummaryItemResponse item : summary.getItems()) {
            /*
              "Farklar" sütunu, ürünün DÖRT aşamasındaki tüm farkları gösterir.
              Önceden yalnızca İhtiyaç-Kabul farkına bakılıyordu; bu yüzden ara
              aşamalarda kayıp olan bir ürün tabloda "Tam" görünüyor ama üstteki
              özet "2 üründe fark var" diyordu - tablo ile özet çelişiyordu.
              Artık ikisi de aynı kaynağı (item.isConsistent) kullanır.
            */
            html.append("<tr style=\"border-top:1px solid #DDE7DF;\">")
                    .append(td(escape(item.getFruitName()), "#17211B"))
                    .append(td(number(item.getRequiredQuantity()), "#17211B"))
                    .append(td(number(item.getPurchasedQuantity()), "#17211B"))
                    .append(td(number(item.getCollectedQuantity()), "#17211B"))
                    .append(td(number(item.getAcceptedQuantity()), "#17211B"))
                    .append(td(differenceSummary(item), differenceColor(item)))
                    .append("</tr>");
        }

        html.append("</tbody></table></div>");

        // Finansal kayip ozeti
        html.append("<div style=\"margin:12px 20px 20px;padding:14px;border-radius:10px;background:")
                .append(hasLoss ? "#FBE9E7" : "#EAF5EC").append(";\">")
                .append("<div style=\"font-size:12px;color:#5A6960;\">Firelerden kaynaklanan tahmini zarar</div>")

                .append("<div style=\"font-size:20px;font-weight:bold;color:")
                .append(hasLoss ? "#B3261E" : "#2E7D32").append(";margin-top:4px;\">")
                .append(financialLoss.toPlainString()).append(" TL</div></div>");

        html.append("<div style=\"padding:0 20px 18px;font-size:11px;color:#8B978F;\">")
                .append("Bu e-posta Meyve Takip Sistemi tarafından otomatik gönderilmiştir.")
                .append("</div>");

        html.append("</div></body></html>");

        return html.toString();
    }

    private String infoRow(String label, String value) {
        return "<div style=\"padding:4px 0;font-size:13px;\">"
                + "<span style=\"color:#5A6960;\">" + label + ": </span>"
                + "<span style=\"font-weight:bold;\">" + value + "</span></div>";
    }

    private String th(String text) {
        return "<th style=\"text-align:left;padding:8px 6px;font-size:12px;color:#5A6960;\">" + text + "</th>";
    }

    private String td(String text, String color) {
        return "<td style=\"padding:8px 6px;color:" + color + ";\">" + text + "</td>";
    }

    // Miktarı okunabilir metne çevirir; henüz girilmemişse "-" gösterir.
    private String number(Double value) {
        if (value == null) {
            return "-";
        }

        return (value == Math.floor(value)) ? String.valueOf((long) (double) value) : String.valueOf(value);
    }

    /*
      Bir ürünün dört aşamasındaki farkları tek hücrede özetler, örn:
        "Toplama 2 eksik · Kabul 2 fazla"
      Hiçbir aşamada fark yoksa "Tam" yazar. Hangi aşamaların kontrol edildiği
      ConsistencyCheckService ile birebir aynıdır.
    */
    private String differenceSummary(PlanSummaryItemResponse item) {
        List<String> parts = new ArrayList<>();

        addDifferencePart(parts, "Alım", item.getNeedPurchaseDifference());
        addDifferencePart(parts, "Toplama", item.getPurchaseCollectionDifference());
        addDifferencePart(parts, "Kabul", item.getCollectionAcceptanceDifference());
        addDifferencePart(parts, "Sonuç", item.getNeedAcceptanceDifference());

        return parts.isEmpty() ? "Tam" : String.join(" · ", parts);
    }

    private void addDifferencePart(List<String> parts, String stageLabel, Double difference) {
        if (difference == null || difference == 0) {
            return;
        }

        parts.add(stageLabel + " " + number(Math.abs(difference))
                + (difference < 0 ? " eksik" : " fazla"));
    }

    /*
      Fark hücresinin rengi: eksik varsa kırmızı (kayıp şüphesi), yalnızca
      fazlalık varsa turuncu, hiç fark yoksa yeşil.
    */
    private String differenceColor(PlanSummaryItemResponse item) {
        if (item.isConsistent()) {
            return "#2E7D32";
        }

        boolean hasShortage = isNegative(item.getNeedPurchaseDifference())
                || isNegative(item.getPurchaseCollectionDifference())
                || isNegative(item.getCollectionAcceptanceDifference())
                || isNegative(item.getNeedAcceptanceDifference());

        return hasShortage ? "#B3261E" : "#A65C00";
    }

    private boolean isNegative(Double value) {
        return value != null && value < 0;
    }

    // Planın toplam alım tutarı (miktar x birim fiyat). Şartnamede "Toplam Tutar" olarak istenir.
    private BigDecimal calculateTotalAmount(PlanSummaryResponse summary) {
        BigDecimal total = BigDecimal.ZERO;

        for (PlanSummaryItemResponse item : summary.getItems()) {
            if (item.getPurchasedQuantity() == null || item.getUnitPrice() == null) {
                continue;
            }

            total = total.add(item.getUnitPrice()
                    .multiply(BigDecimal.valueOf(item.getPurchasedQuantity())));
        }

        return total.setScale(2, RoundingMode.HALF_UP);
    }

    // HTML içine güvenle gömülebilmesi için metni temizler.
    private String escape(String value) {
        if (value == null) {
            return "";
        }

        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
