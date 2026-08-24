package com.emre.meyvetakipsistemi.purchase;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.auditlog.AuditStatus;
import com.emre.meyvetakipsistemi.deliveryplan.DeliveryPlanService;
import com.emre.meyvetakipsistemi.fruit.Fruit;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.fruit.FruitUnit;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.notification.NotificationService;
import com.emre.meyvetakipsistemi.pricehistory.PriceHistoryService;
import com.emre.meyvetakipsistemi.purchase.dto.*;
import com.emre.meyvetakipsistemi.supplier.SupplierService;
import com.emre.meyvetakipsistemi.task.TaskAssignment;
import com.emre.meyvetakipsistemi.task.TaskAssignmentRepository;
import com.emre.meyvetakipsistemi.task.TaskDeadlineCalculator;
import com.emre.meyvetakipsistemi.task.TaskStatus;
import com.emre.meyvetakipsistemi.task.TaskType;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import com.emre.meyvetakipsistemi.user.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

// MAGAZA_MUDURU'nün alım (Purchase) işlemlerine ait iş mantığını yönetir.
@Service
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final NeedListRepository needListRepository;
    private final FruitRepository fruitRepository;
    private final UserRepository userRepository;
    private final DeliveryPlanService deliveryPlanService;
    private final SupplierService supplierService;
    private final PriceHistoryService priceHistoryService;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final TaskDeadlineCalculator taskDeadlineCalculator;

    public PurchaseService(
            PurchaseRepository purchaseRepository,
            NeedListRepository needListRepository,
            FruitRepository fruitRepository,
            UserRepository userRepository,
            DeliveryPlanService deliveryPlanService,
            SupplierService supplierService,
            PriceHistoryService priceHistoryService,
            TaskAssignmentRepository taskAssignmentRepository,
            AuditLogService auditLogService,
            NotificationService notificationService,
            TaskDeadlineCalculator taskDeadlineCalculator
    ) {
        this.purchaseRepository = purchaseRepository;
        this.needListRepository = needListRepository;
        this.fruitRepository = fruitRepository;
        this.userRepository = userRepository;
        this.deliveryPlanService = deliveryPlanService;
        this.supplierService = supplierService;
        this.priceHistoryService = priceHistoryService;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
        this.taskDeadlineCalculator = taskDeadlineCalculator;
    }

    // Alımı henüz tamamlanmamış (en az bir ürünü hâlâ alınmamış) planları listeler.
    public List<PendingPurchasePlanResponse> getPendingPurchasePlans(Long managerId) {
        requireViewer(managerId);

        Map<Long, List<NeedList>> needsByPlan = needListRepository.findAll()
                .stream()
                .collect(Collectors.groupingBy(NeedList::getPlanId));

        List<PendingPurchasePlanResponse> result = new ArrayList<>();

        for (Map.Entry<Long, List<NeedList>> entry : needsByPlan.entrySet()) {
            Long planId = entry.getKey();
            List<NeedList> items = entry.getValue();

            boolean fullyPurchased = items.stream()
                    .allMatch(item -> purchaseRepository.existsByPlanIdAndFruitId(planId, item.getFruitId()));

            if (fullyPurchased) {
                continue;
            }

            // Planın temsili tarihi olarak en son eklenen ürünün oluşturulma tarihi kullanılır
            // (NeedListList ekranındaki mevcut yaklaşımla aynı mantık).
            LocalDateTime createdDate = items.stream()
                    .map(NeedList::getCreatedDate)
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .orElse(null);

            DeliveryPlanService.PlanStoreInfo storeInfo = deliveryPlanService.resolveStoreInfo(planId);

            result.add(new PendingPurchasePlanResponse(
                    planId, storeInfo.storeId(), storeInfo.storeName(), createdDate, items.size()
            ));
        }

        // Backend sadece deterministik/temel bir sıralama sağlar; "en yeni plan üstte"
        // gösterimi frontend'de NeedListList ekranındaki aynı mantıkla yapılır.
        result.sort(Comparator.comparing(PendingPurchasePlanResponse::getPlanId).reversed());

        return result;
    }

    /*
      Seçilen planın ürünlerini ve ihtiyaç bilgilerini döner.
      Aynı plan içinde aynı meyve için birden fazla NeedList kaydı olabilir
      (örn. kullanıcı aynı ürünü yanlışlıkla iki kez eklemiş olabilir). Purchase
      her zaman fruitId bazında tek kayıt tuttuğu için, bu kayıtlar burada
      fruitId'ye göre TEK bir kaleme birleştirilir ve requiredQuantity toplanır.
      Bu sayede frontend'e aynı fruitId için asla birden fazla satır gitmez.
    */
    public PurchasePlanDetailResponse getPurchasePlanDetail(Long managerId, Long planId) {
        requireViewer(managerId);

        List<NeedList> needs = needListRepository.findByPlanId(planId);

        if (needs.isEmpty()) {
            throw new RuntimeException("Bu plana ait ihtiyaç kaydı bulunamadı");
        }

        Map<Long, List<NeedList>> needsByFruitId = groupNeedsByFruitId(needs);

        List<PurchasePlanItemResponse> items = needsByFruitId.entrySet().stream()
                .map(entry -> {
                    Long fruitId = entry.getKey();
                    List<NeedList> group = entry.getValue();

                    double totalRequiredQuantity = group.stream()
                            .mapToDouble(NeedList::getRequiredQuantity)
                            .sum();

                    // Birden fazla NeedList kaydı birleştiğinde, temsili id olarak ilki kullanılır.
                    Long representativeNeedListId = group.get(0).getId();

                    Fruit fruit = fruitRepository.findById(fruitId).orElse(null);
                    boolean alreadyPurchased = purchaseRepository.existsByPlanIdAndFruitId(planId, fruitId);

                    /*
                      Personelin bu ürün için yazdığı not(lar). Aynı meyve birden
                      fazla ihtiyaç satırında geçiyorsa notlar tek metinde birleşir;
                      hiç not yoksa null kalır ve ekranda gösterilmez.
                    */
                    String staffNote = group.stream()
                            .map(NeedList::getNotes)
                            .filter(note -> note != null && !note.isBlank())
                            .collect(Collectors.joining(" | "));

                    return new PurchasePlanItemResponse(
                            representativeNeedListId,
                            fruitId,
                            fruit == null ? "Bilinmeyen meyve" : fruit.getName(),
                            fruit == null ? null : fruit.getCode(),
                            fruit == null ? null : fruit.getUnit(),
                            totalRequiredQuantity,
                            alreadyPurchased,
                            fruit == null ? null : fruit.getImagePath(),
                            fruit == null || fruit.getProfitMarginPercent() == null
                                    ? 20.0
                                    : fruit.getProfitMarginPercent(),
                            staffNote.isBlank() ? null : staffNote
                    );
                })
                .toList();

        // Planın geneline yazılmış not da müdüre iletilir (bkz. PlanStoreInfo.generalNotes).
        String planNotes = deliveryPlanService.resolveStoreInfo(planId).generalNotes();

        return new PurchasePlanDetailResponse(planId, planNotes, items);
    }

    /*
      Bir planın alımı kalan tüm ürünleri için tek seferde alım kaydı oluşturur.
      İşlem @Transactional'dır: doğrulama iki aşamada yapılır (önce hiçbir şey
      kaydetmeden bütün kalemler kontrol edilir, sonra kayıtlar oluşturulur),
      bu sayede bir kalem geçersizse veritabanına yarım kayıt yazılmaz.
    */
    @Transactional
    public PurchaseResultResponse createPurchasesForPlan(PurchasePlanRequest request) {

        User manager = requireManager(request.getCreatedBy());

        if (request.getPlanId() == null) {
            throw new RuntimeException("Plan seçilmelidir");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("En az bir ürün için alım bilgisi girilmelidir");
        }

        List<NeedList> needs = needListRepository.findByPlanId(request.getPlanId());

        if (needs.isEmpty()) {
            throw new RuntimeException("Bu plana ait ihtiyaç kaydı bulunamadı");
        }

        // Aynı fruitId için birden fazla NeedList kaydı varsa tek kaleme birleştirilir.
        Set<Long> planFruitIds = groupNeedsByFruitId(needs).keySet();

        // Bu planda henüz alımı yapılmamış ürünler.
        Set<Long> remainingFruitIds = planFruitIds.stream()
                .filter(fruitId -> !purchaseRepository.existsByPlanIdAndFruitId(request.getPlanId(), fruitId))
                .collect(Collectors.toSet());

        if (remainingFruitIds.isEmpty()) {
            throw new RuntimeException("Bu planın alımı zaten tamamlanmış");
        }

        // 1. Aşama: hiçbir kayıt yazılmadan önce bütün kalemler doğrulanır.
        Set<Long> submittedFruitIds = new HashSet<>();

        for (PurchaseItemRequest item : request.getItems()) {
            validatePurchaseItem(item, request.getPlanId(), planFruitIds, submittedFruitIds);
        }

        /*
          Planın kalan tüm ürünleri tek seferde gönderilmelidir. Kısmi gönderim kabul
          edilmez; aksi halde plan "kısmen alınmış" belirsiz bir durumda kalabilir.
        */
        if (!submittedFruitIds.equals(remainingFruitIds)) {
            throw new RuntimeException("Planın tüm ürünleri için alım bilgisi girilmelidir");
        }

        // 2. Aşama: doğrulama tamamlandığına göre kayıtlar güvenle oluşturulabilir.
        List<Purchase> savedPurchases = new ArrayList<>();

        for (PurchaseItemRequest item : request.getItems()) {
            Purchase purchase = buildPurchase(request.getPlanId(), manager.getId(), item);

            savedPurchases.add(purchaseRepository.save(purchase));

            // Not: önceden burada salesPrice kaydediliyordu; PriceHistory hiçbir yerde
            // okunmadığı (yalnızca yazılıyordu) için bu değişiklik güvenlidir. "Son alış
            // fiyatları" özelliği alış (unitPrice) geçmişini gösterdiğinden buraya alındı.
            priceHistoryService.recordPrice(item.getFruitId(), item.getUnitPrice());
        }

        completeAlimTaskAndAssignToplama(request.getPlanId(), manager);

        auditLogService.createLog(
                manager.getId(),
                manager.getFullName(),
                AuditActionType.PURCHASE_CREATED,
                "Purchase",
                request.getPlanId(),
                manager.getFullName() + " Plan #" + request.getPlanId() + " için "
                        + savedPurchases.size() + " ürünlük alım kaydetti."
        );

        return new PurchaseResultResponse(
                request.getPlanId(),
                savedPurchases.size(),
                "Alım kaydı tamamlandı. " + savedPurchases.size() + " ürün kaydedildi."
        );
    }

    // Tek bir alım kalemini, herhangi bir kayıt yazmadan önce baştan sona doğrular.
    private void validatePurchaseItem(
            PurchaseItemRequest item,
            Long planId,
            Set<Long> planFruitIds,
            Set<Long> submittedFruitIds
    ) {
        if (item.getFruitId() == null || !planFruitIds.contains(item.getFruitId())) {
            throw new RuntimeException("Gönderilen ürün bu plana ait değil");
        }

        if (!submittedFruitIds.add(item.getFruitId())) {
            throw new RuntimeException("Aynı ürün birden fazla kez gönderildi");
        }

        if (purchaseRepository.existsByPlanIdAndFruitId(planId, item.getFruitId())) {
            throw new RuntimeException("Bu ürün için alım zaten kaydedilmiş");
        }

        if (item.getPurchasedQuantity() == null || item.getPurchasedQuantity() <= 0) {
            throw new RuntimeException("Alınan miktar sıfırdan büyük olmalıdır");
        }

        Fruit fruit = fruitRepository.findById(item.getFruitId()).orElse(null);

        // Projenin genel birim kuralı: ADET ve KASA gibi birimlerde küsuratlı miktar olmaz.
        if (fruit != null && requiresWholeNumber(fruit.getUnit())
                && item.getPurchasedQuantity() != Math.floor(item.getPurchasedQuantity())) {
            throw new RuntimeException(fruit.getName() + " için yalnızca tam sayı miktar girilebilir");
        }

        if (item.getUnitPrice() == null || item.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Birim fiyat sıfırdan küçük olamaz");
        }

        if (item.getSalesPrice() == null || item.getSalesPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Satış fiyatı sıfırdan küçük olamaz");
        }

        // Tedarikçi var ve aktif mi kontrolü (bulunamazsa/aktif değilse hata fırlatır).
        supplierService.requireActiveSupplier(item.getSupplierId());
    }

    /*
      Bir plana ait NeedList kayıtlarını fruitId'ye göre gruplar.
      Aynı planda aynı meyve için birden fazla NeedList satırı varsa (örn. kullanıcı
      aynı ürünü yanlışlıkla iki kez eklemişse), Purchase ve ekran tarafında bunlar
      HER ZAMAN tek bir kalem olarak ele alınmalıdır (bkz. getPurchasePlanDetail ve
      createPurchasesForPlan) — bu yüzden gruplama mantığı tek bir yerde tutulur.
    */
    private Map<Long, List<NeedList>> groupNeedsByFruitId(List<NeedList> needs) {
        return needs.stream().collect(Collectors.groupingBy(
                NeedList::getFruitId, LinkedHashMap::new, Collectors.toList()
        ));
    }

    // Backend'in bildiği birimlerden hangileri küsuratlı miktar kabul etmez.
    private boolean requiresWholeNumber(FruitUnit unit) {
        return unit == FruitUnit.ADET || unit == FruitUnit.KASA;
    }

    // Doğrulanmış bir kalemden Purchase entity'si oluşturur; totalPrice yalnızca burada hesaplanır.
    private Purchase buildPurchase(Long planId, Long managerId, PurchaseItemRequest item) {
        BigDecimal totalPrice = item.getUnitPrice()
                .multiply(BigDecimal.valueOf(item.getPurchasedQuantity()));

        Purchase purchase = new Purchase();
        purchase.setPlanId(planId);
        purchase.setFruitId(item.getFruitId());
        purchase.setPurchasedQuantity(item.getPurchasedQuantity());
        purchase.setUnitPrice(item.getUnitPrice());
        purchase.setTotalPrice(totalPrice);
        purchase.setSalesPrice(item.getSalesPrice());
        purchase.setSupplierId(item.getSupplierId());
        purchase.setPurchaseDate(LocalDateTime.now());
        purchase.setCreatedBy(managerId);
        purchase.setNotes(item.getNotes());

        return purchase;
    }

    /*
      Plan alımı tamamlandığında:
      1) Aynı plana ait ALIM görevi varsa COMPLETED yapılır (yoksa hiçbir şey yapılmaz).
      2) Aynı plan için daha önce oluşturulmuş bir TOPLAMA görevi yoksa, sistemdeki
         id'si en küçük SOFOR kullanıcısına yeni bir TOPLAMA görevi atanır.
      3) Sistemde hiç SOFOR yoksa işlem hata fırlatır; bu @Transactional metot
         içinde olduğu için daha önce kaydedilen Purchase/PriceHistory kayıtları da
         geri alınır (sahipsiz/yarım görev oluşturulmaz, ama yarım alım da kalmaz).
    */
    private void completeAlimTaskAndAssignToplama(Long planId, User manager) {

        taskAssignmentRepository.findByPlanIdAndTaskType(planId, TaskType.ALIM)
                .ifPresent(alimTask -> {
                    alimTask.setStatus(TaskStatus.COMPLETED);
                    taskAssignmentRepository.save(alimTask);

                    auditLogService.createLog(
                            manager.getId(),
                            manager.getFullName(),
                            AuditActionType.TASK_COMPLETED,
                            "TaskAssignment",
                            alimTask.getId(),
                            "Plan #" + planId + " için ALIM görevi tamamlandı.",
                            planId,
                            AuditStatus.SUCCESS,
                            null
                    );
                });

        boolean toplamaTaskExists = taskAssignmentRepository
                .findByPlanIdAndTaskType(planId, TaskType.TOPLAMA)
                .isPresent();

        if (toplamaTaskExists) {
            return;
        }

        User sofor = pickLeastBusyDriver();

        TaskAssignment toplamaTask = new TaskAssignment();
        toplamaTask.setPlanId(planId);
        toplamaTask.setAssignedUserId(sofor.getId());
        toplamaTask.setAssignedAt(LocalDateTime.now());
        // Süre, plandaki ürünlere göre hesaplanır (bozulabilir ürün varsa 2, yoksa 4 saat).
        toplamaTask.setDueDate(taskDeadlineCalculator.calculateDueDate(planId));
        toplamaTask.setTaskType(TaskType.TOPLAMA);
        toplamaTask.setStatus(TaskStatus.PENDING);

        TaskAssignment savedTask = taskAssignmentRepository.save(toplamaTask);

        auditLogService.createLog(
                manager.getId(),
                manager.getFullName(),
                AuditActionType.TASK_ASSIGNED,
                "TaskAssignment",
                savedTask.getId(),
                "Plan #" + planId + " için " + sofor.getFullName() + " kullanıcısına toplama görevi atandı."
        );

        notificationService.notifyUser(
                sofor.getId(),
                "TOPLAMA_GOREVI_ATANDI",
                "Yeni toplama görevi atandı (Plan #" + planId + ")."
        );
    }

    // Henüz bitmemiş sayılan görev durumları; iş yükü bunlara göre hesaplanır.
    // OVERDUE de dahildir: süresi geçmiş ama yapılmamış görev hâlâ o kişinin işidir.
    private static final List<TaskStatus> OPEN_TASK_STATUSES =
            List.of(TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE);

    /*
      Toplama görevini hangi şoföre atayacağını belirler: AÇIK GÖREV SAYISI EN AZ
      olan şoför seçilir, eşitlik durumunda id'si küçük olan.

      Önceden burada findFirstByRoleOrderByIdAsc(SOFOR) vardı; yani her görev
      HER ZAMAN en küçük id'li şoföre gidiyordu. Sisteme ikinci bir şoför
      eklendiğinde o kişi hiçbir görev alamıyor, uygulamaya girse bile yapacak
      işi olmuyordu (kendisine atanmayan görevi de açamaz - bkz.
      CollectionService.requireOwnToplamaTask).

      Tek şoför varken davranış öncekiyle BİREBİR aynıdır: tek aday olduğu için
      hep o seçilir.

      Yalnızca e-postasını doğrulamış şoförler aday olur; doğrulamamış hesap
      giriş yapamadığı için kendisine atanan görev hiç görülmezdi.
    */
    private User pickLeastBusyDriver() {
        List<User> drivers = userRepository.findByRoleAndIsVerifiedTrue(UserRole.SOFOR);

        if (drivers.isEmpty()) {
            throw new RuntimeException(
                    "Sistemde aktif şoför (SOFOR) kullanıcısı bulunamadığı için toplama görevi oluşturulamadı"
            );
        }

        return drivers.stream()
                .min(Comparator
                        .comparingLong((User driver) -> taskAssignmentRepository
                                .countByAssignedUserIdAndStatusIn(driver.getId(), OPEN_TASK_STATUSES))
                        .thenComparing(User::getId))
                .orElseThrow();
    }

    // Çağıranın var olan ve MAGAZA_MUDURU rolünde bir kullanıcı olduğunu doğrular.
    // Yalnızca gerçek alım kaydı oluşturma (createPurchasesForPlan) için kullanılır.
    private User requireManager(Long managerId) {
        if (managerId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (manager.getRole() != UserRole.MAGAZA_MUDURU) {
            throw new RuntimeException("Bu işlem için mağaza müdürü yetkisi gereklidir");
        }

        return manager;
    }

    /*
      Çağıranın var olan ve alım kayıtlarını GÖRÜNTÜLEYEBİLECEK bir kullanıcı
      olduğunu doğrular: MAGAZA_MUDURU (kendi işi) veya ADMIN (salt okunur izleme).
      Kayıt oluşturma bu metotla korunmaz — bkz. requireManager.
    */
    private User requireViewer(Long userId) {
        if (userId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.MAGAZA_MUDURU && user.getRole() != UserRole.ADMIN) {
            throw new RuntimeException("Bu işlem için mağaza müdürü veya yönetici yetkisi gereklidir");
        }

        return user;
    }
}
