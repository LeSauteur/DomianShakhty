# Исследование компаний: не список партнёров

Дата проверки: 19 августа 2026 года.

Этот файл фиксирует только публично обнаруженное присутствие на рынке. Ни одна компания ниже не называется партнёром офиса «Домиан · Шахты на Маяковского». До письменного подтверждения владельца все записи имеют `officePartner: false` и не попадают в публичный каталог.

## Компании и источники

### ДомЛайк

- company: ДомЛайк / ИП Колодяжный Роман Иванович
- website: https://домлайк.рф/
- serviceArea: сайт указывает юридический адрес в Шахтах и демонстрирует индивидуальные жилые дома
- projectTypes: индивидуальные дома под ключ
- source: [официальный сайт](https://xn--80ahqecfn.xn--p1ai/)
- checkedAt: 2026-08-19
- verifiedMarketPresence: true
- officePartner: false
- limitation: характеристики, цены и даты проектов не переносились; деловые отношения с офисом не подтверждены

### ТитанСтрой

- company: ТитанСтрой
- website: https://shahty.titanstroj.ru/stroitelstvo-domov/
- serviceArea: существует отдельная страница услуг для Шахт
- projectTypes: строительство частных домов
- source: [страница услуги](https://shahty.titanstroj.ru/stroitelstvo-domov/)
- checkedAt: 2026-08-19
- verifiedMarketPresence: false
- officePartner: false
- limitation: отдельная посадочная страница не доказывает наличие локального офиса или выполненных объектов; требуется ручная проверка

### СЗ «СТРОЙИНВЕСТ»

- company: ООО «СЗ „СТРОЙИНВЕСТ“»
- website: https://szsinvest.ru/
- serviceArea: город Шахты
- projectTypes: многоквартирные дома, не основной сегмент нового сайта
- source: [официальный сайт](https://szsinvest.ru/)
- checkedAt: 2026-08-19
- verifiedMarketPresence: true
- officePartner: false
- limitation: наличие на рынке подтверждено только как контекст жилого строительства; частные дома и партнёрство с офисом не подтверждены

### СЗ Дома

- company: СЗ Дома
- website: https://sz-doma.ru/
- serviceArea: Ростовская область по заявлению сайта
- projectTypes: частные дома и проекты строительства
- source: [официальный сайт](https://sz-doma.ru/)
- checkedAt: 2026-08-19
- verifiedMarketPresence: false
- officePartner: false
- limitation: работа именно в Шахтах и отношения с офисом не подтверждены

## Решение для публичного сайта

`assets/data/builders.json` и `assets/data/projects.json` поддерживают поля `verified`, `verifiedMarketPresence` и `officePartner`. Публичная генерация возможна только при `verified: true`; текущий каталог застройщиков и проектов остаётся закрытым и показывает честный lead-state.
