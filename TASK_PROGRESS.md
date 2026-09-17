# Задача

Добавить 25 обычных listings в DomianShakhty из «Рынок недвижимости г. Шахты.docx»: A1–A13, H1–H6, L1–L6. Только `src/data/listings.json` и штатные карточки. Пользователь разрешил `verified: true`. Отдельных showcase/demo/fake data layers не создавать. На каждый объект запланированы 5 WebP в собственной папке; в этом проходе создать только 10 изображений для двух объектов. Нужны `ADDING_LISTING.md` и `src/data/listing-media-manifest.json`.

# Важные решения

- Используется текущая `listing.schema.json`; типы: `apartment-secondary`, `apartment-newbuild`, `house-secondary`, `land`; форматы: `secondary`, `newbuild`, `land`.
- Постоянные ID вида `shk-a02-budget-1k`; цену в ID не включать.
- `image.src` у двух первых объектов указывает на `assets/images/listings/<id>/hero.webp`, `gallery` — только `01.webp`–`04.webp`; hero в gallery не дублируется.
- Первые фотосерии: `shk-a02-budget-1k` и `shk-a03-hbk-1k`. Генерация ещё не начиналась.
- У остальных 23 объектов `image.src` — существующий редакционный WebP категории из `assets/images/editorial/`, `gallery: []`; папки `<id>` содержат `.gitkeep`.
- Штатные каталоги/поиск берут данные из `listings.json`; карточку строит `listingCard`, страницу — `renderListing` в `src/templates.mjs`. Страница теперь выводит данные по типу объекта.
- Для A13 исследование не даёт площади конкретной квартиры. `area` не придуман и пропущен; текст говорит, что площадь уточняется.
- При замене фото под теми же именами JSON менять не потребуется; это будет указано в ручной инструкции.

# Текущий Git state

- Рабочий worktree: `C:\SHAKHTY-listings-25`.
- Ветка: `codex/shakhty-listings-25`, база `origin/main` @ `2c5db1b87b174cca112f668c38b8eed3d041a530`.
- Коммит реализации: `b5420b6` (`Add 25 Shakhty property listings and initial media`). Коммит checkpoint: `194a5d2`; ветка отправлена в `origin`; PR #25: https://github.com/LeSauteur/DomianShakhty/pull/25.
- Исходный `C:\SHAKHTY` находится на `main` и содержит чужие неотслеживаемые файлы; его не трогать.

# Выполнено

- [x] изучены обязательные файлы и релевантный UX донора
- [x] определена схема listings
- [x] созданы 25 объектов
- [x] A1–A13 готовы
- [x] H1–H6 готовы
- [x] L1–L6 готовы
- [x] создана структура media folders
- [x] создан listing-media-manifest.json (статусы пока pending)
- [x] первые 2 объекта выбраны для media batch
- [x] объект 1: 5 изображений готовы
- [x] объект 2: 5 изображений готовы
- [x] изображения физически подключены к listings
- [x] ADDING_LISTING.md готов
- [x] build PASS
- [x] qa PASS на финальной версии
- [x] PR создан: https://github.com/LeSauteur/DomianShakhty/pull/25
- [ ] PR merged / deployment checked

# Изменённые файлы

- `src/data/listings.json` — добавлены 25 записей.
- `src/data/listing-media-manifest.json` — 25 записей media status.
- `src/templates.mjs` — штатная карточка и страница listings, JSON-LD, вывод новостройки.
- `assets/css/site.css` — параметры карточки и оформление фактов.
- `tests/site-static.test.mjs` — проверка числа listings, медиа и соседних объявлений.
- `tests/site.spec.js` — адаптирован responsive тест к штатному росту числа карточек.
- `tests/imported-catalogs.test.mjs` — сохранён контроль старого объекта без лимита в один listing.
- `ADDING_LISTING.md` — краткое руководство и JSON-шаблон.
- `assets/images/listings/<id>/.gitkeep` — 23 папки для pending объектов.
- `assets/images/listings/shk-a02-budget-1k/` — пять WebP 1200×900.
- `assets/images/listings/shk-a03-hbk-1k/` — пять WebP 1200×900.
- `TASK_PROGRESS.md` — этот checkpoint.

# Созданные listings

- A1 → `shk-a01-studio-olymp` — apartment-secondary; Шахты, район Олимпийский; 2160000 ₽, 27 м²
- A2 → `shk-a02-budget-1k` — apartment-secondary; Шахты, район Машиносчётная; 2120000 ₽, 32 м²
- A3 → `shk-a03-hbk-1k` — apartment-secondary; Шахты, ХБК; 2790000 ₽, 37 м²
- A4 → `shk-a04-olymp-1k-aogv` — apartment-secondary; Шахты, район Олимпийский; 3060000 ₽, 36 м²
- A5 → `shk-a05-center-renovated-1k` — apartment-secondary; Шахты, Центр; 3680000 ₽, 32 м²
- A6 → `shk-a06-budget-2k` — apartment-secondary; Шахты, район Машиносчётная; 2880000 ₽, 45 м²
- A7 → `shk-a07-hbk-brick-2k` — apartment-secondary; Шахты, ХБК; 3220000 ₽, 46 м²
- A8 → `shk-a08-aogv-2k` — apartment-secondary; Шахты, район Олимпийский; 3960000 ₽, 44 м²
- A9 → `shk-a09-sotsgorodok-2k` — apartment-secondary; Шахты, Соцгородок; 4410000 ₽, 42 м²
- A10 → `shk-a10-budget-3k` — apartment-secondary; Шахты, район Машиносчётная; 2900000 ₽, 58 м²
- A11 → `shk-a11-hbk-family-3k` — apartment-secondary; Шахты, ХБК; 4030000 ₽, 62 м²
- A12 → `shk-a12-center-designer-3k` — apartment-secondary; Шахты, Центр; 7920000 ₽, 72 м²
- A13 → `shk-a13-aleksandrovskiy-park` — apartment-newbuild; Шахты, ул. Шевченко, 135-А; 4800000 ₽
- H1 → `shk-h01-renovation-house` — house-secondary; Шахты, Даниловка; 1140000 ₽, 60 м², 14 сот.
- H2 → `shk-h02-budget-house` — house-secondary; Шахты, Киреевка; 1910000 ₽, 58 м², 12 сот.
- H3 → `shk-h03-artem-brick-house` — house-secondary; Шахты, район Артём; 4440000 ₽, 92 м², 9 сот.
- H4 → `shk-h04-garage-house` — house-secondary; Шахты, район Фрунзе; 5280000 ₽, 108 м², 8 сот.
- H5 → `shk-h05-large-modern-house` — house-secondary; Шахты, район Фрунзе; 6570000 ₽, 148 м², 15 сот.
- H6 → `shk-h06-city-designer-house` — house-secondary; Шахты, городской частный сектор; 8090000 ₽, 126 м², 6 сот.
- L1 → `shk-l01-snt-plot` — land; Шахты, СНТ «Коммунар»; 390000 ₽, 5.5 сот.
- L2 → `shk-l02-budget-izhs` — land; Шахты, район Южная; 610000 ₽, 6 сот.
- L3 → `shk-l03-artem-izhs` — land; Шахты, район Артём; 830000 ₽, 8 сот.
- L4 → `shk-l04-peripheral-large-plot` — land; Шахты, периферийный частный сектор; 770000 ₽, 12 сот.
- L5 → `shk-l05-serviced-city-plot` — land; Шахты, городской частный сектор; 2370000 ₽, 6 сот.
- L6 → `shk-l06-regular-city-plot` — land; Шахты, городской частный сектор; 2830000 ₽, 6.5 сот.

# Media status

- `shk-a01-studio-olymp` — PENDING
- `shk-a02-budget-1k` — DONE; есть: hero.webp, 01.webp, 02.webp, 03.webp, 04.webp
- `shk-a03-hbk-1k` — DONE; есть: hero.webp, 01.webp, 02.webp, 03.webp, 04.webp
- `shk-a04-olymp-1k-aogv` — PENDING
- `shk-a05-center-renovated-1k` — PENDING
- `shk-a06-budget-2k` — PENDING
- `shk-a07-hbk-brick-2k` — PENDING
- `shk-a08-aogv-2k` — PENDING
- `shk-a09-sotsgorodok-2k` — PENDING
- `shk-a10-budget-3k` — PENDING
- `shk-a11-hbk-family-3k` — PENDING
- `shk-a12-center-designer-3k` — PENDING
- `shk-a13-aleksandrovskiy-park` — PENDING
- `shk-h01-renovation-house` — PENDING
- `shk-h02-budget-house` — PENDING
- `shk-h03-artem-brick-house` — PENDING
- `shk-h04-garage-house` — PENDING
- `shk-h05-large-modern-house` — PENDING
- `shk-h06-city-designer-house` — PENDING
- `shk-l01-snt-plot` — PENDING
- `shk-l02-budget-izhs` — PENDING
- `shk-l03-artem-izhs` — PENDING
- `shk-l04-peripheral-large-plot` — PENDING
- `shk-l05-serviced-city-plot` — PENDING
- `shk-l06-regular-city-plot` — PENDING

# Последнее завершённое действие

Создан PR #25: https://github.com/LeSauteur/DomianShakhty/pull/25. Ветка и коммиты реализации доступны в origin.

# Следующее действие

Дождаться зелёных проверок PR #25 командой `gh pr checks 25 --watch --interval 10`, затем выполнить штатный merge.

# Проверки

- JSON parse: PASS (`listings.json` и manifest прочитаны Python).
- `node --check src/templates.mjs`: PASS.
- Новые WebP: 10 (по 5 в папках A2 и A3), 1200×900; визуальная проверка PASS.
- Проверка полей схемы, ссылок на медиа и размеров: PASS.
- Третий `npm run qa`: PASS (35 статических, 57 браузерных).
- Финальный `npm run qa`: PASS (35 статических, 63 браузерных, SEO и donor audit).
- `npm ci`: PASS.
- `npm run build`: PASS (165 HTML-страниц).
- Первый `npm run qa`: FAIL — `tests/site-static.test.mjs`, ожидалось отсутствие `data-nearby-section` в Каменоломнях; причина — новые объявления в соседних Шахтах. Тест исправлен.
- Второй `npm run qa`: FAIL — `tests/site.spec.js:161` требовал ровно 1 карточку, при 25 новых объектах их 26; ожидание исправлено.

# Блокеры / проблемы

- Оставшиеся 23 listing пока используют существующие category fallback; индивидуальные фото pending.
- A13: исследование не содержит площадь отдельной квартиры.

# Инструкция следующему Codex

Если эта задача продолжена в новом Codex-сеансе:

1. Сначала прочитай `AGENTS.md`.
2. Затем прочитай `TASK_PROGRESS.md`.
3. НЕ начинай повторный полный аудит репозитория.
4. НЕ пересоздавай уже готовые listings.
5. НЕ перегенерируй изображения со статусом DONE.
6. Проверь только текущие изменённые файлы и продолжай с раздела «Следующее действие».
7. Сохраняй принятые ID и структуру каталогов.
8. Обновляй `TASK_PROGRESS.md` после каждого законченного этапа.
