# Test & Release – Ganze App im Blick

Diese Datei dient als zentrale Übersicht aller App-Bereiche und als Checkliste vor einem Release. Sie deckt **alle Rollen** (Viewer, User, Admin, Super-Admin) und **beide Bereiche** (Obst/Gemüse + Backshop) ab.

## Vor dem Release

- [ ] **Unit-Tests:** `npm run test:run` – alle grün
- [ ] **Build:** `npm run build` – ohne Fehler
- [ ] **E2E (optional):** Dev-Server starten, dann `npm run test:e2e` – siehe Abschnitt E2E unten
- [ ] **Manuelle Checkliste** unten pro Rolle durchgehen (mindestens Smoke)

---

## Routen-Matrix (Rolle × Route)

Welche Rolle darf welche Route nutzen? Super-Admin hat Zugriff auf alle Bereiche; Admin auf Admin + User-Inhalte (über Admin-Routen); User nur auf User-Routen; Viewer nur auf Viewer-Routen. Geschützte Routen leiten bei fehlender Rolle um (z. B. Viewer auf `/admin` → Redirect zu `/viewer`).

| Route | Viewer | User | Admin | Super-Admin |
|-------|:------:|:----:|:-----:|:------------:|
| `/login` | ✅ (nur zum Login) | ✅ | ✅ | ✅ |
| `/change-password` | ✅ | ✅ | ✅ | ✅ |
| **User-Bereich** | | | | |
| `/user` | ❌→/viewer | ✅ | ❌→/admin | ❌→/super-admin |
| `/user/masterlist` | ❌ | ✅ | ❌ | ❌ |
| `/user/hidden-items` | ❌ | ✅ | ❌ | ❌ |
| `/user/custom-products` | ❌ | ✅ | ❌ | ❌ |
| `/user/hidden-products` | ❌ | ✅ | ❌ | ❌ |
| `/user/backshop-list` | ❌ | ✅ | ❌ | ❌ |
| `/user/backshop-custom-products` | ❌ | ✅ | ❌ | ❌ |
| `/user/backshop-hidden-products` | ❌ | ✅ | ❌ | ❌ |
| `/user/backshop-renamed-products` | ❌ | ✅ | ❌ | ❌ |
| **Viewer-Bereich** | | | | |
| `/viewer` | ✅ | ❌→/user | ❌→/admin | ❌→/super-admin |
| `/viewer/masterlist` | ✅ | ❌ | ❌ | ❌ |
| `/viewer/backshop-list` | ✅ | ❌ | ❌ | ❌ |
| **Admin-Bereich** | | | | |
| `/admin` | ❌ | ❌ | ✅ | ❌→/super-admin |
| `/admin/masterlist` | ❌ | ❌ | ✅ | ❌ |
| `/admin/hidden-items` | ❌ | ❌ | ✅ | ❌ |
| `/admin/custom-products` | ❌ | ❌ | ✅ | ❌ |
| `/admin/hidden-products` | ❌ | ❌ | ✅ | ❌ |
| `/admin/renamed-products` | ❌ | ❌ | ✅ | ❌ |
| `/admin/backshop-list` | ❌ | ❌ | ✅ | ❌ |
| `/admin/backshop-custom-products` | ❌ | ❌ | ✅ | ❌ |
| `/admin/backshop-hidden-products` | ❌ | ❌ | ✅ | ❌ |
| `/admin/backshop-renamed-products` | ❌ | ❌ | ✅ | ❌ |
| `/admin/users` | ❌ | ❌ | ✅ | ❌ |
| **Super-Admin-Bereich** | | | | |
| `/super-admin` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/obst` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/backshop` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/masterlist` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/hidden-items` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/custom-products` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/hidden-products` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/renamed-products` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/plu-upload` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/backshop-list` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/backshop-custom-products` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/backshop-hidden-products` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/backshop-renamed-products` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/backshop-upload` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/layout` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/rules` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/block-sort` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/backshop-layout` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/backshop-rules` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/backshop-block-sort` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/versions` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/backshop-versions` | ❌ | ❌ | ❌ | ✅ |
| `/super-admin/users` | ❌ | ❌ | ❌ | ✅ |

---

## Manuelle Test-Checkliste (pro Rolle)

Vor einem Release kann jede Rolle einmal durchgespielt werden. Pro Schritt: Seite lädt, keine 404, erwartete Überschriften/Buttons sichtbar.

### Als Viewer

- [ ] Login (E-Mail/Passwort) → Redirect auf `/viewer`
- [ ] Dashboard: Karten „PLU-Liste Obst/Gemüse“ und „PLU-Liste Backshop“ sichtbar
- [ ] Klick „PLU-Liste Obst/Gemüse“ → `/viewer/masterlist` – Tabelle oder „Keine Daten“ sichtbar, kein 404
- [ ] Zurück zum Dashboard, Klick „PLU-Liste Backshop“ → `/viewer/backshop-list` – Inhalt sichtbar
- [ ] Prüfung: Kein Link „Upload“, keine „Benutzerverwaltung“, keine „Eigene Produkte“ in der Navigation
- [ ] Optional: Direktaufruf `/admin` im Browser → Redirect zu `/viewer`

### Als User

- [ ] Login → Redirect auf `/user`
- [ ] Dashboard: Karten u. a. Masterliste, Eigene Produkte, Ausgeblendete, Backshop-Liste sichtbar
- [ ] Masterliste öffnen → `/user/masterlist` – lädt ohne Fehler
- [ ] Eigene & Ausgeblendete → `/user/hidden-items` – lädt
- [ ] Eigene Produkte → `/user/custom-products` – lädt
- [ ] Ausgeblendete Produkte → `/user/hidden-products` – lädt
- [ ] Backshop-Liste → `/user/backshop-list` – lädt
- [ ] Backshop: Eigene Produkte, Ausgeblendete, Umbenannte ansteuern – alle laden
- [ ] Prüfung: Keine Links zu Layout, Versionen, Upload, Benutzerverwaltung
- [ ] Optional: Direktaufruf `/super-admin` → Redirect zu `/user`

### Als Admin

- [ ] Login → Redirect auf `/admin`
- [ ] Dashboard: PLU-Listen (Obst + Backshop), Umbenannte, Benutzerverwaltung sichtbar
- [ ] Masterliste, Hidden Items, Custom Products, Hidden Products, Backshop-Seiten wie User-Bereich ansteuern – alle laden
- [ ] Umbenannte Produkte → `/admin/renamed-products` – lädt
- [ ] Benutzerverwaltung → `/admin/users` – Liste sichtbar
- [ ] Optional: Direktaufruf `/super-admin` → Redirect zu `/admin` (oder erwarteter Bereich)

### Als Super-Admin

- [ ] Login → Redirect auf `/super-admin`
- [ ] Dashboard: Karten „Obst/Gemüse“, „Backshop“, „Benutzerverwaltung“ sichtbar
- [ ] Klick „Obst/Gemüse“ → Bereichsseite mit Links zu Masterliste, Upload, Layout, Regeln, Versionen usw.
- [ ] Einzelne Seiten nur öffnen: Layout, Regeln, Block-Sort, Versionen, PLU-Upload, Masterliste, Eigene/Ausgeblendete/Umbenannte – alle laden ohne Fehler
- [ ] Zurück, Klick „Backshop“ → Bereichsseite mit Backshop-Liste, Upload, Layout, Regeln, Versionen
- [ ] Backshop-Seiten ansteuern: Backshop-Liste, Backshop-Upload, Backshop-Layout, Backshop-Regeln, Backshop-Block-Sort, Backshop-Versionen – alle laden
- [ ] Benutzerverwaltung → `/super-admin/users` – lädt

---

## E2E-Tests (Playwright)

Automatisierte User-Journeys (Login, Navigation, Redirects) liegen unter `e2e/`. Sie benötigen laufenden Dev-Server und konfigurierte Test-Accounts (siehe `.env.e2e.example`).

- **Ausführung:** `npm run test:e2e` (Dev-Server vorher mit `npm run dev` starten)
- **UI-Modus:** `npm run test:e2e:ui`

Details und Test-Account-Setup siehe [TESTING.md](TESTING.md) bzw. `.env.e2e.example`.
