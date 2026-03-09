# Продолжительность задач (Calendar-style Duration)

Задачи смогут занимать несколько часовых слотов (1–8ч), визуально растягиваясь по вертикали. Создание протяжкой по часам и ресайз перетаскиванием нижней границы.

## Proposed Changes

### 1. Модель данных

#### [MODIFY] [types.ts](file:///Users/maximfedorov/Library/Mobile%20Documents/com~apple~CloudDocs/dev/justplanner/types.ts)
- Добавить `duration?: number` в `Task` (1–8, по умолчанию `undefined` = 1 час)

#### [MODIFY] [schema.sql](file:///Users/maximfedorov/Library/Mobile%20Documents/com~apple~CloudDocs/dev/justplanner/server/schema.sql)
- `ALTER TABLE tasks ADD COLUMN duration INTEGER DEFAULT NULL`

#### [MODIFY] [Task.js](file:///Users/maximfedorov/Library/Mobile%20Documents/com~apple~CloudDocs/dev/justplanner/server/models/Task.js)
- Маппинг `duration` в `syncAll`, `create`, `update`, `findByUserId`

---

### 2. Визуальный рендеринг

#### [MODIFY] [Column.tsx](file:///Users/maximfedorov/Library/Mobile%20Documents/com~apple~CloudDocs/dev/justplanner/components/Column.tsx)

Ключевое изменение: задачи с `duration > 1` визуально перекрывают несколько часовых слотов.

**Подход:** Перейти на `position: relative` контейнер для всех слотов, задачи с `duration` рендерятся с `position: absolute`, `height` = `duration * slotHeight`. Часовые слоты, перекрытые задачей, не рендерят свои задачи повторно.

**Альтернативный (проще):** Задача с `duration=3` рендерится в своём начальном слоте, но с `min-height` = 3 × высоту слота и `overflow: visible` / `position: absolute`. Остальные слоты скрывают перекрытые задачи.

---

### 3. Drag-to-resize (ресайз)

#### [MODIFY] [TaskItem.tsx](file:///Users/maximfedorov/Library/Mobile%20Documents/com~apple~CloudDocs/dev/justplanner/components/TaskItem.tsx)
- Добавить resize-handle (тонкая полоска внизу задачи)
- `onMouseDown` / `onTouchStart` → начинает resize
- `onMouseMove` вычисляет `newDuration` по `deltaY / slotHeight`
- `onMouseUp` → вызывает `onUpdateDuration(taskId, newDuration)`

#### [MODIFY] [App.tsx](file:///Users/maximfedorov/Library/Mobile%20Documents/com~apple~CloudDocs/dev/justplanner/App.tsx)
- Добавить `handleUpdateDuration` callback
- Пробросить через Column → TaskItem

---

### 4. Drag-to-create (создание протяжкой)

#### [MODIFY] [Column.tsx](file:///Users/maximfedorov/Library/Mobile%20Documents/com~apple~CloudDocs/dev/justplanner/components/Column.tsx)
- `onMouseDown` на пустом часовом слоте → запомнить `startHour`
- `onMouseMove` при зажатой кнопке → визуально подсветить диапазон часов
- `onMouseUp` → вызвать `onInitiateQuickAdd(columnId, startHour, duration)`

#### [MODIFY] [App.tsx](file:///Users/maximfedorov/Library/Mobile%20Documents/com~apple~CloudDocs/dev/justplanner/App.tsx)
- Обновить quick add flow, чтобы принимать `duration`

---

### 5. Настройка в модальном окне

#### [MODIFY] [TaskModal.tsx](file:///Users/maximfedorov/Library/Mobile%20Documents/com~apple~CloudDocs/dev/justplanner/components/TaskModal.tsx)
- Добавить selector/slider для `duration` (1–8 часов)

---

## ⚠️ Важные моменты

> [!IMPORTANT]
> Это масштабная фича — затрагивает 7+ файлов, рендеринг колонок, drag-систему, серверный API, и БД.
> Предлагаю **реализовать поэтапно**:
> 1. Сначала — поле `duration` + визуальное отображение (задача занимает N слотов)
> 2. Затем — drag-to-resize нижней границей
> 3. Последним — drag-to-create протяжкой по пустым слотам

> [!WARNING]
> Нужно будет сделать миграцию БД (`ALTER TABLE tasks ADD COLUMN duration`) на сервере.

## Verification Plan

### Этап 1: Визуал
- Задача с `duration: 2` визуально занимает 2 часовых слота
- Обычные задачи (без duration) выглядят как раньше

### Этап 2: Resize
- Потянуть нижнюю границу задачи → меняется duration

### Этап 3: Drag-to-create
- Зажать мышку на пустом слоте → протянуть вниз → создать задачу на N часов
