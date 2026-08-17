package com.emre.meyvetakipsistemi.collection;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.collection.dto.*;
import com.emre.meyvetakipsistemi.consistency.ConsistencyCheckService;
import com.emre.meyvetakipsistemi.deliveryplan.DeliveryPlanService;
import com.emre.meyvetakipsistemi.fruit.Fruit;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.purchase.Purchase;
import com.emre.meyvetakipsistemi.purchase.PurchaseRepository;
import com.emre.meyvetakipsistemi.supplier.Supplier;
import com.emre.meyvetakipsistemi.supplier.SupplierRepository;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

// ŞOFÖR'ün toplama (Collection) işlemlerine ait iş mantığını yönetir.
@Service
public class CollectionService {

    private final CollectionRepository collectionRepository;
    private final NeedListRepository needListRepository;
    private final FruitRepository fruitRepository;
    private final PurchaseRepository purchaseRepository;
    private final SupplierRepository supplierRepository;
    private final UserRepository userRepository;
    private final DeliveryPlanService deliveryPlanService;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final AuditLogService auditLogService;
    private final ConsistencyCheckService consistencyCheckService;
    private final TaskDeadlineCalculator taskDeadlineCalculator;

    public CollectionService(
            CollectionRepository collectionRepository,
            NeedListRepository needListRepository,
            FruitRepository fruitRepository,
            PurchaseRepository purchaseRepository,
            SupplierRepository supplierRepository,
            UserRepository userRepository,
            DeliveryPlanService deliveryPlanService,
            TaskAssignmentRepository taskAssignmentRepository,
            AuditLogService auditLogService,
            ConsistencyCheckService consistencyCheckService,
            TaskDeadlineCalculator taskDeadlineCalculator
    ) {
        this.collectionRepository = collectionRepository;
        this.needListRepository = needListRepository;
        this.fruitRepository = fruitRepository;
        this.purchaseRepository = purchaseRepository;
        this.supplierRepository = supplierRepository;
        this.userRepository = userRepository;
        this.deliveryPlanService = deliveryPlanService;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.auditLogService = auditLogService;
        this.consistencyCheckService = consistencyCheckService;
        this.taskDeadlineCalculator = taskDeadlineCalculator;
    }

    /*
      Şoförün, kendisine atanmış bir TOPLAMA görevi için görebileceği güvenli plan
      detayını döner. Purchase kaydına yalnızca tedarikçi bilgisini okumak için
      bakılır; purchasedQuantity/unitPrice/totalPrice/salesPrice hiçbir zaman
      response'a taşınmaz (bkz. buildCollectionPlanItem).
    */
    public CollectionPlanDetailResponse getCollectionPlanDetail(Long driverId, Long planId) {
        User driver = requireDriver(driverId);
        TaskAssignment toplamaTask = requireOwnToplamaTask(planId, driver);

        List<NeedList> needs = needListRepository.findByPlanId(planId);

        if (needs.isEmpty()) {
            throw new RuntimeException("Bu plana ait ihtiyaç kaydı bulunamadı");
        }

        DeliveryPlanService.PlanStoreInfo storeInfo = deliveryPlanService.resolveStoreInfo(planId);

        // Aynı planda aynı meyve için birden fazla NeedList kaydı olabilir; Collection
        // her zaman fruitId bazında tek kayıt tuttuğu için burada da tekilleştirilir.
        Set<Long> planFruitIds = needs.stream()
                .map(NeedList::getFruitId)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<CollectionPlanItemResponse> items = planFruitIds.stream()
                .map(fruitId -> buildCollectionPlanItem(planId, fruitId))
                .toList();

        return new CollectionPlanDetailResponse(planId, storeInfo.storeId(), storeInfo.storeName(), items);
    }

    // Tek bir ürün için şoföre gösterilecek güvenli satırı üretir.
    private CollectionPlanItemResponse buildCollectionPlanItem(Long planId, Long fruitId) {
        Fruit fruit = fruitRepository.findById(fruitId).orElse(null);

        Purchase purchase = purchaseRepository.findByPlanId(planId).stream()
                .filter(item -> fruitId.equals(item.getFruitId()))
                .findFirst()
                .orElse(null);

        Supplier supplier = purchase == null ? null
                : supplierRepository.findById(purchase.getSupplierId()).orElse(null);

        return new CollectionPlanItemResponse(
                fruitId,
                fruit == null ? "Bilinmeyen meyve" : fruit.getName(),
                fruit == null ? null : fruit.getUnit(),
                supplier == null ? null : supplier.getSupplierCode(),
                supplier == null ? "Bilinmeyen tedarikçi" : supplier.getSupplierName(),
                purchase == null ? null : purchase.getNotes()
        );
    }

    /*
      Bir planın tüm ürünleri için tek seferde toplama kaydı oluşturur.
      İşlem @Transactional'dır: doğrulama iki aşamada yapılır (önce hiçbir şey
      kaydetmeden bütün kalemler kontrol edilir, sonra kayıtlar oluşturulur ve
      TOPLAMA görevi tamamlanıp KABUL görevi atanır), bu sayede bir kalem
      geçersizse veya görev ataması başarısızsa veritabanına yarım kayıt yazılmaz.
    */
    @Transactional
    public CollectionResultResponse createCollectionsForPlan(CollectionPlanRequest request) {

        User driver = requireDriver(request.getCreatedBy());

        if (request.getPlanId() == null) {
            throw new RuntimeException("Plan seçilmelidir");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("En az bir ürün için toplama bilgisi girilmelidir");
        }

        TaskAssignment toplamaTask = requireOwnToplamaTask(request.getPlanId(), driver);

        if (toplamaTask.getStatus() == TaskStatus.COMPLETED) {
            throw new RuntimeException("Bu plan için toplama zaten tamamlanmış");
        }

        List<NeedList> needs = needListRepository.findByPlanId(request.getPlanId());

        if (needs.isEmpty()) {
            throw new RuntimeException("Bu plana ait ihtiyaç kaydı bulunamadı");
        }

        Set<Long> planFruitIds = needs.stream().map(NeedList::getFruitId).collect(Collectors.toSet());

        // 1. Aşama: hiçbir kayıt yazılmadan önce bütün kalemler doğrulanır.
        Set<Long> submittedFruitIds = new HashSet<>();

        for (CollectionItemRequest item : request.getItems()) {
            validateCollectionItem(item, request.getPlanId(), planFruitIds, submittedFruitIds);
        }

        /*
          Planın tüm ürünleri tek seferde gönderilmelidir. Kısmi gönderim kabul
          edilmez; aksi halde TOPLAMA görevi COMPLETED yapılırken bazı ürünler
          için hiç Collection kaydı olmayan belirsiz bir durum oluşabilir.
        */
        if (!submittedFruitIds.equals(planFruitIds)) {
            throw new RuntimeException("Planın tüm ürünleri için toplama bilgisi girilmelidir");
        }

        // 2. Aşama: doğrulama tamamlandığına göre kayıtlar güvenle oluşturulabilir.
        List<Collection> savedCollections = new ArrayList<>();

        for (CollectionItemRequest item : request.getItems()) {
            Collection collection = new Collection();
            collection.setPlanId(request.getPlanId());
            collection.setFruitId(item.getFruitId());
            collection.setCollectedQuantity(item.getCollectedQuantity());
            collection.setCollectionDate(LocalDateTime.now());
            collection.setCreatedBy(driver.getId());
            collection.setNotes(item.getNotes());

            savedCollections.add(collectionRepository.save(collection));
        }

        completeToplamaAndAssignTeslimat(request.getPlanId(), toplamaTask, driver);

        auditLogService.createLog(
                driver.getId(),
                driver.getFullName(),
                AuditActionType.COLLECTION_CREATED,
                "Collection",
                request.getPlanId(),
                driver.getFullName() + " Plan #" + request.getPlanId() + " için "
                        + savedCollections.size() + " ürünlük toplama kaydetti."
        );

        /*
          Toplama kaydedildiği anda otomatik denetim: alınan miktar ile toplanan
          miktar tutuyor mu? Tutmuyorsa halde kayıp/hırsızlık olabilir ve bu
          AuditLog'a CRITICAL olarak yazılır (bkz. ConsistencyCheckService).
        */
        consistencyCheckService.runCheck(request.getPlanId(), driver.getId(), driver.getFullName(),
                ConsistencyCheckService.CheckStage.AFTER_COLLECTION);

        return new CollectionResultResponse(
                request.getPlanId(),
                savedCollections.size(),
                "Toplama kaydı tamamlandı. " + savedCollections.size() + " ürün kaydedildi."
        );
    }

    // Tek bir toplama kalemini, herhangi bir kayıt yazmadan önce baştan sona doğrular.
    private void validateCollectionItem(
            CollectionItemRequest item,
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

        if (collectionRepository.existsByPlanIdAndFruitId(planId, item.getFruitId())) {
            throw new RuntimeException("Bu ürün için toplama zaten kaydedilmiş");
        }

        if (item.getCollectedQuantity() == null || item.getCollectedQuantity() <= 0) {
            throw new RuntimeException("Toplanan miktar sıfırdan büyük olmalıdır");
        }
    }

    /*
      Bu metodun görevi: Collection (toplama/alım) tamamlandığında iki şeyi yapmak:
      1) TOPLAMA görevi COMPLETED yapılır.
      2) Aynı plan için daha önce oluşturulmuş bir TESLİMAT görevi yoksa, TOPLAMA'yı
         tamamlayan AYNI şoföre yeni bir TESLİMAT görevi atanır — artık burada
         doğrudan mağaza personeline KABUL (ACCEPTANCE) görevi atanmıyor. KABUL görevi
         artık TESLİMAT tamamlandığında, TaskAssignmentService.completeDelivery()
         içinde oluşturuluyor (bkz. o metottaki assignKabulIfNeeded). Böylece akış:
         Alım Görevi (TOPLAMA) -> Teslimat Görevi (TESLIMAT) -> Kabul Görevi (ACCEPTANCE)
         şeklinde üç adıma çıkar; PurchaseService.completeAlimTaskAndAssignToplama ile
         aynı "aşama tamamlanınca bir sonraki görevi oluştur" deseni korunur.
    */
    private void completeToplamaAndAssignTeslimat(Long planId, TaskAssignment toplamaTask, User driver) {
        toplamaTask.setStatus(TaskStatus.COMPLETED);
        taskAssignmentRepository.save(toplamaTask);

        auditLogService.createLog(
                driver.getId(),
                driver.getFullName(),
                AuditActionType.TASK_COMPLETED,
                "TaskAssignment",
                toplamaTask.getId(),
                "Plan #" + planId + " için ALIM (toplama) görevi tamamlandı."
        );

        boolean teslimatTaskExists = taskAssignmentRepository
                .findByPlanIdAndTaskType(planId, TaskType.TESLIMAT)
                .isPresent();

        if (teslimatTaskExists) {
            return;
        }

        TaskAssignment teslimatTask = new TaskAssignment();
        teslimatTask.setPlanId(planId);
        teslimatTask.setAssignedUserId(driver.getId());
        teslimatTask.setAssignedAt(LocalDateTime.now());
        // Süre, plandaki ürünlere göre hesaplanır (bozulabilir ürün varsa 2, yoksa 4 saat).
        teslimatTask.setDueDate(taskDeadlineCalculator.calculateDueDate(planId));
        teslimatTask.setTaskType(TaskType.TESLIMAT);
        teslimatTask.setStatus(TaskStatus.PENDING);

        TaskAssignment savedTask = taskAssignmentRepository.save(teslimatTask);

        auditLogService.createLog(
                driver.getId(),
                driver.getFullName(),
                AuditActionType.TASK_ASSIGNED,
                "TaskAssignment",
                savedTask.getId(),
                "Plan #" + planId + " için " + driver.getFullName() + " kullanıcısına teslimat görevi atandı."
        );
    }

    /*
      Bu metodun görevi: TESLİMAT görevi ekranında ("Teslimat Görevi") şoföre
      gösterilecek bilgiyi hazırlamak. Kendi kaydettiği Collection satırlarını
      (fruitName, fruitUnit, collectedQuantity) ve mağaza bilgisini döner — yani
      "az önce topladığım ve şimdi teslim edeceğim ürünler" listesidir. Purchase
      kaydındaki fiyat bilgilerine burada da hiç bakılmaz (Collection zaten fiyat
      alanı içermiyor).
    */
    public DeliverySummaryResponse getDeliverySummary(Long driverId, Long planId) {
        User driver = requireDriver(driverId);

        TaskAssignment teslimatTask = taskAssignmentRepository
                .findByPlanIdAndTaskType(planId, TaskType.TESLIMAT)
                .orElseThrow(() -> new RuntimeException("Bu plan için aktif bir teslimat görevi bulunamadı"));

        if (!driver.getId().equals(teslimatTask.getAssignedUserId())) {
            throw new RuntimeException("Bu teslimat görevi size atanmamış");
        }

        List<Collection> collections = collectionRepository.findByPlanId(planId);

        if (collections.isEmpty()) {
            throw new RuntimeException("Bu plana ait toplama kaydı bulunamadı");
        }

        DeliveryPlanService.PlanStoreInfo storeInfo = deliveryPlanService.resolveStoreInfo(planId);

        List<DeliverySummaryItemResponse> items = collections.stream()
                .map(collection -> {
                    Fruit fruit = fruitRepository.findById(collection.getFruitId()).orElse(null);

                    return new DeliverySummaryItemResponse(
                            collection.getFruitId(),
                            fruit == null ? "Bilinmeyen meyve" : fruit.getName(),
                            fruit == null ? null : fruit.getUnit(),
                            collection.getCollectedQuantity()
                    );
                })
                .toList();

        return new DeliverySummaryResponse(planId, storeInfo.storeId(), storeInfo.storeName(), items);
    }

    // Çağıranın var olan ve SOFOR rolünde bir kullanıcı olduğunu doğrular.
    private User requireDriver(Long userId) {
        if (userId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.SOFOR) {
            throw new RuntimeException("Bu işlem için şoför yetkisi gereklidir");
        }

        return user;
    }

    // Planın aktif bir TOPLAMA görevi olduğunu ve bu görevin çağıran şoföre ait
    // olduğunu doğrular (başka bir şoförün görevini tamamlamayı engeller).
    private TaskAssignment requireOwnToplamaTask(Long planId, User driver) {
        TaskAssignment toplamaTask = taskAssignmentRepository
                .findByPlanIdAndTaskType(planId, TaskType.TOPLAMA)
                .orElseThrow(() -> new RuntimeException("Bu plan için aktif bir toplama görevi bulunamadı"));

        if (!driver.getId().equals(toplamaTask.getAssignedUserId())) {
            throw new RuntimeException("Bu toplama görevi size atanmamış");
        }

        return toplamaTask;
    }
}