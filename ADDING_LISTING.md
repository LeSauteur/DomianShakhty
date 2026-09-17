# Как добавить объект вручную

1. Скопируйте запись из `src/data/listings.json` и задайте новый постоянный `id` латиницей, без цены в имени.
2. Укажите `type` и `format`: квартира вторичка — `apartment-secondary` / `secondary`, новостройка — `apartment-newbuild` / `newbuild`, дом — `house-secondary` / `secondary`, участок — `land` / `land`.
3. Обновите `title`, `price` (рубли числом), `area` (м² для квартиры/дома), `landArea` (сотки для дома/участка), `rooms`, `address`, `description`, `features`, `status` и `updatedAt`. Если точный адрес неизвестен, укажите район без номера дома.
4. Создайте `assets/images/listings/<id>/` и положите туда ровно пять WebP 4:3, желательно 1200×900: `hero.webp`, `01.webp`, `02.webp`, `03.webp`, `04.webp`.
5. Пропишите пути: `image.src` → `hero.webp`, четыре элемента `gallery` → `01.webp`–`04.webp`. Для всех изображений укажите понятный `alt` и реальные `width` / `height`.
6. Проверьте цену, характеристики, право размещения и фотографии. После проверки поставьте `verified: true`. Установите `status: "available"` для объекта в продаже.
7. Добавьте `id` в `src/data/listing-media-manifest.json` со статусом `done` и пятью именами файлов.
8. Выполните `npm run build`, затем `npm run qa`.

## Шаблон записи

```json
{
  "id": "shk-a14-example-1k",
  "type": "apartment-secondary",
  "format": "secondary",
  "verified": true,
  "title": "Продаётся 1-комнатная квартира в Шахтах",
  "location": "shakhty",
  "address": "Шахты, район ХБК",
  "price": 2790000,
  "area": 37,
  "rooms": 1,
  "status": "available",
  "description": "1-комнатная квартира площадью 37 м² в районе ХБК. Хорошее жилое состояние.",
  "features": ["Балкон", "Кирпичный дом"],
  "updatedAt": "2026-09-17",
  "image": { "src": "assets/images/listings/shk-a14-example-1k/hero.webp", "alt": "Главная комната квартиры в ХБК", "width": 1200, "height": 900 },
  "gallery": [
    { "src": "assets/images/listings/shk-a14-example-1k/01.webp", "alt": "Другой ракурс комнаты", "width": 1200, "height": 900 },
    { "src": "assets/images/listings/shk-a14-example-1k/02.webp", "alt": "Прихожая квартиры", "width": 1200, "height": 900 },
    { "src": "assets/images/listings/shk-a14-example-1k/03.webp", "alt": "Кухня квартиры", "width": 1200, "height": 900 },
    { "src": "assets/images/listings/shk-a14-example-1k/04.webp", "alt": "Балкон квартиры", "width": 1200, "height": 900 }
  ]
}
```

## Как заменить фотографии

Замените WebP под теми же именами в папке объекта. Если имена и размеры не меняются, `listings.json` менять не нужно. Запустите `npm run build` и `npm run qa`.
