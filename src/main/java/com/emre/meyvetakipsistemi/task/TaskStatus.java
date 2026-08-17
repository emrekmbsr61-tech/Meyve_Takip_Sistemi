package com.emre.meyvetakipsistemi.task;
/*
  Bir görevin durumu.

  OVERDUE: son teslim zamanı (dueDate) geçtiği halde tamamlanmamış görev.
  Bu değeri kullanıcı değil, arka planda çalışan OverdueTaskScheduler atar.
*/
public enum TaskStatus { PENDING, IN_PROGRESS, COMPLETED, OVERDUE }
