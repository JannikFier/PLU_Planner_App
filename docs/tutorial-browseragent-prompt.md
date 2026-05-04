# Browser-Agent-Prompt: App-Walkthrough für Tutorial-Aufbau

**Wofür:** Diesen Prompt gibst du an einen Browser-Agent (Claude Code mit Browser-Steuerung, Computer-Use, oder einen Web-Agenten). Der Agent klickt sich systematisch durch die PLU-Planner-App und schreibt eine **detaillierte Live-Beobachtung** als Markdown-Datei zurück. Diese Datei nutze ich dann als Grundlage für die finalen Tutorial-Tour-Skripte.

---

## 📋 Prompt zum Kopieren (an deinen Browser-Agent geben)

```
# Auftrag: PLU-Planner-App systematisch durchklicken und dokumentieren

## Kontext

Du bist ein Browser-Agent. Deine Aufgabe ist es, durch eine Web-App zu klicken
und genau zu dokumentieren, was du auf jeder Seite siehst und tun kannst. Das
Ergebnis wird als Grundlage für ein neues Tutorial verwendet — daher kommt es
auf Detail-Genauigkeit aus User-Perspektive an, NICHT auf technisches Wissen.

Die App heißt "PLU Planner" und verwaltet wöchentliche PLU-Listen für Obst-,
Gemüse- und Backshop-Abteilungen in Supermärkten. Es gibt 5 Rollen:
Super-Admin, Admin, User, Viewer, Kasse. Du wirst nur Admin- und User-Sicht
testen (Super-Admin und Kasse brauchen wir nicht).

## Setup (vor Beginn)

1. Öffne die App-URL die ich dir gleich gebe
2. Logge dich als **Admin** ein (Personalnummer/E-Mail + Passwort kommt
   separat). Falls beim Login eine Passwort-Änderung verlangt wird, setze
   ein einfaches Passwort.
3. **WICHTIG:** Sobald du auf dem Dashboard bist, klick auf dein
   Profil-Avatar oben rechts → "Testmodus starten". Du erkennst Testmodus
   am gelben Rahmen rund um die App. ALLE deine Aktionen werden dann
   simuliert und nicht echt gespeichert. Du kannst gefahrlos klicken.

## Was du tun sollst

Geh systematisch durch die Bereiche der App, in der unten genannten
Reihenfolge. Pro Bereich:

1. Beschreibe **was du siehst** (Layout, Elemente, Texte, Symbole)
2. Probiere **alle sichtbaren Aktionen** aus — Knöpfe, Dropdowns, Dialoge
3. Notiere **was passiert bei jedem Klick** (öffnet Dialog X mit Feldern A,B,C
   - oder navigiert zu Y, oder zeigt Toast Z)
4. Teste **Edge-Cases:** was passiert bei leer absenden, ungültiger Eingabe,
   doppelten Werten? Welche Fehlermeldung kommt?
5. Schau auf **Tooltips** (Hover über Symbole)
6. Beobachte **Loading-States** und **Übergänge**

## Output-Format (sehr wichtig!)

Schreib alles in EINE Markdown-Datei mit folgender Struktur. Halte dich
genau an dieses Format, weil ein anderer Agent damit weiterarbeitet:

```markdown
# App-Walkthrough — Live-Beobachtung

## Bereich: [Name des Bereichs]

### Page: [Name] — URL: `[URL]`

**Wie hin:** [von wo aus, welcher Knopf]

**Was ich sehe:**
- [Element 1]: [genaue Beschreibung mit Texten, Symbolen, Position]
- [Element 2]: ...

**Aktionen die ich getestet habe:**

#### Aktion 1: [Beschreibung, z.B. "Klick auf 'Eigene Produkte'"]
- **Vorher:** [Zustand]
- **Klick:** [welches Element exakt, was steht drauf]
- **Was passiert:**
  - [Beobachtung 1: z.B. "Dialog öffnet sich mit Titel '...']
  - [Beobachtung 2: z.B. "Erstes Feld 'Name' ist automatisch fokussiert"]
- **Felder im Dialog (falls Dialog):**
  - **Name** (Pflicht, Placeholder "z.B. Apfel"): Text-Input
  - **PLU** (optional): Number-Input, validiert auf 4-5 Ziffern
  - ... etc
- **Validierung beobachtet:**
  - Leer abgesendet → Toast "Bitte Name eingeben" oder Feld rot
  - PLU "12" eingegeben → Hinweis "Mindestens 4 Ziffern"
  - PLU "12345" eingegeben + bereits existiert → Toast "PLU bereits vergeben"
- **Erfolgreicher Speicher-Pfad:**
  - Felder gefüllt mit [konkreten Werten]
  - Klick "Speichern" → [was passiert: Toast, Liste aktualisiert, etc.]

#### Aktion 2: ...

**Edge-Cases beobachtet:**
- [Edge-Case 1]: was ich gemacht hab + was passiert ist

**Tooltips/Hover-Effekte:**
- Hover auf [Symbol] zeigt Tooltip "[Text]"

---

[Nächste Page]
```

## Reihenfolge der Bereiche

Geh durch in dieser Reihenfolge:

### Onboarding
- [ ] Login-Seite (URL: `/login`) — beobachte Felder, Fehler bei falschem PW
- [ ] Profil-Menü oben rechts — alle Einträge dokumentieren
- [ ] Testmodus aktivieren — was ändert sich visuell?
- [ ] Markt-Switcher im Header (falls mehrere Märkte) — wie öffnet sich
      das, was zeigt es?
- [ ] Glocken-Icon oben rechts — alle Tabs (Neu/Geändert/Entfernt) beobachten

### Obst & Gemüse (User-Sicht — Wechsel zu User-Rolle falls möglich)
- [ ] Dashboard-Karte "Obst & Gemüse" anklicken
- [ ] **MasterList:** alle Toolbar-Buttons (Suche, Eigene, Ausgeblendet,
      Werbung, Umbenennen, PDF) anklicken und beschreiben
- [ ] **Suche:** "Banane" suchen, was passiert
- [ ] **Eigene Produkte:**
  - Liste anschauen
  - "+ Neues Produkt" klicken — alle Felder beschreiben
  - Versuche zu speichern: leer, mit PLU, mit Preis statt PLU, mit
    bereits-existierender PLU
  - Edit-Knopf am Eintrag — was passiert?
  - Ausblenden-Knopf am Eintrag — was passiert?
  - Delete-Knopf — gibt's Bestätigung?
- [ ] **Ausgeblendete Produkte:**
  - Liste anschauen
  - "Produkte ausblenden" klicken (führt zu PickHide-Page) — wie sieht
    diese Page aus, wie wählt man Produkte?
  - Mehrere ausblenden, speichern
  - Wieder einblenden via Mülleimer-Icon
- [ ] **Werbung:**
  - Beide Sektionen "Eigene" und "Zentrale" beschreiben
  - "+ Produkt zur Werbung" — Dialog beschreiben
  - Bei zentraler Werbung: das Megafon-Icon klicken, was passiert
  - Lokalpreis setzen — wie funktioniert das?
- [ ] **Umbenennen:**
  - Liste anschauen
  - "Produkte umbenennen" — wie sieht die Auswahl-Page aus?
  - Ein Produkt umbenennen, in MasterList prüfen ob's geändert wurde
  - Zurücksetzen-Knopf testen
- [ ] **PDF-Export:**
  - Knopf klicken, Dialog beschreiben (Optionen, Vorschau, Download)

### Obst-Konfiguration (Admin-Sicht)
- [ ] Wechsle zu Admin-Dashboard (Profil → "Zur Admin-Ansicht" oder
      relogin als Admin)
- [ ] Klick auf Admin-Obst-Hub
- [ ] **Hub-Page:** beschreibe Layout (zwei Karten Liste/Konfiguration)
- [ ] **Konfig-Hub:** drei Karten (Layout, Bezeichnungsregeln, Warengruppen)
- [ ] **Layout:** alle Cards beschreiben (Anzeige-Modus, Sortierung,
      Flussrichtung, Schriftgrößen, Markierungsdauer, KW, Features) —
      Werte ändern und beobachten ob die Vorschau live aktualisiert
- [ ] **Bezeichnungsregeln:**
  - "+ Regel" klicken — Dialog beschreiben
  - Schlagwort "Bio" anlegen, Position "Vorne"
  - Live-Vorschau im Dialog — welche Produkte zeigt sie?
  - "Alle Regeln anwenden" klicken — was passiert?
  - Regel löschen testen
- [ ] **Warengruppen:**
  - 3-Spalten-Workbench beschreiben (links Gruppen, mitte Produkte,
    rechts Aktionen)
  - Neue Warengruppe "Tropisch" anlegen
  - Produkt zuweisen via Suche + Checkbox + "Zuweisen"-Knopf
  - Drag & Drop testen für Reihenfolge — wie geht das genau?
  - Undo-Button bei letzter Aktion
  - Warengruppe löschen — was passiert mit zugewiesenen Produkten?

### Backshop (User-Sicht — wechsle zurück zu User)
- [ ] **BackshopMasterList:** wie Obst aber mit Bildern und 3-Quellen-Badges
      (E/H/A) — beschreibe alle Spalten und Markierungen
- [ ] **Eigene Backshop-Produkte:** Test/Fest-Toggle besonders genau!
  - "+ Eigenes Produkt" — alle Felder
  - Test-Modus auswählen, anlegen
  - In Liste: erscheint nur in Werbungs-Zettel, nicht in Hauptliste?
  - Edit auf Fest umstellen — wo erscheint es jetzt?
- [ ] **Backshop ausblenden + umbenennen** (analog Obst)
- [ ] **Marken-Auswahl:**
  - Page beschreiben (Sidebar mit Gruppen + Kachel-Gitter rechts)
  - Wie sehen die Kacheln aus? Welche Marken-Logos?
  - Einfach-Klick auf Kachel: was passiert?
  - Doppel-Klick auf Kachel: was passiert?
  - Status-Band oben (welche Farben für welche Zustände?)
  - Status-Filter in Sidebar testen
- [ ] **Backshop Werbung:**
  - KW-Liste anschauen — Buckets Aktuell/Zukünftig/Vergangen
  - In eine KW klicken — Detail-Page beschreiben
  - "+ Neue Zeile" — Dialog mit Menge, EK, VK, Auslieferungs-Datum
  - Eintrag erstellen, in Liste prüfen
- [ ] **Backshop PDF-Export**

### Backshop-Konfiguration (Admin)
- [ ] **Konfig-Hub:** 4 Karten (Layout, Bezeichnungsregeln, Warengruppen
      sortieren, Gruppenregeln)
- [ ] **Layout** (analog Obst, aber Backshop-spezifisch — keine
      Stück/Gewicht-Optionen, dafür PDF-Optionen)
- [ ] **Bezeichnungsregeln** (analog Obst)
- [ ] **Warengruppen sortieren** (analog Obst Workbench)
- [ ] **Gruppenregeln:**
  - Page beschreiben (Tabelle pro Warengruppe)
  - Bevorzugte Quelle für eine Warengruppe wählen (z.B. Edeka für Brot)
  - Speichern, Effekt in Backshop-Masterliste prüfen
  - Zurücksetzen testen

### Verwaltung (Admin)
- [ ] **Benutzer:**
  - Tabelle aller Benutzer beschreiben (Spalten, Buttons)
  - "+ Neuer Benutzer" — Dialog beschreiben (Felder, Rolle-Dropdown)
  - Erstellen → Einmalpasswort wird angezeigt? Wie genau?
  - Markt-Zuweisen-Dialog (welche Märkte zur Auswahl, Checkboxen)
  - Bereiche-Sichtbarkeit-Dialog (Schalter für Obst/Backshop)
  - Passwort-Reset-Knopf — Bestätigung? Neues Passwort?
  - Löschen-Knopf — Bestätigung?
  - Rolle ändern via Dropdown
- [ ] **Kassenmodus:**
  - Page beschreiben (oben QR, unten 2 Cards)
  - Wenn noch keine Kasse: Kasse anlegen mit Nummer + Passwort
  - QR-Code: wie groß, wo angezeigt?
  - Buttons: Kopieren / Drucken / PDF / Neuen Link erzeugen / Vorschau —
    jeden testen, beschreiben was passiert
  - Vorschau im neuen Tab: was sieht der Kassierer?
  - Kasse deaktivieren / Passwort ändern / Löschen testen

### Spezial-Workflows
- [ ] Was passiert wenn du den Browser-Tab schließt während eine
      Aktion offen ist?
- [ ] Mobile-Ansicht (Browser auf Handy-Größe verkleinern):
  - MasterList — wie sieht die kompakte Karten-Ansicht aus?
  - Toolbar — werden Buttons zum 3-Punkte-Menü?
  - Eigene Produkte — wie sieht die Mobile-Liste aus?
  - Marken-Auswahl — Akkordeon statt Split-View?

### Zum Schluss
- [ ] Profil-Menü → "Testmodus beenden" — was passiert mit deinen
      simulierten Änderungen?
- [ ] Dashboard zurück
- [ ] Logout

## Wichtige Hinweise

1. **Sei präzise mit Texten:** schreib genau was draufstehet, nicht
   ungefähr ("'+ Eigenes Produkt'" statt "'Add'-Button")
2. **Schreib aus Endkunden-Sicht** — keine technischen Begriffe wie
   "API-Call" oder "data-tour-Attribut"
3. **Wenn du etwas nicht findest:** schreib das auf ("Den 'Megafon-aus'-
   Knopf konnte ich nicht finden, weil keine zentrale Werbung sichtbar war")
4. **Bei Fehler-Toast:** schreib den genauen Wortlaut auf
5. **Bei Loading-States:** wie lange? Spinner? Skeleton?

## Dateiname für Output

Speichere das Resultat als `docs/tutorial-app-walkthrough.md` im
Projekt-Repo, oder gib es als zusammenhängenden Markdown-Block zurück.

## Geschätzter Aufwand für den Browser-Agent

~2-3 Stunden für gründliche Durchklick-Session aller Bereiche.
Wenn unsicher: lieber ausführlicher dokumentieren als kürzer.

Viel Erfolg!
```

---

## 📨 Wie du das nutzt

1. **Kopiere den gesamten Block oben** (zwischen den drei Backticks `\`\`\``).
2. **Gib ihn deinem Browser-Agent** (Claude Code mit Computer-Use, oder
   wo immer du den Agent hast).
3. **Stelle dem Agent zusätzlich bereit:**
   - URL der App
   - Login-Daten (Admin-Account + ggf. User-Account)
   - Hinweis: Test-Modus aktivieren bevor er Aktionen macht (sonst echte DB-Änderungen!)
4. **Wenn der Agent fertig ist:** gib mir die Markdown-Datei zurück
   (Pfad oder Inhalt im Chat).
5. **Ich konsolidiere dann:**
   - Seine Live-Beobachtung (real, präzise)
   - Meine 4 Code-Audits (vollständig, technisch)
   - Existierende Anker in `tutorial-anchors.ts`
   ⇒ Final-Tour-Skripte mit echten Detail-Steps für alle 13 Touren.

## ⚠️ Wichtige Sicherheitshinweise

- **Test-Modus ist KRITISCH:** ohne Test-Modus würde der Browser-Agent echte Daten anlegen/löschen. Stell sicher dass dein Admin-Account Test-Modus aktivieren KANN (nicht alle Rollen können das).
- **Kassenmodus-Aktionen sind NICHT test-modus-fähig:** das Anlegen einer Kasse ist immer real. Wenn der Browser-Agent das testen soll, lege vorher eine Test-Kasse an die du danach wieder löschst.
- **Excel-Upload weglassen** falls du das nicht riskieren willst — der Agent kann einfach beschreiben dass es einen Upload-Knopf gibt.
