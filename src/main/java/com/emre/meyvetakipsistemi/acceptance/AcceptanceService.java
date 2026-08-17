package com.emre.meyvetakipsistemi.acceptance;

import com.emre.meyvetakipsistemi.acceptance.dto.AcceptanceChecklistItemResponse;
import com.emre.meyvetakipsistemi.acceptance.dto.AcceptanceItemRequest;
import com.emre.meyvetakipsistemi.acceptance.dto.AcceptanceRequest;
import com.emre.meyvetakipsistemi.acceptance.dto.CompletedAcceptanceItemResponse;
import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.collection.Collection;
import com.emre.meyvetakipsistemi.collection.CollectionRepository;
import com.emre.meyvetakipsistemi.consistency.ConsistencyCheckService;
import com.emre.meyvetakipsistemi.deliveryplan.DeliveryPlanService;
import com.emre.meyvetakipsistemi.fruit.Fruit;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.mail.PlanSummaryMailService;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.needlist.NeedListStatus;
import com.emre.meyvetakipsistemi.notification.NotificationService;
import com.emre.meyvetakipsistemi.task.TaskAssignment;
import com.emre.meyvetakipsistemi.task.TaskAssignmentRepository;
import com.emre.meyvetakipsistemi.task.TaskStatus;
import com.emre.meyvetakipsistemi.task.TaskType;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import com.emre.meyvetakipsistemi.user.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AcceptanceService {
    private final AcceptanceRepository acceptanceRepository;
    private final AcceptanceItemRepository itemRepository;
    private final NeedListRepository needListRepository;
    private final UserRepository userRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final AuditLogService auditLogService;
    private final FruitRepository fruitRepository;
    private final DeliveryPlanService deliveryPlanService;
    private final CollectionRepository collectionRepository;
    private final NotificationService notificationService;
    private final ConsistencyCheckService consistencyCheckService;
    private final PlanSummaryMailService planSummaryMailService;

    public AcceptanceService(
            AcceptanceRepository acceptanceRepository,
            AcceptanceItemRepository itemRepository,
            NeedListRepository needListRepository,
            UserRepository userRepository,
            TaskAssignmentRepository taskAssignmentRepository,
            AuditLogService auditLogService,
            FruitRepository fruitRepository,
            DeliveryPlanService deliveryPlanService,
            CollectionRepository collectionRepository,
            NotificationService notificationService,
            ConsistencyCheckService consistencyCheckService,
            PlanSummaryMailService planSummaryMailService
    ) {
        this.acceptanceRepository = acceptanceRepository;
        this.itemRepository = itemRepository;
        this.needListRepository = needListRepository;
        this.userRepository = userRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.auditLogService = auditLogService;
        this.fruitRepository = fruitRepository;
        this.deliveryPlanService = deliveryPlanService;
        this.collectionRepository = collectionRepository;
        this.notificationService = notificationService;
        this.consistencyCheckService = consistencyCheckService;
        this.planSummaryMailService = planSummaryMailService;
    }

    /*
      Bir planın fruitId -> Collection kaydı eşlemesini üretir. Hem "teslim
      edilen" miktarı (yalnızca bilgi amaçlı, sınır olarak kullanılmaz) hem de
      şoförün toplama sırasında girdiği notu (driverNote) buradan okunur.
    */
    private Map<Long, Collection> resolveCollectionsByFruit(Long planId) {
        Map<Long, Collection> collectionsByFruit = new HashMap<>();
        for (Collection collection : collectionRepository.findByPlanId(planId)) {
            collectionsByFruit.put(collection.getFruitId(), collection);
        }
        return collectionsByFruit;
    }

    /*
      Doğrulama iki aşamada yapılır: önce hiçbir kayıt yazılmadan bütün kalemler
      ve görev/kullanıcı kontrolleri tamamlanır, sonra kayıtlar oluşturulur.
      Bu sayede bir kalem geçersizse (veya görev bu kullanıcıya ait değilse,
      ya da aynı ürün için ikinci kez kabul gönderilmeye çalışılıyorsa)
      veritabanına hiçbir şey yazılmaz.
    */
    @Transactional
    public Acceptance create(AcceptanceRequest request) {
        if (request.getPlanId() == null || request.getReceivedBy() == null
                || request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Plan, teslim alan kullanıcı ve ürünler zorunludur.");
        }

        User receiver = requireStorePersonnel(request.getReceivedBy());
        TaskAssignment kabulTask = requireAssignedActiveKabulTask(request.getPlanId(), receiver);

        /*
          "Beklenen miktar" mağazanın İSTEDİĞİ miktardır (NeedList.requiredQuantity)
          — doğrulama üst sınırı budur, aşağıdaki collectedByFruit DEĞİL.
          collectedByFruit yalnızca Teslimat'ın gerçekten yapıldığını doğrulamak
          için kullanılır (Kabul, Teslimat'tan önce yapılamaz); "teslim edilen"
          bilgisinin kendisi zaten kalıcı olarak Collection tablosunda durur ve
          "Sonucu Gör" (PlanSummary) ekranı bunu oradan okur — burada ayrıca
          saklanmasına gerek yoktur.
        */
        Map<Long, Collection> collectionsByFruit = resolveCollectionsByFruit(request.getPlanId());

        // Planın henüz kabul edilmemiş tüm NeedList satırları: Purchase/Collection'daki
        // "tüm ürünler birlikte gönderilmeli" kuralı burada da uygulanır, aksi halde
        // bazı ürünler APPROVED olurken bazıları sonsuza kadar CREATED'ta kalabilir ve
        // plan hiçbir zaman "Tamamlanan İşlemler"e taşınamaz.
        List<NeedList> openNeeds = needListRepository.findByPlanId(request.getPlanId()).stream()
                .filter(need -> need.getStatus() == NeedListStatus.CREATED)
                .toList();

        if (openNeeds.isEmpty()) {
            throw new IllegalArgumentException("Bu plan için kabul edilecek açık ürün bulunamadı.");
        }

        Set<Long> openFruitIds = new HashSet<>();
        for (NeedList need : openNeeds) {
            openFruitIds.add(need.getFruitId());
        }

        // 1. Aşama: hiçbir kayıt yazılmadan önce bütün kalemler doğrulanır.
        Set<Long> submittedFruitIds = new HashSet<>();
        List<NeedList> validatedNeeds = new ArrayList<>();

        for (AcceptanceItemRequest requestItem : request.getItems()) {
            NeedList need = needListRepository.findById(requestItem.getNeedListId())
                    .orElseThrow(() -> new IllegalArgumentException("İhtiyaç kaydı bulunamadı."));

            if (!need.getPlanId().equals(request.getPlanId())) {
                throw new IllegalArgumentException("Ürün seçilen plana ait değil.");
            }

            if (!submittedFruitIds.add(need.getFruitId())) {
                throw new IllegalArgumentException("Aynı ürün birden fazla kez gönderildi.");
            }

            if (itemRepository.existsByPlanIdAndFruitId(request.getPlanId(), need.getFruitId())) {
                throw new IllegalArgumentException("Bu ürün için mal kabul zaten kaydedilmiş.");
            }

            if (!collectionsByFruit.containsKey(need.getFruitId())) {
                throw new IllegalArgumentException(
                        "Bu ürün için toplama kaydı bulunamadığından mal kabul yapılamaz.");
            }

            double accepted = requestItem.getAcceptedQuantity() == null ? 0 : requestItem.getAcceptedQuantity();
            double rejected = requestItem.getRejectedQuantity() == null ? 0 : requestItem.getRejectedQuantity();

            // Not: kabul + red toplamının "beklenen" miktarı geçemeyeceği kısıtı
            // kullanıcı isteğiyle kaldırıldı; yalnızca negatif değer engellenir.
            if (accepted < 0 || rejected < 0) {
                throw new IllegalArgumentException("Kabul ve red miktarları negatif olamaz.");
            }

            validatedNeeds.add(need);
        }

        // Planın açık tüm ürünleri tek seferde gönderilmelidir; kısmi gönderim kabul edilmez.
        if (!submittedFruitIds.equals(openFruitIds)) {
            throw new IllegalArgumentException("Planın kabul bekleyen tüm ürünleri birlikte gönderilmelidir.");
        }

        // 2. Aşama: doğrulama tamamlandığına göre kayıtlar güvenle oluşturulabilir.
        Acceptance acceptance = new Acceptance();
        acceptance.setPlanId(request.getPlanId());
        acceptance.setReceivedBy(request.getReceivedBy());
        Acceptance saved = acceptanceRepository.save(acceptance);

        for (int i = 0; i < request.getItems().size(); i++) {
            AcceptanceItemRequest requestItem = request.getItems().get(i);
            NeedList need = validatedNeeds.get(i);

            double accepted = requestItem.getAcceptedQuantity() == null ? 0 : requestItem.getAcceptedQuantity();
            double rejected = requestItem.getRejectedQuantity() == null ? 0 : requestItem.getRejectedQuantity();

            AcceptanceItem item = new AcceptanceItem();
            item.setAcceptanceId(saved.getId());
            item.setPlanId(request.getPlanId());
            item.setNeedListId(need.getId());
            item.setFruitId(need.getFruitId());
            item.setExpectedQuantity(need.getRequiredQuantity());
            item.setAcceptedQuantity(accepted);
            item.setRejectedQuantity(rejected);
            item.setDamaged(Boolean.TRUE.equals(requestItem.getDamaged()));
            item.setRejectionReason(requestItem.getRejectionReason());
            itemRepository.save(item);

            need.setStatus(NeedListStatus.APPROVED);
            needListRepository.save(need);
        }

        kabulTask.setStatus(TaskStatus.COMPLETED);
        taskAssignmentRepository.save(kabulTask);

        // Log, tüm kayıtlar başarıyla yazıldıktan ve görev tamamlandıktan sonra
        // atılır (Purchase/Collection ile aynı desen); bir hata olsaydı yöntem
        // burayı görmeden exception fırlatıp @Transactional ile geri alınırdı,
        // bu yüzden başarısız işlem için asla sahte bir "başarılı" log oluşmaz.
        auditLogService.createLog(
                receiver.getId(),
                receiver.getFullName(),
                AuditActionType.ACCEPTANCE_CREATED,
                "Acceptance",
                request.getPlanId(),
                receiver.getFullName() + " Plan #" + request.getPlanId() + " için "
                        + request.getItems().size() + " ürünlük mal kabul kaydetti."
        );

        notificationService.notifyUser(
                receiver.getId(),
                "KABUL_TAMAMLANDI",
                "Mal kabul tamamlandı (Plan #" + request.getPlanId() + ")."
        );

        /*
          Planın son aşaması tamamlandı: dört karşılaştırmanın tamamı burada
          çalışır (İhtiyaç-Alım, Alım-Toplama, Toplama-Kabul, İhtiyaç-Kabul).
          Taşıma sırasındaki kayıp/hırsızlık ancak bu noktada tespit edilebilir.
        */
        consistencyCheckService.runCheck(request.getPlanId(), receiver.getId(), receiver.getFullName(),
                ConsistencyCheckService.CheckStage.AFTER_ACCEPTANCE);

        /*
          Plan tamamlandı: sürecin tamamını (ihtiyaç/alım/toplama/kabul tablosu ve
          finansal kayıp özeti) içeren HTML mail, işlemi yapan personellere ve
          adminlere gönderilir. Mail gönderilemese bile mal kabul geçerli kalır.
        */
        planSummaryMailService.sendPlanCompletedMail(
                request.getPlanId(), receiver.getId(), receiver.getFullName());

        return saved;
    }

    /*
      Kabul ekranının, kaydetmeden ÖNCE göstereceği "beklenen miktar" listesini
      döner. expectedQuantity, create()'deki AYNI kaynaktan (NeedList.requiredQuantity)
      gelir; artık doğrulama sınırı olarak kullanılmasa da referans olarak gösterilir.
      Ayrıca şoförün toplama sırasında girdiği notu (driverNote) da taşır.
    */
    public List<AcceptanceChecklistItemResponse> getAcceptanceChecklist(Long userId, Long planId) {
        User receiver = requireStorePersonnel(userId);
        requireAssignedActiveKabulTask(planId, receiver);

        Map<Long, Collection> collectionsByFruit = resolveCollectionsByFruit(planId);

        List<NeedList> openNeeds = needListRepository.findByPlanId(planId).stream()
                .filter(need -> need.getStatus() == NeedListStatus.CREATED)
                .toList();

        List<AcceptanceChecklistItemResponse> result = new ArrayList<>();

        for (NeedList need : openNeeds) {
            Fruit fruit = fruitRepository.findById(need.getFruitId()).orElse(null);
            Collection collection = collectionsByFruit.get(need.getFruitId());

            result.add(new AcceptanceChecklistItemResponse(
                    need.getId(),
                    need.getFruitId(),
                    fruit == null ? "Bilinmeyen meyve" : fruit.getName(),
                    fruit == null ? null : fruit.getUnit(),
                    need.getRequiredQuantity(),
                    collection == null ? null : collection.getCollectedQuantity(),
                    collection == null ? null : collection.getNotes()
            ));
        }

        return result;
    }

    /*
      "Tamamlanan İşlemler" ekranı için geçmiş mal kabul kayıtlarını döner.
      MAGAZA_PERSONELI yalnızca kendi yaptığı kabulleri görür; ADMIN salt
      okunur olarak herkesinkini görür. Yeni bir tablo kullanmaz — mevcut
      Acceptance/AcceptanceItem kayıtları ürün bazında düzleştirilerek okunur.
    */
    public List<CompletedAcceptanceItemResponse> getCompletedAcceptances(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        List<Acceptance> acceptances;

        if (user.getRole() == UserRole.ADMIN) {
            acceptances = acceptanceRepository.findAllByOrderByCreatedAtDesc();
        } else if (user.getRole() == UserRole.MAGAZA_PERSONELI) {
            acceptances = acceptanceRepository.findByReceivedByOrderByCreatedAtDesc(userId);
        } else {
            throw new RuntimeException("Bu işlem için yetkiniz yok");
        }

        List<CompletedAcceptanceItemResponse> result = new ArrayList<>();

        for (Acceptance acceptance : acceptances) {
            DeliveryPlanService.PlanStoreInfo storeInfo =
                    deliveryPlanService.resolveStoreInfo(acceptance.getPlanId());

            String receivedByName = userRepository.findById(acceptance.getReceivedBy())
                    .map(User::getFullName)
                    .orElse("Bilinmeyen kullanıcı");

            List<AcceptanceItem> items = itemRepository.findByAcceptanceId(acceptance.getId());

            for (AcceptanceItem item : items) {
                Fruit fruit = fruitRepository.findById(item.getFruitId()).orElse(null);

                result.add(new CompletedAcceptanceItemResponse(
                        acceptance.getId(),
                        acceptance.getPlanId(),
                        storeInfo.storeName(),
                        fruit == null ? "Bilinmeyen meyve" : fruit.getName(),
                        fruit == null ? null : fruit.getUnit(),
                        item.getAcceptedQuantity(),
                        item.getRejectedQuantity(),
                        item.getDamaged(),
                        item.getRejectionReason(),
                        acceptance.getCreatedAt(),
                        receivedByName
                ));
            }
        }

        return result;
    }

    // Çağıranın var olan ve MAGAZA_PERSONELI rolünde bir kullanıcı olduğunu doğrular.
    private User requireStorePersonnel(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı."));

        if (user.getRole() != UserRole.MAGAZA_PERSONELI) {
            throw new IllegalArgumentException("Bu işlem için mağaza personeli yetkisi gereklidir.");
        }

        return user;
    }

    /*
      Planın KABUL (ACCEPTANCE) görevinin var olduğunu, bu kullanıcıya atandığını
      ve henüz COMPLETED olmadığını (yalnızca PENDING/IN_PROGRESS iken kabul
      tamamlanabilir) doğrular.
    */
    private TaskAssignment requireAssignedActiveKabulTask(Long planId, User receiver) {
        TaskAssignment kabulTask = taskAssignmentRepository
                .findByPlanIdAndTaskType(planId, TaskType.ACCEPTANCE)
                .orElseThrow(() -> new IllegalArgumentException("Bu plan için aktif bir kabul görevi bulunamadı."));

        if (!receiver.getId().equals(kabulTask.getAssignedUserId())) {
            throw new IllegalArgumentException("Bu kabul görevi size atanmamış.");
        }

        if (kabulTask.getStatus() == TaskStatus.COMPLETED) {
            throw new IllegalArgumentException("Bu plan için mal kabul zaten tamamlanmış.");
        }

        return kabulTask;
    }
}