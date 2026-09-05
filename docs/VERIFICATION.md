# Verification — 2026-09-03

## Analysis, sharing and source refresh — 2026-09-05

- Добавлены область двумя точками и приблизительный прямой маршрут с коридором 100 м. Подсчёт использует только текущие видимые слои/фильтры; CSV и GeoJSON сохраняют ID, координаты, категорию, проверку и источник.
- Полная ссылка восстанавливает положение/масштаб, слои, тему, 2D/3D, покрытие, улицу и выбранную камеру. Неверные координаты, масштаб и слои игнорируются.
- Проверены четыре сохранённых вида, ближайшие публичные камеры, таблица источников, полный экран и клавиши F/R/C/A/T/Escape. Escape больше не закрывает выбранную камеру при закрытии модального снимка.
- Автоматический ITS workflow сравнивает хеш ответа, валидирует 1–10000 точек и создаёт отдельный pull request. Локальная проба 2026-09-05 безопасно остановилась из-за неверифицируемой цепочки TLS официального сервера; существующие данные не изменились, TLS-проверка не отключалась.
- Typecheck, **43 теста** и production build прошли. Браузерный сценарий подтвердил область, маршрут, загрузку CSV, копирование/восстановление полной ссылки, клавиши и мобильную прокрутку без горизонтального переполнения. Старые сценарии избранного, фильтров, 2D/3D, покрытия, поиска 23 сегментов Armii Krajowej, ошибок карты и прямого просмотра камер прошли повторно без необработанных ошибок.

## Themes, languages, install, layers, status and coverage

- Production build включает статический `manifest.webmanifest`, SVG и PNG-иконки 192/512 и локальный service worker. Проверена регистрация service worker и наличие manifest link. Кнопка установки показывает системный prompt, когда браузер его предоставляет, или точную инструкцию через меню/«Добавить на главный экран».
- Светлая/тёмная подложка переключается без перезагрузки; тёмная тема сохраняется после reload. Языки ru/pl/uk/en переключают основные элементы интерфейса и сохраняются; исходные названия и примечания данных не переписываются.
- Восемь слоёв образуют непересекающиеся группы. В браузере отключение ITS уменьшило счётчик карты с 175 до 16 камер, повторное включение восстановило 175.
- Режим покрытия включается отдельно, отображает область недостаточных данных и известные/иллюстративные секторы, затем приближает карту к камерам с полной оптикой. Отсутствие оптики в выбранных слоях показывается прямо в легенде.
- ITS-камера имела статус «Неизвестно» до действия пользователя. Успешная загрузка публичного снимка сменила его на «Работает» и сохранила время издателя; ошибки и пустой ответ используют «Недоступна» только как результат последней ручной проверки.
- Desktop 1440×1000 и mobile 390×844 проверены в Edge. На телефоне весь каталог прокручивается, записи достижимы после новых настроек, горизонтального переполнения нет. Ошибок страницы не обнаружено.

## Street highlighting — latest verification

- Добавлен отдельный поиск улиц Opole с явной отправкой формы, без автодополнения. Ответ Nominatim сокращается до именованных дорожных LineString/MultiLineString внутри заданных границ города; несколько сегментов одного названия объединяются.
- Найденная улица выделяется синей линией с белой обводкой и подписями, карта показывает всю её доступную геометрию. Результат можно убрать из формы или с карты.
- Серверная точка поиска проверяет ввод и ответ, выдерживает паузу между внешними запросами и кеширует результат. Внешний адрес можно заменить через `STREET_GEOCODER_URL`.
- Typecheck, **36 тестов** и production build прошли. Новая серверная точка `/api/streets` собирается как динамический маршрут; главная страница остаётся статической.
- В production Edge поиск `Armii Krajowej` вернул 23 одноимённых дорожных сегмента. До Enter внешний запрос не выполнялся; после отправки вся полученная геометрия появилась на карте, сохранилась в 3D и очистилась одной кнопкой.
- Desktop 1440×1000 и mobile 390×844 проверены визуально. На мобильном экране после поиска каталог закрывается, улица видна на карте, горизонтальной прокрутки нет. Ошибок страницы и Next overlay не было.
- Полный прежний production-сценарий прошёл повторно: избранное, ссылки и история, фильтры, выбор общего маркера, 2D/3D, секторы, мобильный поиск камер, состояния хранилища/буфера и восстановление карты после ошибки.

## Direct camera views — latest verification

- **33 tests passed** after adding the source-locked ITS snapshot contract and four distinct town-hall player URLs. Tests cover mismatched camera IDs, unrelated sources/categories, unsafe filenames, invalid response shapes, empty publications and publisher timestamps across time zones.
- Typecheck and the production build passed without dependency changes. The site remains statically prerendered; individual ITS metadata and JPEG requests originate in the visitor's browser only after a view action.
- A live public ITS response and JPEG for camera `its:1` were displayed in the production UI. The image URL matched the newest valid response item and the displayed `<time>` preserved the publisher's `addTime`. Refresh, close, Escape, focus restoration and the same action from the selected card passed.
- Before the view action, no ITS image API requests occurred. Simulated empty metadata, failed metadata and failed JPEG all displayed bounded, recoverable states with retry and the publisher-map fallback. Retry returned to the real public image.
- All four town-hall list shortcuts opened distinct player pages published in the city's four iframes. Each direct page returned HTTP 200 in ordinary Edge; the app does not embed the video players.
- Desktop 1440×1000 and mobile 390×844 screenshots were inspected. The snapshot dialog, image, source time and actions fit without horizontal overflow. Opening from the mobile list and closing the dialog returned to the still-open list.
- The full existing production scenario passed again: favorites and storage fallbacks, deep links/history, filters, map selection, 2D/3D, sectors, mobile search, clipboard fallback and map error recovery. No unhandled page errors or Next error overlay appeared.

Source evidence and runtime boundaries are in [CAMERA_VIEW_SOURCES.md](CAMERA_VIEW_SOURCES.md).

## Heatmap and administrator workspace — latest verification

- Typecheck, **46 tests** and the production build passed. New tests cover safe parsing of local drafts, immutable camera IDs, coordinate and optics ranges, draft application and complete map-link restoration of the heatmap.
- The heatmap renders only camera records from active filters and layers. In Edge, disabling ITS changed both the map total and heat input from 175 to 16 cameras; 2D/3D and the legend remained usable. Documented objects with unknown camera quantities do not increase density.
- The administrator panel searched by stable ID, edited a record, applied the draft to its map card, persisted it in browser storage, exported a JSON download and reverted it back to the source catalog. The test leaves no saved draft behind.
- Desktop 1440×1000 and mobile 390×844 screenshots were inspected. The full-screen mobile editor scrolls without horizontal overflow. The existing selection, favorites, filters, shared markers, 2D/3D, ITS deep links and map error recovery scenario also passed with no page errors.
- Browser edits are deliberately local and are not authentication or a public write API. Source files change only after a human reviews an exported draft and commits it.

## Public inventory update — latest verification

The current catalog validates **225 records: 175 individual/reported cameras and 53 documented objects**. Added 61 records (8 OSM points and 53 objects); existing source IDs and the four-camera report are preserved. Details and evidence: [PUBLIC_SOURCE_REVIEW.md](PUBLIC_SOURCE_REVIEW.md).

- **29 tests passed**, including separation of site quantities from camera totals, explicit unknown counts, dated published quantities, rejected fabricated optics/viewing links, OSM coordinate fidelity, pending duplicates, private filtering and source-name search.
- **Typecheck and production build passed** on the unchanged locked dependencies. The home page is static. A missing favicon request discovered in the browser was fixed with the Next app icon convention; the final source flow produced no console or unhandled page errors.
- The full previous feature scenario passed against the production build: favorites/reload/cross-tab updates, history/deep links/unknown IDs, filtering, the shared Ratusz marker, ITS 159, 2D/3D, sectors, mobile layout, blocked-storage/clipboard fallback and map error recovery.
- The user-report scenario passed again: four cameras remain one unverified group, with no public-source/viewing URL invented, a separate position source, marker selection, favorites and mobile search.
- New inventory scenario passed: private filter has 5 records (4 documented objects + the reported group), count 4 cameras + 4 objects; OSM filter has 8 records; unknown totals stay unknown; Itaka Arena displays 192 with date while global individual count stays 175.
- Object marker selection, source dialog opening/closing/Escape, favorites for an object, direct links, archival DIP wording, 2D/3D and mobile search were checked.
- Desktop 1440×1000 and mobile 390×844 screenshots were inspected, including the arena card, private object card and scrollable source overview. No horizontal overflow; the mobile card and controls fit.
- A global network-idle wait timed out while the rendered mobile map was already visible. The final check waits for a completed OSM tile near the selected object instead. Canceled obsolete tile requests during navigation are expected; they are not page errors. Live OSM responses and visual screenshots were used, not substitute/mock map images.

Production remains available at port 3001. Current browser verification used standard Playwright with installed Edge because the previously tried native agent-browser connection was unavailable. No TLS exceptions were used. Research dates verify source review, not equipment uptime or exact physical placement.

## Earlier MVP verification

Environment: Windows, Node.js 24.19.0, pnpm 11.19.0, Next.js 16.3.4, MapLibre 5.24.0. Dependencies remain captured in pnpm-lock.yaml; this update adds no packages.

## Automated checks

- TypeScript / Next route types: passed.
- Unit tests: 24 passed. Coverage includes geometry, search/filters, both import formats, rejected malformed/duplicate/unsafe data, favorites storage format, stable camera links and unknown IDs. Report tests check weighted group counts, private/verified filtering, missing public links and rejected misleading provenance/optics.
- The shipped ITS dataset exactly matches the archived public GeoJSON through the adapter. The combined repository validates 164 records representing 167 cameras: 163 from public sources and four in one user-reported group.
- Production build: passed; the home page remains statically prerendered. Browser history and local storage are handled after hydration.
- Import CLI processed the saved official snapshot and atomically wrote 159 normalized records. The previous phase also checked that a rejected empty import preserves existing data.

## Browser checks

Checked both development and production with Playwright using installed Edge. agent-browser's native CDP connection failed in this Windows environment, so standard Playwright was used for the same browser checks. No TLS exceptions were enabled. The report flow was checked on development and production; the full existing feature suite was rerun on production. Next dev rejected its HMR origin at 127.0.0.1, so development was checked at its advertised localhost address. Production at 127.0.0.1:3001 works normally.

- All 164 records reach the map with a total camera count of 167; the list paginates by 50 records. Search matches Polish street names without diacritics, including the four cameras at Niemodlińska / Hallera.
- The private filter displays one report record and a map count of four. The orange entrance marker opens the group directly. Its card shows the user-report warning, tentative ownership, an approximate anchor, three unknown optical values and a separate OSM position reference, with no public-source or video link invented.
- The reported group can be favorited as one item and reopened by direct link after reload. Its marker, count and card worked with 2D/3D, mobile search and the Polish-normalized query `rodziewiczowny`. Desktop and mobile screenshots of the group were inspected; the notice remains readable without horizontal overflow.
- Adding a favorite from the list does not select the camera. Two favorites survived a full reload; the favorites filter applied to both list and map.
- Favorites synchronized between two tabs, including removal of the storage key. Removing the selected favorite while filtering removed its card and URL selection.
- Selection updates `?camera=`; a full reload opens the same card. Back/forward, closing the card, and filters keep URL and selection consistent. Unknown IDs display a message.
- A direct link to `its:159`, beyond the first list page, opens correctly. ITS cards show the source address and three unknown optical values, without fictitious sectors, and link to the publisher's map.
- Clipboard success was checked with an isolated browser stub that captured the exact generated URL. An unavailable Clipboard API displayed a selectable manual-copy field. Local links explain their scope.
- With localStorage blocked, the page remained usable, favorites worked in memory and a storage warning appeared.
- The shared town-hall point opened its camera picker. Selection, 2D/3D, sector visibility and reset worked.
- Desktop 1440×1000 and mobile 390×844 were inspected visually. Mobile search/selection worked, no horizontal overflow appeared, and the public-view action remained visible outside the scrolling card body.
- Aborted OSM requests produced the map error state. Removing the simulated fault and retrying restored the map while retaining the selected ITS card.
- No unhandled page errors occurred in the completed feature checks.

## Public data and limits

See [ITS_SOURCE_REVIEW.md](ITS_SOURCE_REVIEW.md) for the observed public endpoint, snapshot, count and source checksum. The 159 ITS coordinates are source metadata, not an independent survey. The four town-hall views retain an approximate OSM building reference and illustrative optics. All verification flags remain false. The entrance report and search for publicly documented private cameras are recorded in [CAMERA_REPORTS.md](CAMERA_REPORTS.md); OSM verifies the passage location, not camera presence or ownership.

No camera images or video streams were embedded. Stream uptime, optical parameters, building/obstacle visibility and permission to redistribute video were not established. The 3D switch provides map tilt without extruded buildings. Scheduled synchronization is review-first and preserves the previous catalogue on any failure.
