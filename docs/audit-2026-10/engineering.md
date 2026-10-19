# J — сборка, тесты, CI

FACT: npm ci завершился, audit npm сообщил 0 vulnerabilities; build без предупреждений создаёт 185 canonical/technical +41 redirects (+Google verification). npm run qa: 56 static +90 browser PASS, SEO и donor-leak PASS. Логи: evidence/npm-ci.txt, build.txt, qa.txt. Локальный Node 24.14.0; CI использует Node 22. Ни package.json, ни lock не менялись. Временные audit-зависимости живут в _tools/audit/runtime/node_modules, игнорируются Git.

Статические tests/* проверяют сохранность данных и URL, каталог/импорты, media, geo-поиск и соседние варианты, подтверждающие бейджи и Offer, builtExamples, общие SEO/формы/контакты. Browser specs проверяют выбранные шаблоны и адаптивные размеры, меню, перенос критериев, согласие/события, mock-success/mock-error форм, виджет, изображения и все 41 redirect. Фикстура временно меняет dist для тестовых сервисов, финальная команда восстанавливает production build. Исходники сайта не переписываются.

_tools/seo-audit.mjs обходит все HTML кроме verification, проверяет ровно один H1, уникальные title/description, canonical/OG/robots, JSON-LD parse, ссылки/медиа/alt/размеры и запреты неподтверждённого Offer/чужого рейтинга. Пределы длины мягче текущего задания, потому зелёный QA совместим с редакционными low-находками. Полного графа/axe/словаря/форматного E.164 в нём нет.

_tools/donor-leak-audit.mjs сканирует текст assets/src/scripts/tests/dist по запрещённым брендам/городам; это не сканер секретов и не детектор всех заимствований.

qa.yml: pull_request, Node22, npm ci, Chromium, npm test, SEO, donor-leak, browser. pages.yml: main push/workflow_dispatch, npm ci, build/test/SEO/donor, публикация dist; browser на deploy повторно не запускается. Правила защиты main проверены отдельным read-only gh API; ответ сохранён main-protection.txt. Не делать вывод о доступности настройки при 404/ошибке API. Этот аудит не меняет workflow или защиту.

29 кандидатов неиспользуемых файлов — unreferenced-assets.csv; 6 функций — dead-code-candidates.json. Это не разрешение удалять файлы. Пустые public feeds builders/projects содержат []; утечки объявлений через них нет. Будущее упрощение требует проверки потребителей и сохранения функций сайта.

Изолированные проверки нельзя запускать на :4186 одновременно с перестройкой dist в QA: на первом дополнительном прогоне это остановило test static-server на исчезнувшем 404.html. Сервер перезапущен после финальной сборки, полный дополнительный сценарий якорей выполнен повторно (391 PASS). Это ошибка организации аудита, не production-баг.
