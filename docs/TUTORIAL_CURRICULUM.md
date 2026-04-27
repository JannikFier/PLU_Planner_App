# Tutorial-Curriculum (Matrix)

Spalten: **Feature** | **Route / UI** | **Rollen** | **Testmodus** | **Task-IDs (Code)** | **Validierung**

Die App setzt die Kette aus `tutorial-registry` (driver.js) plus optional `runTaskQueue` aus [`src/lib/tutorial-interactive-engine.ts`](../src/lib/tutorial-interactive-engine.ts). Rollen kommen aus `useEffectiveRouteRole` (inkl. Super-Admin-User-Vorschau).

## Gemeinsam Obst/Gemüse (Masterliste)

| Feature | Route | Rollen | Testmodus | Task-IDs | Validierung |
|--------|-------|--------|-----------|----------|-------------|
| Dashboard-Kachel | `/user`, `/admin`, `/viewer` | user, admin, viewer | D (Lesen) | basics (driver) | `data-tour` |
| Masterliste Toolbar | `/*/masterlist` | user, admin, viewer | B/C je Aktion | obst (driver) | `data-tour="masterlist-toolbar-actions"` |
| Coach-Vertiefung Obst | `/*/masterlist` + Unterpfade | user, admin | B | `buildObstDeepTasks` | Pfad + Toolbar-`data-tour` |
| Coach Abschluss Obst (Viewer) | `/*/masterlist` | viewer | — (kein Testmodus-Zwang) | `viewer-obst-readonly` | Pfad enthält `/masterlist` |

## Backshop-Liste

| Feature | Route | Rollen | Testmodus | Task-IDs | Validierung |
|--------|-------|--------|-----------|----------|-------------|
| Toolbar | `/*/backshop-list` | user, admin, viewer | B/C | backshop (driver) | `data-tour="backshop-master-toolbar"` |
| Coach-Vertiefung | `/*/backshop-list` + Unterpfade | user, admin | B | `buildBackshopDeepTasks` | Pfad + Toolbar-`data-tour` |
| Coach Viewer | `/*/backshop-list` | viewer | — | `viewer-backshop-readonly` | Pfad enthält `/backshop-list` |

## Admin Benutzer

| Feature | Route | Rollen | Testmodus | Task-IDs | Validierung |
|--------|-------|--------|-----------|----------|-------------|
| Übersicht | `/admin/users` | admin | **A** (Edge-Stub) | users (driver) | Überschrift `data-tour` |
| Interaktive Kette | `/admin/users` | admin | A | `admin-users-open-create`, `admin-users-close-dialog` | Dialog `data-tour` |

## Konfiguration Obst/Backshop (Admin)

| Feature | Route | Rollen | Testmodus | Task-IDs | Validierung |
|--------|-------|--------|-----------|----------|-------------|
| Konfig-Übersicht Backshop | `/admin/backshop/konfiguration` | admin | B | `buildAdminPostBackshopTasks` (Teil) | Pfad |
| Layout / Regeln / Gruppenregeln Backshop | `/admin/backshop-layout`, `…-rules`, `…-gruppenregeln` | admin | B | `buildAdminBackshopKonfigDeepTasks` | Pfad + `data-tour` auf Kacheln |
| Konfig-Übersicht Obst | `/admin/obst/konfiguration` | admin | B | `buildAdminPostObstTasks` (Teil) | Pfad |
| Layout / Regeln Obst | `/admin/layout`, `/admin/rules` | admin | B | `buildAdminObstKonfigDeepTasks` | Pfad + Kacheln |

**Hinweis:** „Warengruppen sortieren (Backshop)“ und Bulk-Aktionen in Warengruppen sind in der Tour **nicht** vorgesehen (Roadmap).

## Vertiefung Listen (Coach)

| Bereich | Task-Datei | Task-IDs (Auszug) | Validierung |
|---------|--------------|-------------------|---------------|
| Backshop User/Admin | [`src/lib/tutorial-curriculum-backshop-deep.ts`](../src/lib/tutorial-curriculum-backshop-deep.ts) | `backshop-deep-*` | Pfad + Toolbar-`data-tour` |
| Obst User/Admin | [`src/lib/tutorial-curriculum-obst-deep.ts`](../src/lib/tutorial-curriculum-obst-deep.ts) | `obst-deep-*` | Pfad + Toolbar-`data-tour` |
| Marken-Auswahl (Tinder) | [`src/lib/tutorial-curriculum-backshop-marken.ts`](../src/lib/tutorial-curriculum-backshop-marken.ts) | `backshop-marken-*` | Pfad + Status-Band/Sidebar |
| Werbung (Obst + Backshop) | [`src/lib/tutorial-curriculum-werbung.ts`](../src/lib/tutorial-curriculum-werbung.ts) | `werbung-obst-*`, `werbung-backshop-*` | Pfad + Toolbar/Werbung-Anker |
| Backshop-Upload (Admin) | [`src/lib/tutorial-curriculum-backshop-upload.ts`](../src/lib/tutorial-curriculum-backshop-upload.ts) | `backshop-upload-*` | `data-tour="backshop-upload-wizard"` |
| Hidden / Renamed / Custom | [`src/lib/tutorial-curriculum-hidden-renamed-custom.ts`](../src/lib/tutorial-curriculum-hidden-renamed-custom.ts) | `detail-obst-*`, `detail-bs-*` | data-tour der Detail-Seiten |
| Admin-Konfig (Layout/Regeln/Gruppenregeln) | [`src/lib/tutorial-curriculum-admin-konfig.ts`](../src/lib/tutorial-curriculum-admin-konfig.ts) | `admin-bs-*`, `admin-obst-*` | Pfad + Konfig-Karten |
| Users (Light) | [`src/lib/tutorial-curriculum-users-light.ts`](../src/lib/tutorial-curriculum-users-light.ts) | `users-light-*` | `data-tour` UserManagement |
| Abschluss | [`src/lib/tutorial-curriculum-closing.ts`](../src/lib/tutorial-curriculum-closing.ts) | `closing-summary`..`closing-wrap` | Acknowledge |

## `data-tour`-Inventar (Auszug, Stand Roadmap)

| Selektor | Komponente / Seite |
|----------|---------------------|
| `profile-menu` | [`AppHeader`](../src/components/layout/AppHeader.tsx) |
| `dashboard-welcome`, `dashboard-card-*` | Dashboards |
| `masterlist-toolbar-actions`, `masterlist-search`, `masterlist-toolbar-eigene-produkte`, `masterlist-toolbar-ausgeblendete` | [`MasterList`](../src/pages/MasterList.tsx) |
| `backshop-master-toolbar`, `backshop-toolbar-suche`, `backshop-toolbar-eigene-produkte`, `backshop-toolbar-ausgeblendete`, `backshop-toolbar-werbung` | [`BackshopMasterList`](../src/pages/BackshopMasterList.tsx) |
| `admin-obst-hub-konfig`, `admin-backshop-hub-konfig` | Admin-Hubs |
| `admin-*-konfig-*-card` | [`AdminObstKonfigurationPage`](../src/pages/AdminObstKonfigurationPage.tsx), [`AdminBackshopKonfigurationPage`](../src/pages/AdminBackshopKonfigurationPage.tsx) |
| `user-management-heading`, `user-management-new-user`, `user-management-create-dialog` | [`UserManagement`](../src/pages/UserManagement.tsx) |
| `unified-notification-bell` | [`UnifiedNotificationBell`](../src/components/plu/UnifiedNotificationBell.tsx) |
| `testmode-exit-button` | [`TestModeBanner`](../src/components/layout/TestModeBanner.tsx) |

## Bekannte Produkt-Risiken (Tutorial-abhängig)

1. **Profil/Dropdown + driver.js:** Overlay kann mit Radix-Menü interagieren; bei „hängendem“ Menü Fokus/Scroll prüfen.
2. **Gruppenregeln + Testmodus:** ✅ gelöst (PR 2.7 / Bug 2). React-Query-Cache wird im Testmodus nicht mehr live ueberschrieben (siehe [`useBackshopSourceRules`](../src/hooks/useBackshopSourceRules.ts), [`useBackshopSourceChoices`](../src/hooks/useBackshopSourceChoices.ts)). Coach-Text in [`tutorial-curriculum-admin-konfig.ts`](../src/lib/tutorial-curriculum-admin-konfig.ts) entsprechend angepasst.
3. **Glocke:** ✅ gelöst (PR 2.7 / Bug 3). Sichtbarkeit jetzt zentral via [`shouldShowNotificationBell`](../src/lib/notification-bell-visibility.ts) (Path-Whitelist). Tests in [`notification-bell-visibility.test.ts`](../src/lib/notification-bell-visibility.test.ts).

## Testmodus-Klassen (Kurz)

- **A:** Edge Functions / `invokeEdgeFunction` → Stub `{ success: true }` (z. B. Nutzer anlegen).
- **B:** `useAppMutation` → kein Persist, Toast.
- **C:** Direkte Writes.
- **D:** rein lesend.

Siehe [`docs/TUTORIAL.md`](TUTORIAL.md) für Pflege und Verhalten bei Replay / Testmodus-Abbruch.
