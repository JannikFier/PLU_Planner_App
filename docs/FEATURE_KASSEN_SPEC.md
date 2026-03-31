# Feature-Spezifikation: Kassen

> **Status:** Entwurf – später nochmal durchgehen und verfeinern.

## Überblick

Kassen sind ein eigener Benutzertyp für Mitarbeiter an der Kasse. Sie bekommen ein Tablet (iPad) und nutzen damit primär die **PLU-Listen** (Obst/Gemüse + Backshop): **ansehen, suchen, zwischen Listen wechseln**. Zusätzlich können sie **Meldungen** absetzen (z. B. fehlendes Produkt, falscher Name/PLU, falsches Bild) – **ohne** die Stammdaten in der App selbst zu bearbeiten. Sehr niedrige Sicherheitsstufe (einfache Credentials wie 001/001).

---

## Was die Kasse alles kann (Funktionsumfang)

- **Listen nutzen:** PLU-Liste Obst/Gemüse und PLU-Liste Backshop einsehen (siehe Layout unten).
- **Suchen:** In der Suchleiste nach Artikeln filtern.
- **Wechseln:** Zwischen Obst/Gemüse und Backshop umschalten.
- **Kalenderwoche:** Aktive KW erkennen (Details: offene Punkte).
- **Meldungen:** Über ein Popup am Produkt oder für fehlende Artikel Rückmeldungen an die Organisation senden (siehe Abschnitt „Meldungen“) – **kein** direktes Editieren von PLU, Namen oder Bildern in der Datenbank.

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

**Layout (von oben nach unten):**
- **Header** (wie gewohnt, marktbezogen)
- **Bereichsauswahl nebeneinander:** Links **„Obst/Gemüse“**, rechts daneben **„Backshop“** – klar als zwei große, tablet-taugliche Schaltflächen oder Segment-Steuerung (nicht versteckt in einem kleinen Tab)
- **Suchleiste** unter der Bereichsauswahl
- **Liste:** Darunter die passende PLU-Tabelle zum gewählten Bereich
- **Tablet-optimiert:** Große Touch-Targets, viel Weißraum, gut lesbar von der Kasse aus

### 6a. Meldungen (Popup) – fehlende oder falsche Einträge

Kassierer sollen **Probleme melden** können, ohne die Stammdaten selbst zu ändern. Die genaue **Bedienung auf dem Tablet** ist noch zu validieren (z. B. **langes Drücken** vs. **Doppel-Tap** auf eine Zeile – beides typische Optionen; final per Usability am Gerät festlegen).

**Aktion öffnet ein Pop-up (Modal/Dialog)** mit zwei grundsätzlichen Wegen:

1. **„Produkt fehlt komplett“** (auch ohne vorher eine Zeile gewählt zu haben – z. B. eigener Button in der Leiste oder Eintrag im Popup)
   - Oben klar als Meldungstyp: **Produkt fehlt**
   - Kassierer trägt die **nötigen Angaben** ein (z. B. PLU und/oder Name, Freitext – genaue Felder später festlegen), ggf. Bezug zur aktuellen KW

2. **Melden zu einem konkreten Listeneintrag** (nach Gest auf **dieser** Zeile)
   - Kassierer wählt im Popup, **was nicht stimmt**, z. B.:
     - **Produktname falsch**
     - **PLU-Nummer falsch**
     - **Backshop:** zusätzlich **Bild passt nicht** / falsches Bild (wo sinnvoll auch bei Obst/Gemüse klären, ob Bild-Meldungen nötig sind)

**Wichtig:** Die Kasse **ändert keine Daten** in der PLU-Liste – sie erzeugt nur eine **Meldung** (Ticket/Hinweis), den Admin/Abteilung später bearbeiten kann.

### 6b. Anzeige der Meldungen in Obst/Gemüse und Backshop (für Personal & Leitung)

Die Meldungen sollen **nicht nur irgendwo in einem separaten Postfach** landen, sondern dort sichtbar werden, wo die Kollegen ohnehin arbeiten: **in der jeweiligen PLU-Liste** – getrennt nach Bereich (**Obst/Gemüse** bzw. **Backshop**), passend zum Markt.

**Grundidee:**
- Zu einer **konkreten Zeile** gehörende Meldungen (Name falsch, PLU falsch, Bild falsch): In der **normalen Listen-Ansicht** (User, Admin, Super-Admin – je nach Rechten) erscheint an dieser Zeile ein **Hinweis**, dass **an der Kasse** etwas gemeldet wurde.
- **„Produkt fehlt komplett“:** Wo es keine Zeile gibt, braucht es eine andere Darstellung – z. B. **Hinweis-Bereich** oberhalb oder unterhalb der Tabelle, **Badge** am Bereich, oder Einträge in einer **„Offene Kassen-Meldungen“**-Liste für diese KW (genaue UI offen; wichtig ist: **sichtbar im richtigen Bereich** Obst/Gemüse vs. Backshop).

**Ton & Text (Beispiele):**
- Kurz und verständlich, z. B.: *„Hinweis von der Kasse“*, *„An der Kasse gemeldet“*, optional mit **Datum** und **Kurzbeschreibung** (was stimmt nicht: Name, PLU, Bild, fehlt).
- Beim **Hover/Tap** oder in einem kleinen **Popover/Tooltip**: etwas mehr Detail (welche Kasse optional, Freitextausschnitt), ohne die Tabelle unleserlich zu machen.

**Workflow (Zielbild):**
- Personal oder Abteilungsleitung sieht in der Liste **sofort**, dass Handlungsbedarf von der Kasse kommt – ohne extra „Meldungen suchen zu müssen“.
- **Erledigt-Status** (Meldung bearbeitet / abgehakt): sollte in der UI klärbar sein, damit Hinweise nicht ewig rot stehen bleiben (Details: offene Punkte).

**Technische Richtung (ohne Festlegung):** Meldungen sind mit **Store**, **Bereich** (Obst/Gemüse vs. Backshop), **KW** und ggf. **Produkt-/Zeilen-Referenz** verknüpft, damit die Listen-Views die passenden Hinweise **filtern und rendern** können.

### 7. Rechte – Lesen + Melden, kein Stammdaten-Edit

Kasse **darf**:
- PLU-Liste Obst/Gemüse und Backshop **ansehen**
- **Suchen** und zwischen **Obst/Gemüse** und **Backshop** wechseln
- **KW-Info** sehen (aktive KW; erweiterte KW-Wahl siehe offene Punkte)
- **Meldungen** wie in 6a beschrieben **erfassen und absenden**

Kasse **darf nicht** (weiterhin):
- Produkte oder PLUs **direkt in der App bearbeiten** (Umbenennen, PLU ändern, Bild tauschen – das bleibt anderen Rollen vorbehalten)
- Eigene Produkte hinzufügen, ausblenden oder dauerhaft „löschen“ (wie bei User/Admin)
- PDF exportieren (siehe offene Punkte)
- Upload, Werbung/Angebot
- Benutzerverwaltung, Layout/Regeln/Versionen
- **Markt wechseln** (nur ein Markt über den Link)

---

## Offene Punkte (später klären)

- [ ] PDF für Kassen: Ja oder nein? (aktuell: nein)
- [ ] KW-Auswahl: Nur aktive KW oder auch andere KW wählen?
- [ ] Kassen-Verwaltung: Löschen? Passwort zurücksetzen? Umbenennen?
- [ ] Login-UI: Tab „Kasse“ vs. automatische Erkennung?
- [ ] Wo genau legt Admin Kassen an: pro Markt in der Benutzerverwaltung?
- [ ] **Meldungen:** **Long-press** vs. **Doppel-Tap** vs. sichtbarer „Melden“-Button pro Zeile – was ist auf iPad am robustesten?
- [ ] **Meldungen:** Welche Pflichtfelder bei „Produkt fehlt“ (PLU, Name, Freitext, Foto-optional)?
- [ ] **Meldungen:** Zusätzlich zur Listen-Anzeige: eigene Übersichtsseite, Badge in der Navigation, E-Mail/Benachrichtigung – was braucht ihr minimal?
- [ ] **Meldungen:** Erledigt-Status – wer darf „erledigt“ setzen (nur Admin, auch User)?
- [ ] Bild-Meldungen nur Backshop oder auch Obst/Gemüse?

---

## Technischer Überblick (für spätere Implementierung)

- Neue Rolle `kasse` in `profiles`
- Tabelle `kasse_users` (store_id, username, display_name, auth_user_id)
- RPC `lookup_kasse_email(store_id, username)` für Login
- Route `/kasse` mit kombinierter PLU-Ansicht (Obst + Backshop; UI: Bereichswahl **nebeneinander**, siehe Abschnitt 6)
- `user_store_access`: Kasse hat nur genau einen Store
- **Meldungen:** eigene Tabelle oder Nutzung eines bestehenden Ticket-/Hinweis-Systems (TBD): Typ (fehlt / Name / PLU / Bild), **Bereich** (`obst_gemuese` | `backshop`), **KW**, Referenz Produkt-Zeile (wenn vorhanden), Freitext, `store_id`, `kasse_user_id`, Zeitstempel, optional **Status** (offen / erledigt) für Filter in den Listen-Ansichten
