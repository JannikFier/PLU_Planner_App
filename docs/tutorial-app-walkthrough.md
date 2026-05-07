# Fier Hub — App-Walkthrough (Browser-Agent-Beobachtung)

**Datum:** 2026-05-04
**Quelle:** Live-Walkthrough durch einen Browser-Agent im Testmodus, Markt „Test", Admin-Account. 7 Iterationen, alle Submit-Pfade real ausgelöst, alle Toasts dokumentiert, Test-Spuren am Ende bereinigt.
**Zweck:** Master-Referenz für die finalen Tutorial-Tour-Skripte. Auch unabhängig nutzbar als Mitarbeiter-Handbuch.

> **Hinweis zur Konsolidierung:** Die Original-Beobachtung des Browser-Agenten umfasste 7 Iterationen mit Anhängen A–F. Diese Datei ist eine konsolidierte Fassung in 4-Säulen-Struktur (entsprechend der App-Hauptnavigation) mit korrektem UTF-8-Encoding. Alle echten Toast-Wortlaute, Workflows und UI-Beobachtungen sind erhalten.

---

## Startbildschirm (Admin-Dashboard)

**URL:** `/admin`

**Header (durchgehend in der App):**
- Logo „Fier Hub" links + Markt-Name darunter (z. B. „Test")
- Rechts: Admin-Pille, Glocken-Icon, Avatar mit Initialen (z. B. „TE")

**Dashboard-Inhalt:**
- Titel „Administration" + Untertitel „Wähle einen Bereich – Listen und Konfiguration findest du unter Obst/Gemüse und Backshop."
- **Vier Karten in einer Reihe:**
  1. **Obst und Gemüse** (grünes Apfel-Icon) → `/admin/obst`
  2. **Backshop** (graues Croissant-Icon) → `/admin/backshop`
  3. **Benutzer** (blaues Personen-Icon) → `/admin/users`
  4. **Kassenmodus** (grünes Scan-Icon) → `/admin/kassenmodus`

### Glocken-Icon (Notifications)

Öffnet Modal **„Benachrichtigungen"** mit Untertitel „Neue und geänderte Produkte nach dem letzten Upload (Obst/Gemüse und Backshop). Ausgeblendete erscheinen nicht in den Listen und im PDF."

Pro Bereich (Obst/Gemüse, Backshop) drei Tabs:

**Tab „Neu"** + Counter
- Pro Zeile: PLU + Name + Pill „Stück"/„Gewicht" + Knopf **„Ausblenden"** (toggled direkt, kein Confirm)
- Toast: „Produkt ausgeblendet" / „Produkt wieder eingeblendet"
- Visuell: gelblich-oranger Streifen vorn am Eintrag (passt zur gelben PLU in der Liste)

**Tab „Geändert"** + Counter
- Wie „Neu", aber mit rötlich-orangem Streifen vorn
- Sub-Text **„Ehemals PLU {nummer}"** unter dem Namen (kleinere graue Schrift)

**Tab „Raus"** + Counter ⭐ (das ist das Carryover-Konzept)
- Pill **„Rausgefallen"** + Name + PLU
- **Zwei Buttons:**
  - **„Eine KW in Liste"** (sekundär) — Produkt einmalig übernehmen für Restbestand. Toast: „Produkt wieder eingeblendet". Sub-Text danach: „Markt: wieder in Liste · zuletzt {User}, {Datum} {Uhrzeit}" (Audit-Trail).
  - **„Nicht übernehmen"** (primär, blau) — bestätigt das Rauswerfen.
- Wenn ein Eintrag bereits ausgeblendet wurde: ausgegraut, „Ausblenden"-Knopf wird zu Status-Pill „Ausgeblendet" (deaktiviert).

**Footer:** Pro Sektion „Gelesen"-Knopf + rechts „Alles als gelesen markieren".

### Avatar-Pop-Down-Menü

- Header (nicht klickbar): User-Name, E-Mail/Personalnummer
- **„Admin-Bereich"** (Zahnrad-Icon) — zurück zur Admin-Übersicht
- **„Testmodus starten"** (Reagenzglas-Icon) — toggled an/aus. Bei aktiv: gelber Rahmen um Viewport, gelber Floating-Knopf „Testmodus beenden" unten rechts. Toast: „Testmodus aktiviert – Änderungen werden nicht gespeichert."
- **„Abmelden"** (rot, Logout-Icon)

> **Wichtig:** Testmodus geht beim Page-Reload verloren. Vor jeder Aktions-Session neu aktivieren.

---

# Säule 1 — Obst und Gemüse

## Hub-Page (`/admin/obst`)

Untertitel: „PLU-Liste öffnen oder Darstellung und Regeln für diesen Markt anpassen."

Zwei Karten:
- **PLU-Liste** (Klemmbrett-Icon) → `/admin/masterlist`
- **Konfiguration der Liste** (Quadrat-Raster) → `/admin/obst/konfiguration`

## 1.1 PLU-Liste (`/admin/masterlist`)

**Layout:** zentrale Master-Liste aller Obst-/Gemüse-PLUs. Desktop zweispaltig: **PLU | ARTIKEL | PLU | ARTIKEL** mit Buchstaben-Trennern „— A —", „— B —", … Mobile 1-spaltig.

### Toolbar Statusanzeigen (links, keine Buttons)

- **Lupe-Icon** — öffnet Schwebe-Suchfeld „PLU oder Name suchen…" mit Counter „X von Y" und Pfeil-Navigation. Klick außerhalb schließt es.
- **„Alphabetisch (A–Z)"** — zeigt aktuelle Sortierung (in Konfig wählbar)
- **„Nach Typ getrennt"** — zeigt aktuellen Anzeige-Modus
- **„Liste KW19/2026"** + blaue Pill **„Aktiv"** — KW der eingespielten Liste (bei Obst keine KW-Wahl möglich)

### Toolbar Aktions-Buttons (rechts)

#### „+ Eigene Produkte" → `/admin/custom-products`

**Tabelle:** PLU | NAME | TYP | PREIS | AKTIONEN. Pro Zeile: Stift (bearbeiten) | Auge-Schrägstrich (ausblenden, direktes Toggle) | rote Mülltonne (löschen mit Bestätigung).

**„+ Eigenes Produkt hinzufügen"-Knopf:** Dialog mit:
- **PLU (4–5 Ziffern)** — Pflicht ODER Preis
- **Artikelname** — Placeholder „z. B. Avocado"
- **Typ** — Dropdown „Stück" / „Gewicht"
- **Preis (statt PLU)** — Number-Input mit „EUR"
- **Validierung:** Bei vorhandener PLU (z. B. 11111) wird Feld rot + Fehler **„PLU 11111 existiert bereits"** + Hinzufügen disabled

**Stift-Edit-Dialog:** PLU read-only, nur Name/Typ/Preis editierbar. Untertitel: „Name und Preis anpassen; weitere Felder je nach Layout-Einstellung. PLU kann nicht geändert werden."

**Live-Test-Erfolg:** PLU 98765 + „Mein Test-Apfel" + Typ Stück → Hinzufügen → Toast **„Eigenes Produkt hinzugefügt"** + neuer Eintrag mit Pill **„Von mir erstellt"**.

#### „Ausgeblendete" → `/admin/hidden-products`

**Empty-State:** „Keine ausgeblendeten Produkte" + Hinweis oben rechts auf „Produkte ausblenden".

**„Produkte ausblenden"-Knopf** → `/admin/pick-hide-obst` (Picker):
- Suchfeld + 2-spaltige Tabelle mit Master-Checkbox im Header
- Pro Zeile: Checkbox + PLU + ARTIKEL
- Sektion-Header **„=== STÜCK ==="** + Buchstaben-Trenner
- Sticky-Footer: „Abbrechen" + **„X Produkte ausblenden"**
- Toast: **„X Produkte ausgeblendet"** + Redirect

**Hidden-Liste mit Einträgen:**
- Tabelle: PLU | ARTIKEL | TYP | AUSGEBLENDET VON (Markt + Pill „Von mir") + blauer **„Einblenden"-Knopf**
- Toast nach Einblenden: „Produkt wieder eingeblendet"

#### „Werbung" → `/admin/offer-products`

**Sektion „Zentrale Werbung (KW 19/2026)":** Hinweis „Megafon neben dem Stift: Klick fragt, ob nur die Werbung aus soll oder die Zeile aus Liste/PDF."

**Tabelle:** PLU | ARTIKEL | PREIS & WERBUNG (Zentral + Anzeige) + Stift-Icon + Megafon-Icon

**Stift pro Zeile** → Dialog **„Eigener Aktionspreis"**: Untertitel „Nur für diesen Markt. Der zentrale Vorgabepreis bleibt zur Orientierung sichtbar."
- Read-only „Zentral vorgegeben (Referenz)"
- Number-Input „Eigener Verkaufspreis (€)"
- Toast nach Speichern: **„Eigener Aktionspreis gespeichert"**

**Megafon pro Zeile** → Dialog **„Zentrale Werbung"**: „Diese Aktion kommt von der Zentrale. Du kannst sie für deinen Markt abschalten oder die Zeile komplett aus deiner Liste entfernen." **Drei Optionen:**
- **„Nur normale Zeile (ohne Werbung)"** (blau) → Megafon aus, Zeile bleibt in Liste. Toast: **„Werbung aus, Produkt bleibt in der Liste"**. Visuell: durchgestrichen ausgegraut, Megafon hellgrau.
- **„Aus Liste und PDF entfernen"** (rot, destruktiv) — siehe Backshop unten für die Variante mit komplettem Entfernen
- **„Abbrechen"**

**„Produkte zur Werbung hinzufügen"-Knopf** → großer Dialog mit Suchfeld + 2-spaltige Tabelle (PLU + ARTIKEL + Megafon-Aktion). Klick auf Megafon → Detail-Dialog:
- Artikel-Card (Name + PLU)
- **„Aktionspreis (€), optional"** (Placeholder „Leer = nur Werbung ohne…")
- **„Laufzeit:"** Dropdown 1 / 2 / 3 / 4 Wochen
- Submit-Buttons: **„Zur Aktion hinzufügen (ab dieser KW)"** (blau) ODER **„Abrechnungsperiode (4 Wochen)"** (sekundär)

#### „Umbenennen" → `/admin/renamed-products`

**Wichtig (Korrektur zu früherer Annahme):** Die Index-Page ist NICHT leer, sie zeigt eine **3-spaltige Tabelle:**

| PLU | ORIGINAL | AKTUELL | Aktion |
|---|---|---|---|
| 41006 | Ananas 10er | Ananas 10er TEST | „Zurücksetzen"-Knopf |

**„Produkte umbenennen"-Knopf** → `/admin/pick-rename-obst` (4-Spalten-Picker mit Stift pro Zeile)

**Stift pro Zeile:** Dialog **„Produkt umbenennen"** zeigt PLU + „Original: {alter Name}" + editierbares Feld **„Neuer Name"** (vorbelegt).
- Toast: **„Produktname geändert"**

**„Zurücksetzen"-Bestätigung:** Titel „Produktnamen zurücksetzen?" Untertitel: „Der Anzeigename wird wieder auf '{Original-Name}' gesetzt." Buttons: Abbrechen / **„Zurücksetzen"** (blau). Eintrag verschwindet aus Tabelle.

#### „PDF" → Modal-Dialog

**„PDF exportieren"** mit Untertitel „Vorschau und Layout vor dem Download." Felder:
- **„Kalenderwoche für PDF"** Dropdown (Default „KW19/2026 + Aktiv")
- **„Inhalt"** zwei Radio-Karten:
  - **„Volle Liste"** — alle Artikel
  - **„Nur Angebote"** — nur Werbungs-Zeilen, A–Z
- Sub-Block „Volle Liste": **„Mit Angeboten"** (default) ODER **„Ohne Angebots-Hinweise"**
- **Vorschau-Card:** „KW19/2026 – 181 Artikel" + Pills „5 Neue" / „3 PLU geändert" / „1 Eigene"
- Buttons: Abbrechen / **„Drucken"** / **„PDF herunterladen"** (blau)
- Toast nach Generieren: „PDF wurde erstellt."

## 1.2 Konfiguration der Liste (`/admin/obst/konfiguration`)

Drei Sub-Karten: Layout, Bezeichnungsregeln, Warengruppen.

### 1.2.1 Layout (`/admin/layout`)

2-Spalten-Layout mit **Live-Vorschau rechts**. Cards links:

- **Anzeige-Modus** — Radio: „Alle zusammen" / „Stück + Gewicht getrennt"
- **Sortierung** — Radio: „Alphabetisch (A–Z)" / „Nach Warengruppen" (= aktiviert die Workbench)
- **Flussrichtung** — Radio: „Zeilenweise" / „Spaltenweise"
- **Schriftgrößen** — drei Number-Inputs: Listen-Überschrift (default 28 px) / Spaltenköpfe & Gruppen (16) / Produktname & Zeilen (18)
- **Markierungsdauer** — zwei Dropdowns: „Rot (PLU geändert)" und „Gelb (Neues Produkt)" mit 1 KW / 2 KWs / … (Default 1/1)
- **Kalenderwoche** — Toggle „Woche mit Datum (Mo–Sa)"
- **Features** (für alle User der Markt-Filiale): drei Toggles
  - **„Eigene Produkte"** — User dürfen Artikel hinzufügen
  - **„Produkte ausblenden"** — User dürfen Artikel entfernen
  - **„Warengruppen"** — Zuordnung zu Warengruppen aktivieren

> **Wichtig:** Alle Layout-Änderungen sind sofort live (kein Speichern-Knopf), Vorschau aktualisiert sich live. Sortierung „Nach Warengruppen" ändert die Vorschau zu Sektionen ÄPFEL, BANANEN, BIRNEN, KARTOFFELN, etc.

### 1.2.2 Bezeichnungsregeln (`/admin/rules`)

Eine Card **„Bezeichnungsregeln"** mit Sub „Automatische Namensanpassungen (z. B. 'Bio' immer vorne)." + **„+ Regel"-Knopf** + Pills für aktive Regeln.

**„+ Regel" → Dialog „Schlagwort-Manager":**
- **Aktive Regeln** als Pills mit Stift + Mülltonne (löscht direkt, Toast „Regel gelöscht")
- **Neue Regel:** Feld „Schlagwort eingeben" (Placeholder „z. B. 'Bio' oder 'Pilze'") + **„+ Hinzufügen"**
- **„Position des Schlagworts":** Toggle-Buttons „Vorne anzeigen" (default) / „Hinten anzeigen"
- **Live-Vorschau** sobald getippt:
  - Counter: **„X Produkte enthalten {Wort} · Y davon werden geändert"**
  - Scrollbare Liste mit Vorher → Nachher (Mono-Font, Pfeil →)
- Footer: „Schließen" + **„Alle Regeln anwenden"** (blau)
- Toast nach Hinzufügen: **„Regel hinzugefügt"**
- Toast nach „Alle Regeln anwenden":
  - Mit Effekt: **„Namensdarstellung ist für diesen Markt in der Liste aktiv (keine zentrale Master-Speicherung)."** ← markt-lokal!
  - Ohne Effekt: **„Keine Anpassung nötig."**

### 1.2.3 Warengruppen (`/admin/obst-warengruppen`)

**Hinweis-Banner** oben (wenn Sortierung NICHT auf „Nach Warengruppen"): „Sortierung 'Nach Warengruppen'. Die Warengruppen-Workbench nutzt effektive Gruppen am besten…" + **„Layout-Einstellungen"-Knopf** (Direkt-Link zu `/admin/layout`).

> **Workbench-Aufbau:** identisch zu Backshop unten (3 Spalten + Status-Card + Sticky-Footer). Siehe Säule 2.

---

# Säule 2 — Backshop

## Hub-Page (`/admin/backshop`) — DREI Karten!

Untertitel: „PLU-Tabelle und Konfiguration direkt; unter 'Backshop' zusätzlich Werbung nach Kalenderwoche oder Kachel-Übersicht mit PDF."

Drei Karten:
1. **PLU-Liste** (Klemmbrett-Icon) → `/admin/backshop-list`
2. **Konfiguration der Liste** (Quadrat-Raster) → `/admin/backshop/konfiguration` (4 Sub-Karten)
3. **Backshop** (Croissant-Icon) → `/admin/backshop/inhalt` (Sub-Hub mit Werbung + Backshop-Liste)

> **Wichtige Begriffsklärung:** „Backshop" ist sowohl der **ganze Bereich** als auch die spezielle **Backshop-Liste mit Bildern und Strichcodes** (siehe 2.3 unten). Verwirrend, aber gewollt.

## 2.1 PLU-Liste Backshop (`/admin/backshop-list`)

**Untertitel:** „Aktuelle eingespielte Liste – Backshop-Produkte mit Bild, PLU und Name. Die hintere KW in der Zeile unten steuert die angezeigte Zentralwerbung (wählbar, sobald Werbung für spätere Wochen existiert)."

**Toolbar Zeile 1:** Lupe + Filter-Icon + **„KW 17 — KW 19"** (zweite KW = Dropdown wählbare Werbe-KW: 19/20/21/22) + „· 2026" + grauer Pill **„Archiv"**

**Toolbar Zeile 2 — die sechs Aktionen:** Eigene Produkte, Ausgeblendete, Werbung, Marken-Auswahl, Umbenennen, PDF.

### „+ Eigene Produkte" → `/admin/backshop-custom-products`

**Empty-State:** „Noch keine eigenen Backshop-Produkte. Füge eines hinzu (mit Bild)."

**„+ Eigenes Produkt hinzufügen" → Dialog:**
- **PLU (4–5 Ziffern)** — Pflicht
- **Artikelname** — Pflicht
- **Angebots-PDF** Dropdown:
  - **„Test (unter 'Neue Produkte' auf Angebots-PDF)"** — Default. Hinweis: „'Test': zusätzlich auf dem PDF 'Nur Angebote'. Beim Export der vollen Liste kannst du alle Test-Artikel auf einmal übernehmen."
  - **„Sofort fest in der Hauptliste"** — direkt in PLU-/Backshop-Liste
- **Bild (Pflicht!)** — zwei Buttons: „Bild wählen" (Datei-Picker) / „Foto aufnehmen" (Webcam, gut auf Tablets im Markt). **Ohne Bild bleibt 'Hinzufügen' disabled** ← live bestätigt mit PLU 99999!
- **Warengruppe** — Dropdown ("Brot, Süßes, Baguette, Brötchen, Laugengebäck, Snacks, Croissant, keine Gruppe"). Link **„Neue Warengruppe erstellen"** verwandelt das Dropdown in Inline-Feld + „Anlegen"-Knopf.

### „Ausgeblendete" → `/admin/backshop-hidden-products`

**Komplett anders als bei Obst!** Header mit Auge-Schrägstrich-Icon + Help-Icon (?) + Lupe + **„Produkte ausblenden"**-Knopf.

**Zwei Tabs:**

**Tab „Manuell ausgeblendet"** + Counter
- Quellen-Filter-Pills: „Alle X" / „E Edeka X" (blau) / „H Harry X" (orange) / „A Aryzta X" (rot) / „O Eigene X" (lila)
- Sektion „Warengruppen" mit Card-Grid pro Warengruppe (z. B. „Brot") mit Counter-Pill + Bild + Layer-Icon
- Klick auf Warengruppen-Card → Detail-Tabelle: PLU | ARTIKEL | MARKE | WARENGRUPPE | AUSGEBLENDET VON + blauer Einblenden-Knopf

**Tab „Durch Regel gefiltert"** + Counter
- Diese Produkte sind durch Gruppenregeln/Markenauswahl gefiltert
- Tabelle wie oben + Knopf **„Marken wählen"** (führt zur Marken-Auswahl mit Pre-Selection) + Einblenden-Knopf

**„Produkte ausblenden"-Knopf** → `/admin/pick-hide-backshop` — wie Obst-PickHide, aber **mit Bildern und Quellen-Pills (E/H/A) pro Zeile**. Sektion-Header in Großbuchstaben (z. B. „=== BROT ==="). Sticky-Footer mit „X Produkte ausblenden". Live getestet: 2 Brot-Produkte ausgewählt → Toast „2 Produkte ausgeblendet" + Redirect.

> **Wichtig:** Counter zählt **PLU**, nicht Marken-Varianten. Wenn PLU 81356 sowohl bei Edeka (E) als auch Harry (H) existiert → Klick auf Checkbox markiert beide automatisch, Counter zeigt „1 Produkt ausblenden".

### „Werbung" → `/admin/backshop-offer-products`

Wie Obst-Werbung, aber **mit Bildern in der Tabelle** (BILD | PLU | ARTIKEL | PREIS & WERBUNG + Stift + Megafon).

**Megafon-Optionen Backshop ALLE drei live getestet:**
- „Nur normale Zeile (ohne Werbung)" → Toast „Werbung aus, Produkt bleibt in der Liste" → durchgestrichen ausgegraut
- **„Aus Liste und PDF entfernen"** (rot) → Toast **„Werbung aus und aus Liste/PDF entfernt"** → Zeile **komplett aus der Tabelle entfernt** (anders als Obst!)
- „Abbrechen" → schließt ohne Effekt

### „Marken-Auswahl" → `/admin/marken-auswahl?backTo=…` ⭐ Backshop-Kern-Konzept

**Was es ist:** Pro Master-Produkt (zentrale Sortimentskategorie wie „Fladenbrot") gibt es 1–N Marken-Varianten:
- **E** = Edeka Eigenmarke
- **H** = Harry (Brotmarke)
- **A** = Aryzta (Backwaren-Hersteller)
- **O** = Eigene (selbst angelegt)

**Layout — 3-Spalten Split-View (Desktop):**

**Sidebar links:**
- Suchfeld „Suchen…"
- **Status-Filter-Pills:**
  - „Alle" — alle Master-Produkte
  - „Offen" — noch keine Marke ausgewählt (alle Varianten sichtbar mit Pill „sichtbar (ohne Wahl)")
  - „Teilweise" — eine, aber nicht alle Marken ausgewählt
  - „Alle bestätigt" — Status grün, alle Varianten haben Auswahl
- Sektionen pro Warengruppe (BROT, BRÖTCHEN, BAGUETTE, …)
- Pro Master: Name + Quellen-Pills + Status-Pill rechts + Counter (z. B. „1/2", „0/1")
- Aktiver Master blau hervorgehoben

**Detail-View rechts:**
- Breadcrumb „{Warengruppe} · #{Master-ID}" + Help-Icon (Tooltip: „Warengruppe. Übergeordnete Sortimentskategorie. Legt in dieser Ansicht die Gruppierung in der Seitenleiste fest.")
- Master-Titel + Help-Icon + Pill „X Marken"
- **Status-Banner** (vier Zustände!):
  - **Hellblau** „Keine Auswahl – alle Marken bleiben sichtbar." (Initial)
  - **Gelb** „Exklusiv-Modus: nur diese Marke bleibt in der Masterliste." (nach Doppelklick)
  - **Hellblau** „X von Y gewählt – andere Marken ausgeblendet, Hinweis in der Masterliste."
  - **Grün** „Alle Marken bestätigt – auditierbar gespeichert." (komplett bestätigt)
- **Marken-Kacheln** nebeneinander: Bild + Quellen-Pill + PLU + Marken-Produktname + „Marke {Quelle}". Aktive Card mit blauem Rand + Häkchen oben rechts.
- Hinweis-Text: **„Einfachklick: Mehrfachauswahl · Doppelklick: Nur diese Marke · Umschalt+Enter = nur diese Marke"**

**„AUSWIRKUNG AUF DIE MASTERLISTE":**
- Tabelle pro Marken-Variante: Quellen-Pill + PLU + Name + Marke + Sichtbarkeits-Pill:
  - **„sichtbar"** (grün) — wird in PLU-Liste/PDF angezeigt
  - **„sichtbar (ohne Wahl)"** (gelblich) — Initial-Status
  - **„ausgeblendet"** (grau) — durch andere Marken-Wahl ausgefiltert

**Footer:** „Zurück" / **„Weiter"** (blau) — geht zum nächsten offenen/teilweisen Master.

> **Live-Test bestätigt:** Klick auf inaktive Marke = Mehrfachauswahl + Auto-Sprung zum nächsten Master. Doppelklick = Exklusiv-Modus. Counter im Status-Filter aktualisiert sich live. Status-Banner wechselt automatisch Farbe.

### „Umbenennen" → `/admin/backshop-renamed-products`

Wie Obst-Umbenennen, aber Untertitel: **„Anzeigenamen und optional Bilder anpassen oder auf das Original zurücksetzen."** ← Bild-Override pro Markt möglich (NEU gegenüber Obst!)

**Stift-Dialog „Produkt umbenennen":** Feld „Neuer Name" + **Bild-Sektion** mit Thumbnail + zwei Buttons:
- **„Bild ersetzen"** (öffnet OS-Datei-Picker)
- **„Bild entfernen"** (Mülltonnen-Icon)

**Zurücksetzen-Bestätigung Backshop:** Untertitel: „Der Anzeigename wird wieder auf '{Original-Name}' gesetzt. **Das Bild bleibt unverändert.**" — Backshop hat den Bild-Hinweis zusätzlich!

### „PDF" → Modal-Dialog (Backshop-spezifisch)

- Sub im „Nur Angebote": **„Angebotszeilen und ggf. neue Produkte (Test), A–Z, eigener Titel."** ← erwähnt explizit die Test-Artikel
- Sortierung default „Nach Warengruppe" (Obst war „Alphabetisch")
- Spalten-Layout „Bild – PLU – Name"

## 2.2 Konfiguration Backshop (`/admin/backshop/konfiguration`)

Vier Sub-Karten:

### 2.2.1 Layout Backshop (`/admin/backshop-layout`)

Wie Obst-Layout, aber:
- **Anzeige** statt „Anzeige-Modus" — „Alle zusammen (alphabetisch)" / „Nach Warengruppen (alphabetisch)"
- **PDF — Seitenumbruch bei Warengruppen** ⭐ NEU — Toggle „Vorschau: eine Seite pro Warengruppe" mit Hinweis: „Im PDF wird platzsparend umgebrochen: eine neue Seite nur, wenn die nächste Warengruppe komplett nicht mehr in den unteren Rand passt."
- **Default-Schriftgrößen anders** — 32/24/18 (Obst war 28/16/18)
- **Markierungsdauer-Default** — 2 KWs / 2 KWs (Obst 1/1)
- **Features** — drei Toggles: Eigene Produkte / Produkte ausblenden / Bezeichnungsregeln. **Kein Warengruppen-Toggle** wie bei Obst (Backshop ist strukturell Warengruppen-basiert).

### 2.2.2 Bezeichnungsregeln (Backshop) (`/admin/backshop-rules`)

Wie Obst, aber Placeholder im Schlagwort-Feld: **„z. B. 'Bio' oder 'Vollkorn'"**.

### 2.2.3 Warengruppen sortieren (Backshop) (`/admin/backshop-block-sort`) ⭐ Workbench

**3-Spalten-Layout + Sticky-Footer:**

**Linke Spalte — Warengruppen:**
- Header **„Warengruppen"** + **„+ Neu"-Knopf**
- Liste mit Counter pro Gruppe (z. B. „Brot 53", „Süßes 79", „Baguette 35", „Ohne Zuordnung 0")
- Aktive Gruppe blau hervorgehoben mit Stift-Icon (Bearbeiten) und roter Mülltonne (Löschen)

**„+ Neu" → Dialog „Neue Warengruppe (Backshop)":** „Gib einen Namen für die neue Warengruppe ein." + Feld + „Erstellen"-Knopf. Toast: „Warengruppe erstellt".

**Mittlere Spalte — Artikel:**
- Header zeigt aktuelle Gruppe + Counter („53 Artikel · antippen für Gruppenwahl, ziehen oder Mehrfachauswahl") + **„Mehrfachauswahl"-Knopf**
- Karten-Grid: Bild + PLU + Name + **6-Punkt-Drag-Handle**
- Drag eines Artikels auf andere Gruppe = Markt-Override
- Mehrfachauswahl-Modus aktiviert Checkboxen + „Alle auswählen"-Knopf

**Rechte Spalte — STATUS:**
- **„OHNE ZUORDNUNG"** — Counter (gelb wenn > 0)
- **„MARKT-OVERRIDES"** — wie viele Artikel anders als zentral zugeordnet
- **„ARTIKEL GESAMT"** — Total Backshop-Artikel
- **„ZULETZT GEÄNDERT"** — Sitzungs-Info

**Sticky-Footer:**
- **„Auswahl → {Gruppe} zuweisen"** (blau aktiv bei Auswahl)
- **„Zu 'Ohne Zuordnung' verschieben"** (sekundär)
- **„Alles abwählen"** rechts

**Warengruppe löschen:** Bestätigungs-Dialog „'Test-Gruppe' wirklich löschen? Produkte verlieren nur die Zuordnung." → Toast „Warengruppe gelöscht".

### 2.2.4 Gruppenregeln (Backshop) (`/admin/backshop-gruppenregeln`)

**Untertitel:** „Pro Warengruppe eine bevorzugte Marke wählen. Nicht bevorzugte Master-Marken werden in der Listenansicht ausgeblendet; Angebote der aktuellen Kalenderwoche und eigene Produkte bleiben sichtbar (siehe Listenlogik). Fein anpassen kannst du unter Marken-Auswahl."

**Tabelle:** Warengruppe | Bevorzugte Marke (Dropdown) | Aktion. Pro Warengruppe wählst du eine Standard-Marke. Wenn gesetzt: zusätzlicher Knopf **„Erneut anwenden"** in der Aktion-Spalte.

**Live-Test:** Marke „Harry" für Warengruppe „Brot" → Toast **„Regel auf 10 Gruppe(n) angewendet."** (10 = Brot-Untergruppen in Sortiments-Hierarchie). Wechsel der Marke löst direkt die Anwendung aus, kein extra „Erneut anwenden"-Klick nötig!

## 2.3 Backshop (Sub-Hub) (`/admin/backshop/inhalt`)

**Untertitel:** „Wähle Werbung (KW-Übersicht) oder die kompakte Backshop-Liste mit Kacheln und PDF-Export."

Zwei Karten:
- **Werbung** (Megafon-Icon) → `/admin/backshop-werbung`
- **Backshop-Liste** (Quadrat-Raster) → `/admin/backshop-kacheln` ⭐ DAS war übersehen!

### 2.3.1 Werbung bestellen (`/admin/backshop-werbung`)

**Untertitel:** „Kalenderwoche wählen – Artikel, Preise und Strichcode aus der zentralen Werbung für diesen Markt."

**Sektion „Aktuelle Woche":** 1 Card mit aktueller KW + blaue Pill „Aktuelle Woche" + Datei-Name + Chevron.

**Sektion „Kommende Kalenderwochen":** 3 Cards (z. B. KW20, KW21, KW22) mit „X Artikel · Datei.xlsx" + **„Noch X Tag(e) · Auslieferung ab DD.MM.YYYY"**.

**„Frühere Werbe-Kalenderwochen (letzte 3)"** — klappbares Akkordeon.

#### KW-Detail (`/admin/backshop-werbung/{kw}/{jahr}`) ⭐ Bestelltabelle

**Hier kommt die echte Magie:** Pro Werbe-Produkt eine Zeile mit:
- **Bild | PLU | Artikel | + (Plus-Spalte zum manuellen Hinzufügen) | Normalpreise (LISTE EK / LISTE VK) | Aktionspreise (AKTION EK / AKTION VK) | Mo–Sa | Code**
- **„Mo–Sa"** = **6 separate Number-Inputs** (Mo, Di, Mi, Do, Fr, Sa) für Tagesmengen
- **„Code"** = Strichcode-Symbol → öffnet Dialog mit großem Barcode (CODE128/EAN-Style) + Nummer

**Live-Test:** Eingabe „10" in Mo-Feld bei Wurzelbrot dunkel → übernommen ohne Speichern-Klick (Auto-Save). Strichcode-Dialog zeigt: „Wurzelbrot dunkel / PLU 88550 / Werbung KW19/2026 / Aus Artikelnummer / GTIN (Excel 'Art. Nr.') 7388329".

**Rechts oben:** Knopf **„PDF exportieren"** für die Bestelltabelle.

### 2.3.2 Backshop-Liste (`/admin/backshop-kacheln`) ⭐ Kachel-PDF

> **Antwort auf die Frage „was ist die Backshop-Liste":** Kompakte druckbare Übersicht aller Backshop-Produkte mit **Bildern und Strichcodes**, sortiert nach Warengruppen — Service für Mitarbeiter im Backshop-Bereich, nachschlagen welches Produkt welche PLU hat (z. B. an der Auslage).

**Aufbau:**
- **Tab-Navigation oben:** **Werbung | Backshop-Liste (aktiv) | PLU-Liste | Konfiguration** — vier Tabs zur Schnellnavigation
- Titel + Untertitel: **„Stand: {Datum} {Zeit} · {Markt} · Liste KW{aktuell}/{Jahr}"** + **„Übersicht ohne Werbungs-Artikel; Warengruppen wie in der Tabelle (Datenfeld oder Layout-Block). Der Strichcode nutzt die hinterlegte Artikelnummer als GTIN, sonst die PLU."**
- **Kachel-Grid pro Warengruppe** (Sektion-Header in Großbuchstaben, z. B. „BROT"):
  - 6 Kacheln pro Reihe (Desktop), Mobile weniger
  - Pro Kachel: Produktbild oben + PLU mittig + ARTIKEL-Name + STRICHCODE als gerenderter Barcode unten
- **Knopf „PDF erzeugen"** rechts oben — direkter Klick (kein Optionen-Dialog wie PLU-Liste-PDF):
  1. Klick → Knopf wird zu **„PDF wird erstellt…"** mit Refresh-Spinner
  2. Toast nach ~3 s: **„PDF wurde erstellt."** (grün)
  3. PDF wird automatisch geladen

> **Was wird raus genommen?** Werbungs-Artikel sind in der Backshop-Liste **NICHT enthalten**. Werbe-Produkte stehen in `/admin/backshop-offer-products`, Backshop-Liste ist die „Standard-Sortiment"-Sicht.

> **Warum gibt's das?** Schnell die richtige PLU finden, ohne Original-Excel durchsuchen zu müssen. Strichcode-Sicht hilft auch beim Etiketten-Druck.

---

# Säule 3 — Benutzer

## Page (`/admin/users`)

Titel „Benutzerverwaltung" + Untertitel „Personal anlegen, Rollen und Passwörter verwalten."

**Rechts oben:** **„Neuer Benutzer"** (blau, mit User-Plus-Icon).

### Tabelle „Alle Benutzer (X)"

Spalten: Name | Personalnr. | E-Mail | Rolle | Märkte | Aktionen

Pro Zeile:
- **Rolle** als Dropdown (User / Viewer) oder Pill „Admin" (eigener Account, nicht editierbar)
- **„Märkte"-Knopf** (Hauptsymbol-Icon)
- **„Bereiche"-Knopf** (Auge-Icon) — fehlt bei Admin
- **„Passwort"-Knopf** (Schlüssel-Icon, sekundär)
- **„Löschen"-Knopf** (rot) — disabled für eigenen Account

### „Neuer Benutzer" → Dialog

Titel **„Neuen Benutzer anlegen"** mit Untertitel **„Der Benutzer erhält ein Einmalpasswort und muss beim ersten Login ein eigenes Passwort vergeben."**

Felder:
- **Name** — Pflicht (Placeholder „Max Mustermann")
- **Personalnummer (7-stellig)** — entweder das ODER E-Mail
- **E-Mail-Adresse**
- Hinweis: „Personalnummer und E-Mail: mindestens eines angeben; bei beiden kann sich der Benutzer mit Personalnummer oder E-Mail anmelden."
- **Rolle** Dropdown: **„User (Personal)"** (default) / **„Admin"** / **„Viewer (nur Liste + PDF)"**
- Hinweis: **„Der Benutzer wird dem Markt 'Test' zugewiesen."**

Buttons: Abbrechen / **„Benutzer erstellen"** (disabled bis Pflichtfelder gefüllt).

**Live-Test:** Name „Max Mustermann" + PNr 9999999 → „Benutzer erstellen" → Spinner **„Wird erstellt…"** → nach ~2 s Einmalpasswort-Dialog:
- Titel „Einmalpasswort"
- Text „Gib dieses Passwort an den Benutzer weiter. Er muss es beim nächsten Login ändern."
- Mono-Anzeige des Passworts (z. B. **`mdDR7fxQ`**) + Kopier-Icon
- Hinweis **„Dieses Passwort wird nur einmal angezeigt. Bitte notieren oder kopieren."**
- Knopf „Verstanden"

### „Märkte" pro User → Dialog

Untertitel **„Märkte zuweisen oder entfernen. Änderungen werden sofort gespeichert."** (Auto-Save, kein Save-Knopf)
- Liste mit Markt-Cards: Checkbox + Markt-Name + Slug

### „Bereiche" pro User → Dialog

Untertitel „Welche Listen soll dieser Benutzer sehen? Änderungen werden sofort gespeichert."
- **„Obst und Gemüse"** Toggle
- **„Backshop"** Toggle

### „Passwort" pro User → Bestätigungs-Dialog

**„Passwort zurücksetzen?"** — „Möchten Sie wirklich das Passwort zurücksetzen? Die Person erhält ein Einmalpasswort und muss sich damit neu anmelden. Beim ersten Login muss ein eigenes Passwort vergeben werden." Buttons: Abbrechen / „Passwort zurücksetzen" (blau).

### „Löschen" pro User → Bestätigungs-Dialog

**„Benutzer wirklich löschen?"** — „Sind Sie sicher, dass die Person gelöscht werden soll? Wenn Sie das bestätigen, werden alle Benutzerdaten unwiderruflich entfernt. Die Person kann sich nicht mehr anmelden." Buttons: **„Nein, nicht löschen"** / **„Ja, löschen"** (rot, destruktiv). Toast: **„Benutzer wurde gelöscht."**

### Card „Kassen & QR" (unten auf der Page)

**Wichtig:** „QR-Code drucken und neue Kassen im Kassenmodus anlegen. Kassen-Konten erscheinen hier, nicht in der Liste 'Alle Benutzer'. Passwort ändern, aktivieren/deaktivieren und löschen wie im Kassenmodus."

Liste der Kassen-Konten (z. B. „Kasse 1") mit:
- „Deaktivieren"-Knopf
- „Passwort ändern"-Knopf (mit Schlüssel-Icon)
- rote Mülltonne (Löschen)
- Knopf **„Zum Kassenmodus"** rechts oben → `/admin/kassenmodus`

---

# Säule 4 — Kassenmodus

## Page (`/admin/kassenmodus`)

Titel „Kassenmodus" + Untertitel **„QR-Code für die Kasse, Kassen anlegen und Passwörter verwalten. Vorschau im neuen Tab über den Link."**

### Card 1 — „Einstiegs-Link & QR" (volle Breite)

Untertitel: „Diesen Link oder QR-Code am Markt bereitstellen. Nach Rotation ist der alte QR ungültig."

**Fünf Aktion-Buttons:**
- **„Link kopieren"** → kopiert URL in Zwischenablage. Toast: **„Link kopiert."**
- **„Drucken"** → Druck des QR-Codes
- **„PDF speichern"** → QR-Code als PDF
- **„Neuen Link erzeugen"** → Token-Rotation, alter QR wird ungültig (Vorsicht im Live-System!)
- **„Vorschau (neuer Tab)"** → öffnet Kasse-Login im neuen Tab

**Info-Banner:** **„Gleicher Browser, mehrere Tabs / Wenn du hier eingeloggt bist und im neuen Tab die Kasse anmeldest, gilt die Kiosk-Session für alle offenen Tabs dieser Website. Für eine Vorschau ohne deine Admin-Session zu verlieren: privates Fenster oder zweites Browser-Profil nutzen."**

**URL-Anzeige** mit Token: `https://test.fier-hub.de/kasse/{base64-Token}`. **Gültig bis {Datum}.**

**Großer QR-Code** rechts (~200×200 px).

### Card 2 — „Kasse hinzufügen" (untere Reihe links)

Untertitel: „Nummer wählen (nächste freie und zwei weitere), dann Passwort setzen (mindestens 6 Zeichen). Anzeigename: automatisch 'Kasse …'."

Felder:
- **„Kassen-Nummer"** Dropdown (Default „Kasse 2 (nächste)")
- **„Passwort"** Input (min 6 Zeichen)

Knopf **„+ Kasse anlegen"** (blau).

### Card 3 — „Kassen" (untere Reihe rechts)

Pro existierende Kasse:
- Anzeigename (z. B. „Kasse 1")
- **„Deaktivieren"** (sekundär)
- **„Passwort ändern"** (mit Schlüssel-Icon)
- rote Mülltonne (Löschen)

> **Wichtige Beobachtung:** Anlegen einer Kasse ist auch im Testmodus **echt** (Kassen-Anlage ist nicht test-modus-fähig). Bei Vorab-Tests vorher eine Test-Kasse anlegen, die danach wieder gelöscht wird.

---

# Mobile-Ansicht (allgemein)

Bei Browser-Breite ≤ ~380 px:

- **Header** kompakt (Logo, Glocke, Avatar)
- **Toolbar zerfällt:** Statusanzeigen (Sortier, Typ, KW) bleiben sichtbar; Aktionsbuttons wandern in **3-Striche-Burger-Menü** rechts oben
- Burger-Pop-Down zeigt alle Aktionen mit Icon + Text:
  - „+ Eigene Produkte"
  - „Ausgeblendete"
  - „Werbung"
  - „Umbenennen"
  - „PDF exportieren"
- **Tabellen** werden 1-spaltig (PLU + ARTIKEL pro Zeile)
- **Marken-Auswahl** wird gestapelte Liste (statt Sidebar+Detail+Auswirkung-Split-View)
- Buchstaben-Trenner und PLU-Highlights bleiben sichtbar

---

# Toast-Katalog (alle real ausgelösten Erfolgs-Toasts)

**Obst:**
- „Eigenes Produkt hinzugefügt"
- „Produktname geändert"
- „Produkt ausgeblendet" / „Produkt wieder eingeblendet"
- „X Produkte ausgeblendet" (Counter)
- „Werbung aus, Produkt bleibt in der Liste" (Megafon → Nur normale Zeile)
- „Regel hinzugefügt" / „Regel gelöscht"
- „Namensdarstellung ist für diesen Markt in der Liste aktiv (keine zentrale Master-Speicherung)." (Anwenden mit Effekt)
- „Keine Anpassung nötig." (Anwenden ohne Effekt)

**Backshop:**
- „Eigener Aktionspreis gespeichert"
- „Werbung aus und aus Liste/PDF entfernt" (Megafon → Aus Liste und PDF entfernen)
- „X Produkte ausgeblendet" (Manuell-Ausblenden)
- „Produkt wieder eingeblendet" (Einblenden in Hidden-Liste)
- „Produktname geändert" (Backshop-Umbenennen)
- „Regel auf X Gruppe(n) angewendet." (Gruppenregeln)
- „Warengruppe erstellt" / „Warengruppe gelöscht"

**Verwaltung:**
- „Wird erstellt…" (Spinner während Benutzer-Anlage)
- Einmalpasswort-Dialog (modal) mit Passwort-String
- „Benutzer wurde gelöscht."
- „Link kopiert." (Kassenmodus)

**System:**
- „Testmodus aktiviert – Änderungen werden nicht gespeichert." (Info-blau)
- „PDF wurde erstellt." (Backshop-Liste-PDF)

---

# Wichtige Begriffe in einem Satz

- **PLU-Liste** = die Master-Liste aller Obst-/Gemüse-Artikel für einen Markt
- **Backshop-Liste** = die druckbare Kachel-Übersicht aller Backshop-Produkte mit Bildern + Strichcodes (ohne Werbe-Artikel)
- **Werbung** = pro KW eine separate Sicht mit Aktionspreisen + Bestellmengen Mo–Sa für den Backshop
- **Marken-Auswahl** = Backshop-Konfiguration: pro Master-Produkt entscheiden, welche Marken (E/H/A) im Markt sichtbar sind
- **Bezeichnungsregeln** = Schlagwort-Position („Bio" vorne, „GG" hinten) im Anzeigenamen, markt-lokal
- **Warengruppen-Workbench** = Pro-Markt-Override der Sortimentszuordnung (Drag-and-Drop oder Mehrfachauswahl)
- **Testmodus** = Sandbox: alle Aktionen werden simuliert, gelber Rahmen + gelber Footer-Knopf, geht beim Reload verloren

---

# Was NICHT live testbar war (Browser-Agent-Limitationen)

Diese Pfade konnten in Browser-Automation nicht durchgespielt werden — werden über Code-Review ergänzt:
- Bild-Upload (öffnet OS-Datei-Picker)
- Webcam-Foto-Aufnahme
- Drag-and-Drop in der Workbench (HTML5-Drag-Events)
- Echter PDF-Datei-Download (nativer Save-Dialog)
- Logout-Login-Flow (würde Session beenden)
- Token-Rotation im Kassenmodus (würde Live-Daten zerstören)

---

**Stand:** 7 Iterationen, alle realistisch durchführbaren Aktionen ausgelöst, alle Toasts dokumentiert, alle Test-Spuren bereinigt. Tour-Plan ist bereit für die Erstellung der finalen Tutorial-Tour-Skripte.
