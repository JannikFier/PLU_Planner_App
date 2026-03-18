# E2E-Test-Vollständigkeit

**Ziel:** `npm run test:e2e:full` testet alle relevanten Flows. Wenn alle grün sind → App ist bereit für Publish.

## Phasen

| Phase | Inhalt | Status |
|-------|--------|--------|
| **1** | Login, Auth, Redirects, Navigation (Dashboard → Masterliste, Backshop) | ✅ Fertig |
| **2** | User: Alle Seiten (Eigene, Ausgeblendete, Werbung, Umbenannte, Backshop-Seiten) | ✅ Fertig |
| **3** | Admin: Alle Seiten + Benutzerverwaltung | ✅ Fertig |
| **4** | Super-Admin: Alle Seiten (Upload, Layout, Regeln, Versionen, Firmen, etc.) | ✅ Fertig |
| **5** | Aktionen (Dialoge öffnen, Formulare – optional) | Später |

## Abdeckung pro Rolle

### Viewer
- [x] Login → /viewer
- [x] Dashboard: PLU-Liste Obst, Backshop
- [x] Masterliste, Backshop-Liste öffnen
- [x] /admin → Redirect

### User
- [x] Login → /user
- [x] Dashboard, Masterliste, Backshop-Liste
- [x] PDF-Button (wenn Version)
- [x] Eigene & Ausgeblendete (/user/hidden-items)
- [x] Eigene Produkte (/user/custom-products)
- [x] Ausgeblendete Produkte (/user/hidden-products)
- [x] Werbung (/user/offer-products)
- [x] Umbenannte (/user/renamed-products)
- [x] Backshop: Eigene, Ausgeblendete, Werbung, Umbenannte
- [x] /super-admin → Redirect

### Admin
- [x] Login → /admin
- [x] Masterliste, Benutzerverwaltung, Neuer Benutzer
- [x] Alle User-Seiten (Eigene, Ausgeblendete, etc.)
- [x] Umbenannte Produkte
- [x] Alle Backshop-Seiten
- [x] /super-admin → Redirect

### Super-Admin (wenn E2E_SUPER_ADMIN_* in .env.e2e)
- [x] Login → /super-admin
- [x] Upload-Seite, Obst-Bereich, Backshop-Bereich
- [x] Benutzerverwaltung
- [x] PLU-Upload-Seite
- [x] Masterliste, Layout, Regeln, Block-Sort, Versionen (Obst)
- [x] Backshop: Liste, Upload, Layout, Regeln, Block-Sort, Versionen, Warengruppen
- [x] Obst: Eigene, Ausgeblendete, Werbung, Umbenannte, Eigene & Ausgeblendete
- [x] Backshop: Eigene, Ausgeblendete, Werbung, Umbenannte
- [x] Firmen & Märkte

## Nicht automatisiert (manuell vor Publish)

- Excel-Datei hochladen (braucht Test-Excel)
- Benutzer anlegen (schreibt in DB)
- PDF-Inhalt prüfen
