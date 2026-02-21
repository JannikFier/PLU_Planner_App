# Refactor: Dashboard und Navigation

Referenz-Dokument für die schrittweise Umsetzung. Nach jedem Schritt abhaken und `npm run build` ausführen.

---

## 1. Super-Admin-Dashboard (Bereiche Obst/Gemüse | Backshop | Benutzer)

- **Obst und Gemüse:** PLU Upload, Benachrichtigungen (Obst/Gemüse), Masterliste, Eigene Produkte, Ausgeblendete, Umbenannte, Layout, Inhalt & Regeln, Block-Sort, Versionen.
- **Backshop:** Backshop Upload, Benachrichtigungen (Backshop), Backshop-Liste, Eigene Produkte (Backshop), Ausgeblendete (Backshop), Umbenannte (Backshop), Layout (Backshop), Inhalt & Regeln (Backshop), Block-Sort (Backshop), Backshop-Versionen.
- **Benutzer:** Eine Kachel/Link „Benutzer“ (Admins und Personal verwalten).

---

## 2. Benachrichtigungen getrennt (Obst/Gemüse vs. Backshop)

- Zwei Kacheln auf dem Super-Admin-Dashboard: „Benachrichtigungen Obst/Gemüse“ → NotificationDialog, „Benachrichtigungen Backshop“ → BackshopNotificationDialog.
- Keine gemeinsame „Benachrichtigungen“-Kachel mehr.

---

## 3. Nur ein Zurück-Pfeil (Header nur)

Seitlichen „Zurück“-Button (ArrowLeft) entfernen auf:

- **Super-Admin:** LayoutSettingsPage, RulesPage, VersionsPage, BlockSortPage, BackshopLayoutSettingsPage, BackshopRulesPage, BackshopVersionsPage, BackshopBlockSortPage
- **Backshop (alle Rollen):** BackshopCustomProductsPage, BackshopHiddenProductsPage, BackshopRenamedProductsPage
- **Obst/Gemüse (User/Admin):** CustomProductsPage, HiddenItems, HiddenProductsPage, RenamedProductsPage
- **Upload:** PLUUploadPage, BackshopUploadPage

---

## 4. Backshop-Masterliste an PLU-Masterliste angleichen

- Toolbar-Zeile mit: Eigenen Produkte, Ausgeblendete, Umbenennen (je nach Rolle), BackshopNotificationBell, PDF.
- rolePrefix aus useAuth/location ableiten. Viewer nur PDF.

---

## 5. Backshop-Layout-Vorschau (BackshopLayoutPreview)

- Neue Komponente `BackshopLayoutPreview.tsx` mit Backshop-Daten.
- In BackshopLayoutSettingsPage einbinden (Zwei-Spalten-Layout).

---

## 6. Checkliste „Obst und Gemüse nicht kaputt“

- [ ] MasterList.tsx, LayoutSettingsPage.tsx, LayoutPreview.tsx unverändert (außer ggf. Zurück-Button)
- [ ] NotificationDialog, NotificationBell, Hooks für Obst/Gemüse unverändert
- [ ] Nach jedem Schritt: `npm run build` + kurzer Test Masterliste/Layout/Upload Obst/Gemüse

---

## Abarbeitung

| # | Schritt | Status |
|---|--------|--------|
| 0 | Planungs-MD anlegen | x |
| 1 | Ein Zurück-Pfeil | x |
| 2 | Backshop-Masterliste angleichen | x |
| 3 | Backshop-Layout-Vorschau | x |
| 4 | Super-Admin-Dashboard strukturieren | x |
| 5 | Benachrichtigungen getrennt | x |
| 6 | Optional: ChangePasswordPage | x |
