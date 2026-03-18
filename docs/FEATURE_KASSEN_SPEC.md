# Feature-Spezifikation: Kassen

> **Status:** Entwurf – später nochmal durchgehen und verfeinern.

## Überblick

Kassen sind ein eigener Benutzertyp für Mitarbeiter an der Kasse. Sie bekommen ein Tablet (iPad) und können damit **nur die PLU-Listen** (Obst/Gemüse + Backshop) ansehen – ohne jegliche Bearbeitungsfunktionen. Sehr niedrige Sicherheitsstufe (einfache Credentials wie 001/001), dafür strikt lesend.

---

## Anforderungen

### 1. Bereich „Kassen“ in der Benutzerverwaltung

- Unter „Benutzer“ gibt es einen zusätzlichen Kasten **„Kassen“**
- Admin und Super-Admin können Kassen anlegen
- Pro Markt (Store) eigene Kassen

### 2. Kasse anlegen

- **Kassennamen** (z.B. „Kasse 1“)
- **Benutzername** (z.B. 001) – nur für die Firma/diesen Markt gültig
- **Passwort** (z.B. 001) – bewusst einfach
- Keine E-Mail, keine Personalnummer

### 3. Login

- Eigener Login-Modus für Kassen (z.B. Tab „Kasse“ neben „Mitarbeiter“)
- Eingabe: Benutzername + Passwort
- Markt wird über die **URL (Subdomain)** bestimmt – siehe unten

### 4. Markt-Zuordnung („marktoptimiert“)

**Problem:** Jede Kasse hat z.B. 001/001. Wie weiß das System, welche PLU-Liste (welcher Markt) gemeint ist?

**Lösung: Der Link bestimmt den Markt.**

- Jeder Markt hat seine eigene Subdomain: `angerbogen.domain.de`, `markt2.domain.de`, …
- Der **Kassen-Link** ist marktspezifisch: `https://angerbogen.domain.de/kasse`
- Admin gibt jeder Kasse / jedem iPad diesen Link
- Beim Öffnen des Links: User ist auf angerbogen.domain.de → StoreContext lädt Angerbach
- Login 001/001 → sucht Kasse 001 **für Angerbach** → nur Angerbachs PLU-Listen

**Kein versehentlicher Zugriff auf andere Märkte:** Wer den Link für Angerbach nutzt, bleibt bei Angerbach. Ein anderes iPad mit Markt2-Link sieht nur Markt2.

### 5. Kassen-Link fürs iPad

In der Kassen-Verwaltung (unter Benutzer):

- **„Kassen-Link für diesen Markt“**
- Anzeige: `https://{subdomain}.domain.de/kasse`
- Button „Link kopieren“
- Optional: QR-Code zum Scannen
- Kurze Anleitung: „Link auf dem iPad öffnen → Teilen → Zum Home-Bildschirm hinzufügen“

So bekommt jede Kasse einen festen, marktspezifischen Link.

### 6. Kassen-UI – direkt in der Liste

- **Kein Dashboard mit Karten** – Kasse landet direkt in der PLU-Ansicht
- Route: `/kasse` → zeigt sofort die kombinierte Ansicht

**Layout:**
- Oben: Header (bleibt gleich)
- Darunter: Suchleiste
- Tabs: „Obst/Gemüse“ | „Backshop“ – Wechsel zwischen den Listen
- Darunter: PLU-Tabelle (je nach Tab)
- **Tablet-optimiert:** Große Touch-Targets, klare Struktur

### 7. Rechte – strikt lesend

Kasse darf **nur**:
- PLU-Liste Obst/Gemüse ansehen
- PLU-Liste Backshop ansehen
- In der Suchleiste suchen
- Zwischen den Listen wechseln
- KW sehen (aktive KW)

Kasse darf **nicht**:
- Eigene Produkte hinzufügen
- Produkte ausblenden
- Produkte umbenennen
- PDF exportieren
- Upload
- Werbung/Angebot
- Benutzerverwaltung
- Layout/Regeln/Versionen
- Markt wechseln (hat nur einen Markt)

---

## Offene Punkte (später klären)

- [ ] PDF für Kassen: Ja oder nein? (aktuell: nein)
- [ ] KW-Auswahl: Nur aktive KW oder auch andere KW wählen?
- [ ] Kassen-Verwaltung: Löschen? Passwort zurücksetzen? Umbenennen?
- [ ] Login-UI: Tab „Kasse“ vs. automatische Erkennung?
- [ ] Wo genau legt Admin Kassen an: pro Markt in der Benutzerverwaltung?

---

## Technischer Überblick (für spätere Implementierung)

- Neue Rolle `kasse` in `profiles`
- Tabelle `kasse_users` (store_id, username, display_name, auth_user_id)
- RPC `lookup_kasse_email(store_id, username)` für Login
- Route `/kasse` mit kombinierter PLU-Ansicht (Obst + Backshop, Tabs)
- `user_store_access`: Kasse hat nur genau einen Store
