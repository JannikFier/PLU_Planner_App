# PLU Planner – Test-Checkliste

Systematische Durchführung: Admin (Super-Admin) → User.

---

## Phase 1: Admin/Super-Admin Flow

### 1. Login als Super-Admin
- [ ] `/login` öffnen
- [ ] Tab **E-Mail** wählen
- [ ] Super-Admin E-Mail + Passwort eingeben
- [ ] Login erfolgreich → Redirect zu `/super-admin` (Super-Admin-Dashboard)
- [ ] **Auffälligkeiten:** _______________________________________

---

### 2. Excel-Upload (PLU-Liste hochladen)
- [ ] Auf **PLU Upload** klicken (oder direkt `/super-admin/plu-upload`)
- [ ] **Schritt 1:** Eine oder zwei Excel-Dateien hochladen
  - [ ] Dateityp wird erkannt (Stück/Gewicht)
  - [ ] KW wird aus Dateiname übernommen (oder manuell eingeben)
  - [ ] Bei 2 Dateien: Zuordnung prüfen/anpassen
- [ ] **Schritt 2:** „Vergleich starten“ – Vergleichsergebnis sichtbar
- [ ] **Schritt 3 (falls Konflikte):** Konflikte auflösen
- [ ] **Schritt 4:** „Veröffentlichen“ → Erfolg-Toast
- [ ] Redirect zu Masterliste
- [ ] **Auffälligkeiten:** _______________________________________

**Excel-Format:** Erste Zeile = Header (muss „Stück“ oder „Gewicht“ enthalten), danach Zeilen mit PLU (5 Ziffern) + Artikelname. Dateiname z.B. `KW7_Stück.xlsx` für Auto-Erkennung.

---

### 3. Layout konfigurieren
- [ ] Auf **Layout** klicken (oder `/super-admin/layout`)
- [ ] Sortierung ändern: Alphabetisch / Nach Warengruppen
- [ ] Anzeige-Modus: Gemischt / Getrennt
- [ ] Flussrichtung: Zeilenweise / Spaltenweise
- [ ] Schriftgrößen anpassen
- [ ] Markierungs-Dauer (Rot/Gelb) anpassen
- [ ] Features ein-/ausschalten
- [ ] **Live-Vorschau** rechts aktualisiert sich
- [ ] **Auffälligkeiten:** _______________________________________

---

### 4. Inhalt & Regeln
- [ ] Auf **Inhalt & Regeln** klicken (oder `/super-admin/rules`)
- [ ] **Bezeichnungsregeln:** Neue Regel anlegen (z.B. Keyword „Bio“, Position Prefix)
  - [ ] Live-Vorschau zeigt betroffene Produkte
  - [ ] Speichern → Regel erscheint in Liste
- [ ] **Warengruppen:** Neue Gruppe anlegen (z.B. „Exotik“)
  - [ ] Produkte zuweisen (Checkboxen oder Batch)
  - [ ] Warengruppen sortieren (Drag & Drop oder Pfeile)
- [ ] **Auffälligkeiten:** _______________________________________

---

### 5. Versionen
- [ ] Auf **Versionen** klicken (oder `/super-admin/versions`)
- [ ] Liste der Versionen sichtbar (KW, Status: Aktiv/Entwurf/Archiv)
- [ ] Aktive Version erkennbar
- [ ] (Optional) Version manuell wechseln / archivieren
- [ ] **Auffälligkeiten:** _______________________________________

---

### 6. Benutzer
- [ ] Auf **Benutzer** klicken (oder `/super-admin/users`)
- [ ] Liste der Benutzer sichtbar (Name, Personalnr., Rolle)
- [ ] **Neuer Benutzer:** Anlegen mit Name + Personalnummer (7-stellig)
  - [ ] Einmalpasswort wird angezeigt
  - [ ] User erscheint in Liste
- [ ] **Passwort zurücksetzen:** Bei User klicken → neues Einmalpasswort
- [ ] **Auffälligkeiten:** _______________________________________

---

### 7. Masterliste
- [ ] Auf **Masterliste** klicken (oder `/super-admin/masterlist`)
- [ ] KW-Auswahl funktioniert
- [ ] PLU-Tabelle zeigt alle Produkte (farbige Markierungen: gelb = neu, rot = PLU geändert)
- [ ] **Eigenes Produkt** hinzufügen
- [ ] **Ausblenden** – Auswahl-Modus starten, Produkte auswählen, Ausblenden
- [ ] **PDF** – Export-Dialog öffnen, PDF herunterladen
- [ ] **Ausgeblendete:** Anzahl sichtbar, Link zu ausgeblendeten Produkten
- [ ] **Umbenennen** (Master-Produkt, nur Super-Admin): Rechtsklick/Dialog?
- [ ] **Auffälligkeiten:** _______________________________________

---

### 8. Ausgeblendete Produkte
- [ ] Auf **Ausgeblendete Produkte** klicken (oder `/super-admin/hidden-items`)
- [ ] Liste der ausgeblendeten PLUs
- [ ] Produkte wieder einblenden
- [ ] **Auffälligkeiten:** _______________________________________

---

## Phase 2: User Flow

### 9. Logout & Login als User
- [ ] Abmelden
- [ ] Tab **Personalnr.** wählen
- [ ] 7-stellige Personalnummer + Passwort eingeben
- [ ] Login → Redirect zu `/user` (User-Dashboard)

---

### 10. User: Dashboard & Masterliste
- [ ] User-Dashboard zeigt: PLU-Liste, Benachrichtigungen, Ausgeblendete
- [ ] **Masterliste** öffnen
  - [ ] Sieht die gleiche PLU-Liste (global)
  - [ ] Kein „Neuer Upload“-Button
  - [ ] Kein Zugriff auf Layout/Regeln/Versionen
- [ ] **Eigenes Produkt** hinzufügen (sollte funktionieren)
- [ ] **Ausblenden** (sollte funktionieren)
- [ ] **PDF** exportieren
- [ ] **Benachrichtigungen:** Glocke prüfen (falls neue Version)
- [ ] **Auffälligkeiten:** _______________________________________

---

## Technisches Tracking (im Hintergrund)

- Terminal (Vite/Dev-Server): Fehler/Warnungen prüfen
- Browser-Konsole: Keine roten Fehler bei normalem Ablauf
- Toasts: Erfolg/Fehler-Meldungen konsistent

---

## Checkliste abschließen

Nach dem Durchlauf: Alle Auffälligkeiten hier oder im Chat notieren.
