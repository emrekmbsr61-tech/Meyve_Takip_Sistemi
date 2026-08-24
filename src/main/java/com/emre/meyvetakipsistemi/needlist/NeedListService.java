package com.emre.meyvetakipsistemi.needlist;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLog;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.auditlog.AuditStatus;
import com.emre.meyvetakipsistemi.auth.CurrentUserService;
import com.emre.meyvetakipsistemi.deliveryplan.DeliveryPlan;
import com.emre.meyvetakipsistemi.deliveryplan.DeliveryPlanRepository;
import com.emre.meyvetakipsistemi.deliveryplan.DeliveryPlanService;
import com.emre.meyvetakipsistemi.deliveryplan.PlanStatus;
import com.emre.meyvetakipsistemi.exception.ResourceNotFoundException;
import com.emre.meyvetakipsistemi.fruit.Fruit;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.needlist.dto.AddExtraItemsRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListPlanItemRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListPlanRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListPlanResponse;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListResponse;
import com.emre.meyvetakipsistemi.notification.NotificationService;
import com.emre.meyvetakipsistemi.purchase.PurchaseRepository;
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

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// İhtiyaç listesi işlemlerinin iş mantığını yönetir.
@Service
public class NeedListService {

    private final NeedListRepository needListRepository;
    private final FruitRepository fruitRepository;
    private final UserRepository userRepository;
    private final DeliveryPlanRepository deliveryPlanRepository;
    private final DeliveryPlanService deliveryPlanService;
    private final AuditLogService auditLogService;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final NotificationService notificationService;
    private final CurrentUserService currentUserService;
    private final TaskDeadlineCalculator taskDeadlineCalculator;

    /*
      Yalnizca "bu plan icin alim yapilmis mi" kontrolu icin kullanilir
      (bkz. requirePlanNotPurchased). Alim kaydinin kendisi burada okunmaz.
    */
    private final PurchaseRepository purchaseRepository;

    // Spring gerekli repository ve service nesnelerini buradan otomatik verir.
    public NeedListService(
            NeedListRepository needListRepository,
            FruitRepository fruitRepository,
            UserRepository userRepository,
            DeliveryPlanRepository deliveryPlanRepository,
            DeliveryPlanService deliveryPlanService,
            AuditLogService auditLogService,
            TaskAssignmentRepository taskAssignmentRepository,
            NotificationService notificationService,
            CurrentUserService currentUserService,
            TaskDeadlineCalculator taskDeadlineCalculator,
            PurchaseRepository purchaseRepository
    ) {
        this.needListRepository = needListRepository;
        this.fruitRepository = fruitRepository;
        this.userRepository = userRepository;
        this.deliveryPlanRepository = deliveryPlanRepository;
        this.deliveryPlanService = deliveryPlanService;
        this.auditLogService = auditLogService;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.notificationService = notificationService;
        this.currentUserService = currentUserService;
        this.taskDeadlineCalculator = taskDeadlineCalculator;
        this.purchaseRepository = purchaseRepository;
    }

    /*
      YENİ ihtiyaç planı oluşturma akışı.
      Aynı transaction içinde önce bir DeliveryPlan kaydı oluşturur, ardından bütün
      ürün satırlarını backend'in ürettiği bu yeni planId ile kaydeder. planId asla
      client'tan kabul edilmez. Bir ürün kaydedilemezse (örn. aynı meyve iki kez
      gönderilmişse) hiçbir şey kaydedilmeden hata döner (yarım plan kalmaz).
    */
    @Transactional
    public NeedListPlanResponse createNeedListPlan(NeedListPlanRequest request) {

        User creator = requireCreator(request.getCreatedBy());

        if (request.getStoreId() == null || request.getStoreId().isBlank()) {
            throw new RuntimeException("Mağaza seçilmelidir");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("En az bir ürün seçilmelidir");
        }

        // Aynı istekte aynı meyve iki kez gönderilmişse reddedilir.
        Set<Long> seenFruitIds = new HashSet<>();

        for (NeedListPlanItemRequest item : request.getItems()) {
            if (item.getFruitId() == null) {
                throw new RuntimeException("Ürün seçilmelidir");
            }

            if (!seenFruitIds.add(item.getFruitId())) {
                throw new RuntimeException("Aynı ürün planda birden fazla kez gönderildi");
            }

            if (item.getRequiredQuantity() == null || item.getRequiredQuantity() <= 0) {
                throw new RuntimeException("Geçerli bir miktar girilmelidir");
            }

            if (!fruitRepository.existsById(item.getFruitId())) {
                throw new RuntimeException("Ürün bulunamadı: " + item.getFruitId());
            }
        }

        // 1) Yeni bir DeliveryPlan kaydı oluşturulur; planId buradan üretilir.
        DeliveryPlan deliveryPlan = new DeliveryPlan();
        deliveryPlan.setStoreId(request.getStoreId());
        deliveryPlan.setPlanStatus(PlanStatus.CREATED);
        deliveryPlan.setCreatedDate(LocalDateTime.now());
        deliveryPlan.setGeneralNotes(request.getGeneralNotes());

        DeliveryPlan savedPlan = deliveryPlanRepository.save(deliveryPlan);

        auditLogService.createLog(
                creator.getId(),
                creator.getFullName(),
                AuditActionType.DELIVERY_PLAN_CREATED,
                "DeliveryPlan",
                savedPlan.getId(),
                creator.getFullName() + " " + request.getStoreId() + " mağazası için yeni plan oluşturdu. Plan #" + savedPlan.getId()
        );

        // 2) Her ürün için, backend'in ürettiği planId ile NeedList satırı oluşturulur.
        List<NeedListResponse> items = new ArrayList<>();

        for (NeedListPlanItemRequest item : request.getItems()) {
            NeedList needList = new NeedList();
            needList.setPlanId(savedPlan.getId());
            needList.setFruitId(item.getFruitId());
            needList.setRequiredQuantity(item.getRequiredQuantity());
            needList.setCreatedBy(creator.getId());
            needList.setNotes(item.getNotes());
            needList.setCreatedDate(LocalDateTime.now());
            needList.setStatus(NeedListStatus.CREATED);

            NeedList savedNeedList = needListRepository.save(needList);

            auditLogService.createLog(
                    creator.getId(),
                    creator.getFullName(),
                    AuditActionType.NEED_LIST_CREATED,
                    "NeedList",
                    savedNeedList.getId(),
                    creator.getFullName() + " ihtiyaç listesi oluşturdu. Plan #" + savedPlan.getId()
                            + ", Kayıt ID: " + savedNeedList.getId()
            );

            items.add(convertToResponse(savedNeedList));
        }

        /*
          3) ALIM görevi ancak ürün satırları kaydedildikten SONRA atanır.
          Sebep: görevin süresi plandaki ürünlere bakılarak hesaplanıyor
          (bozulabilir ürün varsa 2, yoksa 4 saat - bkz. TaskDeadlineCalculator).
          Bu çağrı yukarıda, satırlar yazılmadan yapılırsa plan o an boş görünür
          ve süre her zaman yanlışlıkla 4 saat çıkar.
        */
        assignAlimTask(savedPlan.getId());

        DeliveryPlanService.PlanStoreInfo storeInfo = deliveryPlanService.resolveStoreInfo(savedPlan.getId());

        return new NeedListPlanResponse(
                savedPlan.getId(),
                storeInfo.storeId(),
                storeInfo.storeName(),
                savedPlan.getCreatedDate(),
                items
        );
    }

    /*
      Bir planı (tüm ürünleriyle birlikte) iptal eder.
      NeedList satırları mevcut projede zaten soft-delete kullanmadığı için burada da
      gerçek silme (hard delete) uygulanır — mevcut davranışla tutarlıdır. DeliveryPlan
      ise silinmez, CANCELLED durumuna alınır (bkz. görev talimatı). Yalnızca bu planId'ye
      ait kayıtlar etkilenir; başka planlara dokunulmaz.
    */
    @Transactional
    public void cancelNeedListPlan(Long planId, Long userId) {

        User canceller = requireCreator(userId);

        List<NeedList> needs = needListRepository.findByPlanId(planId);

        if (needs.isEmpty()) {
            throw new RuntimeException("Bu plana ait ihtiyaç kaydı bulunamadı");
        }

        /*
          SAHİPLİK KONTROLÜ: Bir planı yalnızca onu OLUŞTURAN personel (veya
          ADMIN) iptal edebilir.

          Önceden yalnızca ROL kontrol ediliyordu; bu yüzden herhangi bir mağaza
          personeli, planId'yi doğrudan göndererek BAŞKASININ planını silebilirdi.
          Ekranda yalnızca kendi planları listeleniyordu ama ekran atlanabilir.

          Kimlik, istekten gelen userId'den DEĞİL, doğrulanmış JWT'den okunur
          (updateNeedList ile aynı desen) - aksi halde saldırgan isteğe planın
          gerçek sahibinin id'sini yazarak kontrolü geçebilirdi.
        */
        currentUserService.requireOwnerOrAdmin(
                needs.get(0).getCreatedBy(),
                "Yalnızca kendi oluşturduğunuz planı iptal edebilirsiniz."
        );

        /*
          Alımı başlamış bir plan iptal EDİLEMEZ. Aksi halde müdürün parasını
          ödeyip aldığı ürünlerin ihtiyaç kaydı ortadan kalkar; alım, toplama ve
          kabul kayıtları sahipsiz kalır ve denetim hiçbir karşılaştırma yapamaz.
        */
        requirePlanNotPurchased(planId, "Bu planın alımı yapıldığı için plan iptal edilemez.");

        int deletedCount = needs.size();

        needListRepository.deleteAll(needs);

        deliveryPlanRepository.findById(planId).ifPresent(plan -> {
            plan.setPlanStatus(PlanStatus.CANCELLED);
            deliveryPlanRepository.save(plan);
        });

        auditLogService.createLog(
                canceller.getId(),
                canceller.getFullName(),
                AuditActionType.DELIVERY_PLAN_CANCELLED,
                "DeliveryPlan",
                planId,
                canceller.getFullName() + " Plan #" + planId + " iptal etti (" + deletedCount + " ürün kaydı silindi).",
                planId,
                AuditStatus.SUCCESS,
                null
        );

        // Müdür iptal edilmiş bir plan için alım yapmaya çalışmasın diye haber verilir.
        notifyPlanManager(
                planId,
                "IHTIYAC_IPTAL_EDILDI",
                "Plan #" + planId + " iptal edildi."
        );
    }

    // Tüm ihtiyaç listelerini frontend'e response olarak döndürür.
    public List<NeedListResponse> getAllNeedLists() {
        return needListRepository.findAll()
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    /*
      ID'ye göre ihtiyaç listesini günceller.

      Sahiplik kuralı: Bir kaydı yalnızca onu OLUŞTURAN kullanıcı veya ADMIN
      değiştirebilir. Kimlik, istekten (request.createdBy) DEĞİL, doğrulanmış
      JWT token'dan okunur - aksi halde kullanıcı isteğe başkasının id'sini
      yazarak onun kaydını değiştirebilirdi (bkz. CurrentUserService).
    */
    public NeedListResponse updateNeedList(Long id, NeedListRequest request) {
        NeedList needList = needListRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("İhtiyaç listesi bulunamadı"));

        currentUserService.requireOwnerOrAdmin(
                needList.getCreatedBy(),
                "Yalnızca kendi oluşturduğunuz ihtiyaç kaydını güncelleyebilirsiniz."
        );

        /*
          ALIM YAPILDIYSA MİKTAR DEĞİŞTİRİLEMEZ.

          Bu, projenin denetim amacının doğrudan gereğidir: müdür "100 kg lazım"
          bilgisine bakıp 95 kg alıyor. Personel sonradan ihtiyacı 120 kg yaparsa
          ConsistencyCheckService, alımı gerçekte hiç var olmamış bir sayıyla
          karşılaştırır ve "25 kg eksik alınmış" gibi yanlış bir kayıp üretir.
          Kısacası geçmişe dönük değişiklik, denetimi anlamsız kılar.
        */
        requirePlanNotPurchased(
                needList.getPlanId(),
                "Bu planın alımı yapıldığı için ihtiyaç miktarı artık değiştirilemez."
        );

        needList.setPlanId(request.getPlanId());
        needList.setFruitId(request.getFruitId());
        needList.setRequiredQuantity(request.getRequiredQuantity());
        needList.setNotes(request.getNotes());

        NeedList updatedNeedList = needListRepository.save(needList);

        String userFullName = getUserFullName(updatedNeedList.getCreatedBy());

        auditLogService.createLog(
                updatedNeedList.getCreatedBy(),
                userFullName,
                AuditActionType.NEED_LIST_UPDATED,
                "NeedList",
                updatedNeedList.getId(),
                userFullName + " ihtiyaç listesini güncelledi. Kayıt ID: " + updatedNeedList.getId(),
                updatedNeedList.getPlanId(),
                AuditStatus.SUCCESS,
                null
        );

        // Müdür alım yapmadan önce güncel miktarı görsün diye haber verilir.
        String fruitName = fruitRepository.findById(updatedNeedList.getFruitId())
                .map(Fruit::getName)
                .orElse("Ürün");

        notifyPlanManager(
                updatedNeedList.getPlanId(),
                "IHTIYAC_GUNCELLENDI",
                fruitName + " miktarı güncellendi (Plan #" + updatedNeedList.getPlanId() + ")."
        );

        return convertToResponse(updatedNeedList);
    }

    // Entity bilgisini frontend'e dönecek response yapısına çevirir.
    private NeedListResponse convertToResponse(NeedList needList) {

        Fruit fruit = fruitRepository.findById(needList.getFruitId()).orElse(null);
        String fruitName = fruit == null ? "Bilinmeyen meyve" : fruit.getName();
        String fruitCode = fruit == null ? null : fruit.getCode();

        String createdByName = getUserFullName(needList.getCreatedBy());

        // Mağaza bilgisi backend'de çözülür (yeni plan: DeliveryPlan üzerinden;
        // eski/legacy plan: yalnızca görüntüleme amaçlı legacy eşleme üzerinden).
        DeliveryPlanService.PlanStoreInfo storeInfo = deliveryPlanService.resolveStoreInfo(needList.getPlanId());
        String storeId = storeInfo.storeId();
        String storeName = storeInfo.storeName();

        // "Son güncelleyen" bilgisi, yalnızca gerçekten bir güncelleme logu varsa doldurulur.
        String updatedByName = null;
        LocalDateTime updatedDate = null;

        AuditLog latestUpdateLog = auditLogService
                .findLatestLog("NeedList", needList.getId(), AuditActionType.NEED_LIST_UPDATED)
                .orElse(null);

        if (latestUpdateLog != null) {
            updatedByName = latestUpdateLog.getUserFullName();
            updatedDate = latestUpdateLog.getCreatedAt();
        }

        return new NeedListResponse(
                needList.getId(),
                needList.getPlanId(),
                storeId,
                storeName,
                needList.getFruitId(),
                fruitName,
                fruitCode,
                fruit == null ? null : fruit.getUnit(),
                needList.getRequiredQuantity(),
                needList.getCreatedBy(),
                createdByName,
                needList.getCreatedDate(),
                needList.getNotes(),
                storeInfo.generalNotes(),
                needList.getStatus(),
                updatedByName,
                updatedDate,
                /*
                  Alım başladıysa kayıt kilitlidir; frontend düzenle/sil
                  butonlarını buna bakarak gizler.
                */
                needList.getPlanId() != null
                        && !purchaseRepository.existsByPlanId(needList.getPlanId())
        );
    }

    /*
      Bir plandaki değişikliği, o planın ALIM görevini üstlenmiş müdüre bildirir.

      Neden gerekli: İhtiyaç planı oluşturulduğunda müdüre bildirim gidiyordu,
      ama plan SONRADAN güncellenince veya iptal edilince hiçbir haber
      gitmiyordu. Müdür ekranı açık beklerken miktarlar değişse bile eski
      veriyi görüyor, hatta yanlış miktar üzerinden alım yapabiliyordu.

      Hedef seçimi: Bildirim, "sistemdeki ilk müdür" yerine bu planın ALIM
      görevi KİME ATANDIYSA ona gider - doğru kişi odur. Görev bulunamazsa
      (ör. çok eski bir plan) en küçük id'li müdüre düşülür.
    */
    private void notifyPlanManager(Long planId, String type, String message) {
        taskAssignmentRepository.findByPlanIdAndTaskType(planId, TaskType.ALIM)
                .map(TaskAssignment::getAssignedUserId)
                .or(() -> userRepository.findFirstByRoleOrderByIdAsc(UserRole.MAGAZA_MUDURU)
                        .map(User::getId))
                .ifPresent(managerId -> notificationService.notifyUser(managerId, type, message));
    }

    // Kullanıcı id bilgisinden ad soyad bilgisini bulur.
    private String getUserFullName(Long userId) {
        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Bilinmeyen kullanıcı");
    }

    /*
      Var olan bir plana ekstra ürün ekler. YENİ bir DeliveryPlan OLUŞTURMAZ —
      yalnızca aynı planId ile yeni NeedList satırları ekler. Bu sayede ekstra
      ürünler, Purchase/Collection/Acceptance'ın zaten kullandığı
      "needListRepository.findByPlanId(planId)" sorgusuyla otomatik olarak normal
      ürünlerle birlikte görünür; o servislerde hiçbir değişiklik gerekmez.

      Kimler ekleyebilir:
        - MAGAZA_MUDURU : Alım İşlemleri ekranından, alımı girmeden önce
        - MAGAZA_PERSONELI : yalnızca KENDİ oluşturduğu plana, Mevcut İhtiyaçlar
          ekranından. (Önceden yalnızca müdür ekleyebiliyordu; personel planı
          oluşturduktan sonra unuttuğu bir ürünü ekleyemiyor, planı silip
          baştan oluşturmak zorunda kalıyordu.)

      ÖNEMLİ: Yeni satırların createdBy'ı ekleyen kişi değil, planın MEVCUT
      sahibidir. Aksi halde TaskAssignmentService.resolvePlanOwner (Teslimat
      tamamlanınca Kabul görevini kime atayacağını bulan metot) "plana ait
      ihtiyaç kayıtları farklı kullanıcılara ait" hatası fırlatır.
    */
    @Transactional
    public List<NeedListResponse> addExtraItemsToPlan(Long planId, AddExtraItemsRequest request) {
        User requester = requireItemAdder(request.getUserId());

        List<NeedList> existingNeeds = needListRepository.findByPlanId(planId);

        if (existingNeeds.isEmpty()) {
            throw new RuntimeException("Bu plana ait ihtiyaç kaydı bulunamadı");
        }

        boolean planFinished = existingNeeds.stream()
                .anyMatch(need -> need.getStatus() == NeedListStatus.APPROVED || need.getStatus() == NeedListStatus.CANCELLED);

        if (planFinished) {
            throw new RuntimeException("Bu plan tamamlanmış veya iptal edilmiş, ürün eklenemez");
        }

        // Alım yapıldıysa plan kilitlidir (bkz. requirePlanNotPurchased).
        requirePlanNotPurchased(
                planId,
                "Bu planın alımı yapıldığı için artık ürün eklenemez."
        );

        /*
          Personel yalnızca KENDİ planına ürün ekleyebilir. Müdür için böyle bir
          kısıt yoktur: alımı o yapacağı için her plana ekleyebilmesi gerekir.
        */
        Long ownerId = existingNeeds.get(0).getCreatedBy();

        if (requester.getRole() == UserRole.MAGAZA_PERSONELI
                && !requester.getId().equals(ownerId)) {
            throw new RuntimeException("Yalnızca kendi oluşturduğunuz plana ürün ekleyebilirsiniz");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("En az bir ürün seçilmelidir");
        }

        // Planın orijinal sahibi korunur; ekstra ürünler de aynı kullanıcıya aitmiş gibi kaydedilir.
        Long planOwnerId = ownerId;

        Set<Long> existingFruitIds = existingNeeds.stream()
                .map(NeedList::getFruitId)
                .collect(java.util.stream.Collectors.toSet());
        Set<Long> seenFruitIds = new HashSet<>();

        for (NeedListPlanItemRequest item : request.getItems()) {
            if (item.getFruitId() == null) {
                throw new RuntimeException("Ürün seçilmelidir");
            }
            if (existingFruitIds.contains(item.getFruitId())) {
                throw new RuntimeException("Bu ürün zaten bu planda mevcut");
            }
            if (!seenFruitIds.add(item.getFruitId())) {
                throw new RuntimeException("Aynı ürün birden fazla kez gönderildi");
            }
            if (item.getRequiredQuantity() == null || item.getRequiredQuantity() <= 0) {
                throw new RuntimeException("Geçerli bir miktar girilmelidir");
            }
            if (!fruitRepository.existsById(item.getFruitId())) {
                throw new RuntimeException("Ürün bulunamadı: " + item.getFruitId());
            }
        }

        List<NeedListResponse> result = new ArrayList<>();

        for (NeedListPlanItemRequest item : request.getItems()) {
            NeedList needList = new NeedList();
            needList.setPlanId(planId);
            needList.setFruitId(item.getFruitId());
            needList.setRequiredQuantity(item.getRequiredQuantity());
            needList.setCreatedBy(planOwnerId);
            needList.setNotes(item.getNotes());
            needList.setCreatedDate(LocalDateTime.now());
            needList.setStatus(NeedListStatus.CREATED);

            NeedList savedNeedList = needListRepository.save(needList);

            auditLogService.createLog(
                    requester.getId(),
                    requester.getFullName(),
                    AuditActionType.NEED_LIST_CREATED,
                    "NeedList",
                    savedNeedList.getId(),
                    requester.getFullName() + " Plan #" + planId + " için ekstra ürün ekledi. Kayıt ID: " + savedNeedList.getId()
            );

            result.add(convertToResponse(savedNeedList));
        }

        /*
          Plana yeni urun eklendiginde muduru haberdar et.

          Onemli: mudur alim ekranini acmis, eski urun listesini doldururken
          personel yeni bir urun ekleyebilir. Haber gitmezse mudur o urunu hic
          gormeden alimi kaydetmeye calisir ve "planin tum urunleri birlikte
          gonderilmelidir" hatasina takilir; sebebini de anlayamaz.
          Mudur zaten IHTIYAC_GUNCELLENDI bildirimini dinliyor
          (bkz. PurchaseManagement/index.js).
        */
        notifyPlanManager(
                planId,
                "IHTIYAC_GUNCELLENDI",
                result.size() + " urun plana eklendi (Plan #" + planId + ")."
        );

        return result;
    }

    /*
      Yeni oluşturulan plan için, sistemdeki id'si en küçük MAGAZA_MUDURU'ya bir
      ALIM görevi atar — PurchaseService.completeAlimTaskAndAssignToplama ile
      AYNI desen (findFirstByRoleOrderByIdAsc). Bu görev daha sonra müdür alımı
      tamamladığında PurchaseService tarafından zaten COMPLETED yapılıyordu
      (taskAssignmentRepository.findByPlanIdAndTaskType(planId, TaskType.ALIM)
      .ifPresent(...)) ama şimdiye kadar hiçbir yerde OLUŞTURULMUYORDU — bu
      yüzden "Aktif Görevler" ekranında hiç görünmüyordu.

      Sistemde henüz hiç MAGAZA_MUDURU yoksa görev sessizce atlanır: ihtiyaç
      oluşturma işlemi bundan etkilenmemeli, müdür sisteme sonradan
      eklendiğinde alım yine de PurchaseManagement ekranından (NeedList
      farkına bakan getPendingPurchasePlans üzerinden) yapılabilir.
    */
    private void assignAlimTask(Long planId) {
        userRepository.findFirstByRoleOrderByIdAsc(UserRole.MAGAZA_MUDURU).ifPresent(manager -> {
            TaskAssignment alimTask = new TaskAssignment();
            alimTask.setPlanId(planId);
            alimTask.setAssignedUserId(manager.getId());
            alimTask.setAssignedAt(LocalDateTime.now());
            // Süre, plandaki ürünlere göre hesaplanır (bozulabilir ürün varsa 2, yoksa 4 saat).
            alimTask.setDueDate(taskDeadlineCalculator.calculateDueDate(planId));
            alimTask.setTaskType(TaskType.ALIM);
            alimTask.setStatus(TaskStatus.PENDING);

            TaskAssignment savedTask = taskAssignmentRepository.save(alimTask);

            auditLogService.createLog(
                    manager.getId(),
                    manager.getFullName(),
                    AuditActionType.TASK_ASSIGNED,
                    "TaskAssignment",
                    savedTask.getId(),
                    "Plan #" + planId + " için " + manager.getFullName() + " kullanıcısına alım görevi atandı.",
                    planId,
                    AuditStatus.SUCCESS,
                    null
            );

            notificationService.notifyUser(
                    manager.getId(),
                    "ALIM_GOREVI_ATANDI",
                    "Yeni ihtiyaç oluşturuldu, alım bekleniyor (Plan #" + planId + ")."
            );
        });
    }

    /*
      PLANIN KİLİTLENMESİ.

      Bir plan için ilk alım kaydı oluştuğu anda ihtiyaç satırları dondurulur:
      artık miktar değiştirilemez, ürün eklenemez, plan iptal edilemez.

      Sebebi projenin denetim amacıdır. Müdür "100 kg lazım" bilgisine bakıp
      95 kg alır. Personel sonradan ihtiyacı 120 kg yaparsa denetim, alımı
      gerçekte hiç var olmamış bir sayıyla karşılaştırır ve uydurma bir kayıp
      üretir. Aynı şekilde plan silinirse alım/toplama/kabul kayıtları sahipsiz
      kalır. Geçmişe dönük değişiklik, tüm denetimi anlamsız kılar.

      Not: Aynı kural frontend'de de uygulanır (düzenle/sil butonları gizlenir),
      ama asıl kapı burasıdır - ekran atlanıp doğrudan istek atılabilir.
    */
    private void requirePlanNotPurchased(Long planId, String message) {
        if (planId != null && purchaseRepository.existsByPlanId(planId)) {
            throw new RuntimeException(message);
        }
    }

    /*
      Plana ekstra ürün ekleyebilecek kullanıcıyı doğrular: mağaza müdürü veya
      mağaza personeli. Personelin yalnızca KENDİ planına ekleyebilmesi ayrıca
      addExtraItemsToPlan içinde kontrol edilir.
    */
    private User requireItemAdder(Long userId) {
        if (userId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.MAGAZA_MUDURU
                && user.getRole() != UserRole.MAGAZA_PERSONELI) {
            throw new RuntimeException("Bu işlem için mağaza müdürü veya personeli yetkisi gereklidir");
        }

        return user;
    }

    // Çağıranın var olan ve MAGAZA_MUDURU rolünde bir kullanıcı olduğunu doğrular.
    private User requireManager(Long userId) {
        if (userId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.MAGAZA_MUDURU) {
            throw new RuntimeException("Bu işlem için mağaza müdürü yetkisi gereklidir");
        }

        return user;
    }

    // Çağıranın var olan ve MAGAZA_PERSONELI rolünde bir kullanıcı olduğunu doğrular.
    // ADMIN dahil başka hiçbir rol ihtiyaç planı oluşturamaz/iptal edemez.
    private User requireCreator(Long userId) {
        if (userId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.MAGAZA_PERSONELI) {
            throw new RuntimeException("Bu işlem için mağaza personeli yetkisi gereklidir");
        }

        return user;
    }
}
