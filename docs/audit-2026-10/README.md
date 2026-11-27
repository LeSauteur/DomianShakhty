# Навигация и воспроизведение аудита

Начните с [AUDIT_REPORT.md](AUDIT_REPORT.md), затем [PROGRESS.md](PROGRESS.md), [findings.csv](findings.csv), [content-plan.md](content-plan.md) и [implementation-batches.md](implementation-batches.md). Все выводы привязаны к базе b10b812 и наблюдениям 19.10.2026.

CSV: UTF-8 BOM, разделитель ;, значения в кавычках. Слова: Unicode letter/number tokens по main без site-header/footer/nav/script/style/breadcrumbs, с пробелами между HTML-узлами. Формы/варианты карточек внутри main учитываются; это не объём только уникального редакционного текста. Incoming — число вхождений ссылок с других страниц, не уникальных источников; incomingSources отдельно в pages.json. Глубина — BFS статических href, со сквозной навигацией. Последняя колонка inventory — updatedAt/checkedAt источника, либо явно помеченная общая редакция/UNK; lastmod хранится отдельно в evidence/pages.json.

Основные доказательства: browser/ (локально), browser-production/ (живой сайт), forms/filters/mortgage/analytics JSON, all-findings.json, live-http.json, external-sources.json, gzip Lighthouse, screenshots. 168 WebP прочитаны по заголовкам файлов: реальные размеры совпали с данными; авторство — UNK. Все 34 строки owner CSV точно сопоставлены по id/title/address/price: owner-listing-comparison.json.

Команды для нового изолированного worktree (не запускайте на чужих изменениях):

```powershell
npm ci
npm run build
npm install --prefix _tools/audit/runtime --no-save --package-lock=false axe-core@4.14.0 cheerio@1.2.0 nspell@2.1.5 dictionary-ru@3.0.0
$env:AUDIT_REGENERATE='1' # сохраняет существующий PROGRESS
node _tools/audit/inventory.mjs
# отдельный терминал: $env:PORT='4186'; node tests/static-server.mjs
node _tools/audit/browser.mjs
node _tools/audit/interactive.mjs
node _tools/audit/analytics.mjs
node _tools/audit/seo.mjs
node _tools/audit/live.mjs
node _tools/audit/content.mjs
node _tools/audit/security.mjs
# QA запускайте отдельно: он временно перестраивает dist
npm run qa
# после QA: production-сборка восстановлена, test server при необходимости перезапустить
```

Для production sweep задайте AUDIT_PRODUCTION=1. Для повторов выбирайте явную директорию результатов; production resume в browser.mjs не использовать вместе с локальным resume (папки отличаются). Изменение viewport может отменить предыдущий responsive-запрос — проверяйте в чистом контексте. Аналитика тестируется на production-подобном origin с fulfill неизменённого dist и заглушками внешних скриптов; формам никогда не давать уйти в реальную сеть.

Скрипты close-*/finalize формируют отчёты и дописывают checkpoints; для повторного исследования используйте отдельную копию результатов, чтобы не смешать даты и не удвоить строки. Runtime node_modules не коммитится. Исходники сайта и package/lock в этом PR не изменены.
