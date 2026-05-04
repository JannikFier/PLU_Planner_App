# Tutorial-Touren — Vorschlag v3 (Schritt 1 des Neuaufbaus)

**Datum:** 2026-05-03
**Stand:** überarbeitet nach Doku-Recherche und User-Antworten.

---

## Vorab — Mea culpa

In v2 hatte ich dir 10 Fragen gestellt, die ich selbst hätte beantworten können. Jetzt habe ich:
- `docs/FEATURES.md` (vor allem die Farbcodes-Tabelle)
- `docs/TUTORIAL.md`, `docs/TUTORIAL_CURRICULUM.md`
- `docs/ROLES_AND_PERMISSIONS.md`
- `src/lib/obst-offer-name-highlight.ts` (Werbungs-Farben)
- Curriculum-Files

… durchgelesen und in den Vorschlag eingearbeitet. Was übrig bleibt sind nur noch deine inhaltlichen Entscheidungen, keine Wissens-Fragen.

---

## Was sich geändert hat ggü. v2

- ❌ **Excel-Upload entfernt** aus Familie-Vorschlag — ist Super-Admin-only laut `ROLES_AND_PERMISSIONS.md` Z. 27, und Super-Admin hat eh kein Tutorial.
- ✅ **Markierungs-Bedeutungen drin** — direkt in den Tour-Steps:
  - **PLU rot** = PLU geändert (gleicher Name, neue PLU)
  - **PLU gelb** = neues Produkt in dieser KW
  - **Name helleres Gelb** = 3-Tages-Werbung (`ordersatz_3day`)
  - **Name dunkleres Gelb** = Wochen-Werbung (`ordersatz_week`, `exit`, manuelle Werbung)
- ✅ **Bezeichnungsregeln-Konzept klargestellt** — hat NICHTS mit Warengruppen zu tun: reine Text-Regeln zum alphabetischen Sortieren (z.B. „Bio nach vorne", „Gut & Günstig in B-Ecke")
- ✅ **Test vs. Fest erklärt** — Test = nur auf wöchentlichem Angebotszettel; Fest = auch in großer Haupt-PDF
- ✅ **Markenauswahl mit 3 Quellen** (Edeka, Harry, Aryzta) erklärt
- ✅ **Lokalpreis** = eigener Preis pro Markt überschreibt Standardpreis
- ✅ **EK/VK** = Einkaufspreis / Verkaufspreis
- ✅ **Backshop-Angebote** = werden automatisch hochgeladen (~Mittwoch der Vorwoche)
- ✅ **Gruppenregeln** mit Markenauswahl-Verbindung erklärt (z.B. „Brot von Harry, aber Edeka-Brot trotzdem")
- ✅ **Feedback-Kanal-Frage** rausgenommen — kommt später wenn gebaut
- ✅ **Tutorial-Knopf-Vereinigung** als feste Anforderung notiert
- ⚠️ **Backshop „blau"** — gibt es laut Doku nicht; ich hatte das in v1 erfunden. Falls es eine Markierung gibt die ich übersehen habe, sag Bescheid

---

## Globale UX-Anforderungen (für Schritt 2/3)

- **Ein Tutorial-Knopf statt zwei** — heute Sparkles + Onboarding-Checklist getrennt → ein einziges Symbol mit Tour-Auswahl + Status
- **User wählt selbst Reihenfolge bei Mehrfach-Bereichen** ⭐ NEU — wenn User sowohl Obst als auch Backshop sieht, fragt das Tutorial: „Womit willst du anfangen — Obst oder Backshop?" Klick wählt. Wenn nur ein Bereich freigeschaltet (Markt-Sichtbarkeit): Frage entfällt automatisch, der freigeschaltete Bereich startet direkt.
- **Test-Modus ist Voraussetzung für interaktive Touren** ⭐ NEU — A1 (Onboarding) startet immer den Test-Modus, BEVOR die User in B/C/D/E/F-Touren echte Aktionen ausführen. So kann der User gefahrlos rumklicken, ohne echte Daten kaputtzumachen. Beim Verlassen des Test-Modus: alle Test-Änderungen automatisch verworfen.
- **Konsistentes Design** durchweg — Coach-Panel-Layout immer gleich, Fier immer dabei (Avatar + Anrede „Fier:")
- **Sequenzielle Erklärungs-Tiefe** — wenn User Backshop NACH Obst macht, sind Konzepte wie „Warengruppen", „Markierungen" schon bekannt → kürzer ansprechen (und umgekehrt)
- **Mehr klicken/tippen, weniger lesen** — pro Tour mind. 1-2 echte App-Aktionen
- **Detail-Niveau: Step-für-Step** — pro Step ein konkreter Fier-Text + Klick-Aktion + was danach passiert. Keine Stichpunkt-Listen wie „Optionen erklären, Felder ausfüllen" — der User soll genau wissen was er als nächstes tun soll.
- **Mobile/Tablet vollwertig** ⭐ NEU — alle Touren müssen sowohl auf Desktop als auch auf Handy/Tablet funktionieren. Architektur-Anforderung (Schritt 3): Coach-Panel-Layout positioniert sich responsive, Selektoren funktionieren je nach Device-Class (z.B. mobile-versions vs. desktop-versions von Buttons). Kein eigener Mobile-Inhalt-Step — der User-Workflow ist gleich, nur die UI passt sich an.
- **Touren-Auswahl gefiltert nach Listen-Sichtbarkeit** ⭐ NEU — wenn der User in seinem Markt z.B. Backshop nicht freigeschaltet hat, werden D/E-Touren nicht angeboten. Wenn er beides hat, fragt das Welcome-Modal „womit anfangen?". Keine Inhalts-Anforderung — Architektur-Logik (Schritt 3).
- **Markt-Switcher als Mini-Tour T-Multi-Markt (conditional)** ⭐ NEU — wenn User mehrere Märkte sieht (`useStores().data.length > 1`), wird eine Mini-Tour „Markt wechseln" angeboten (~3 Steps: Header-Switcher zeigen, klick, anderer Markt aktiv). Wenn nur ein Markt: Tour wird gar nicht angeboten.

---

## Rollen-Konzept (kein Super-Admin)

| Rolle | Touren |
|---|---|
| **Viewer** | A1, B1 (light), D1 (light), G1 — nur lesen + PDF |
| **User** | A1, B1, B2, B3, B4, B5, D1, D2, D3, D4, D5, D6, G1 |
| **Admin** | alles von User + C1, C2, E1, E2, F1, F2 |

Symbole: 🆕 = komplett neu, ⚙️ = stark überarbeitet, 🔄 = leicht angepasst

---

## Familie A — Onboarding (alle Rollen)

### A1 · Erste Schritte ⚙️ (~6-8 Steps)
**Inhalt:**
1. Fier-Begrüßung („Hi, ich bin Fier")
2. Header-Übersicht: Glocke = Benachrichtigungen, **Tutorial-Knopf** (vereint), Profil
3. Profilmenü öffnen (interaktiv)
4. Im Profil-Menü: „Einführung wiederholen" zeigen — Wiederaufruf-Pfad
5. Testmodus erklären (gefahrlos ausprobieren) + starten (interaktiv)
6. Logout zeigen
7. Abschluss: „Lass uns deinen ersten Bereich angucken — was zuerst?" → Tour-Auswahl

---

## Familie B — Obst & Gemüse

### B1 · Obst-Liste verstehen + Glocke 🔄+⚙️ (~12-14 Steps)
**Rolle:** alle (User, Admin, Viewer)

**Liste-Block:**
1. Vom Dashboard auf „Obst & Gemüse" (interaktiv)
2. **Für Admin:** Hub-Page erklären — Wahl zwischen „PLU-Liste" und „Konfiguration"
3. „PLU-Liste" öffnen (interaktiv)
4. Listen-Aufbau (Stück / Gewicht oder Mixed)
5. **Markierungen ausführlich:**
   - **PLU rot** = PLU hat sich geändert (gleiches Produkt, neue PLU-Nummer von letzter zu dieser KW)
   - **PLU gelb** = neues Produkt in dieser KW
   - **Name helleres Gelb** = 3-Tages-Werbung
   - **Name dunkleres Gelb** = Wochen-Werbung (oder Exit/Aktion)
6. **Suche öffnen + Beispiel-Suche (interaktiv!):** „Such doch mal nach 'Banane' — Lupe oben rechts klicken, 'Banane' tippen, Enter. Du siehst nur noch Bananen-Produkte. So findest du auch andere Produkte (z.B. 'Tomate', 'Apfel'). Suche schließen mit X."
7. Toolbar-Buttons übersichtlich: Eigene / Ausgeblendet / Werbung / Umbenannt / PDF
8. Kontextzeile (Version/KW oben)
9. Mobile vs. Desktop kurz

**Glocke-Block (Abschluss, bevor User Liste verlässt — gibt Überblick was er mit der Liste alles anstellen kann):**
10. **Glocken-Symbol** oben im Header (interaktiv) — „Hier siehst du, was sich an der Liste geändert hat"
11. **Tab „Neu":** Produkte die diese KW neu sind (Verbindung zur gelben PLU-Markierung)
12. **Tab „Geändert":** Produkte mit neuer PLU (Verbindung zur roten PLU-Markierung)
13. **Tab „Entfernt" + Carryover (interaktiv):** rausgefallene Produkte für 1 Woche verlängern, damit du Restbestand verkaufen kannst
14. „Alle als gelesen markieren"
15. Abschluss: „Eigene Touren für jede dieser Aktionen — siehe Tutorial-Knopf"

### B2 · Eigene Obst-Produkte 🆕 (~5-7 Steps, interaktiv)
**Rolle:** User, Admin

1. „Eigene Produkte"-Button in Toolbar (interaktiv)
2. Liste der eigenen Produkte erklären
3. „+ Neues Produkt" klicken (interaktiv)
4. **Optionen erklären:** Entweder PLU (4-5 Ziffern) ODER Preis (Dezimalzahl) — nicht beides
5. Felder ausfüllen (interaktiv) — Beispiel-Füll-Knopf für Tutorial-Modus
6. Speichern → Produkt erscheint in der Liste mit **Gelb-Markierung** (zeitlich begrenzt nach Layout-Einstellung)
7. „Wenn du den Namen ändern willst → Umbenannt-Bereich"

### B3 · Obst-Produkte ausblenden + umbenennen 🆕 (~6-8 Steps, interaktiv)
**Rolle:** User, Admin

1. „Ausgeblendete"-Button (interaktiv)
2. Was sind ausgeblendete Produkte? (aus Liste, aber nicht gelöscht — wieder einblendbar)
3. Produkt manuell ausblenden (interaktiv)
4. Wieder einblenden
5. Wechsel zu „Umbenannt"-Toolbar (interaktiv)
6. **Wichtig:** Master-Produkte umbenennen ist erlaubt für User+Admin; eigene Custom-Produkte nur eigene
7. Produkt umbenennen (interaktiv) — neuen Namen eingeben
8. Speichern, Effekt in Liste sehen — ggf. zurücksetzen

### B4 · Obst-Werbung anlegen + ändern ⚙️ (~6-8 Steps, interaktiv)
**Rolle:** User, Admin

1. „Werbung"-Button (interaktiv)
2. **Eigene vs. Zentrale Werbung** — Unterschied: zentrale kommt vom Super-Admin, eigene macht der Markt selbst
3. **„Megafon aus" — mit Beispiel:**
   - Bei **zentraler Werbung** (vom Hauptsitz für alle Märkte) gibt es ein **Megafon-Symbol** an jedem Eintrag
   - Beispiel: Zentrale Kampagne „Bananen 1,99 €" → erscheint in deinem Markt mit Werbungs-Markierung (dunkleres/helleres Gelb)
   - Du willst Bananen **in deinem Markt nicht als Werbung** zeigen → **Megafon ausschalten**
   - **Ergebnis:** Werbungs-Markierung weg, Bananen sind aber **noch in der Liste** mit normalem Preis
   - Wenn du Bananen **komplett aus deiner Liste** weghaben willst → zusätzlich **ausblenden** (siehe B3)
4. Eigene Werbung: Produkt hinzufügen (interaktiv)
5. Kalenderwoche festlegen
6. **Lokalpreis:** Eigener Preis nur für diesen Markt (überschreibt zentralen Preis falls vorhanden)
7. Speichern
8. Werbung wieder ändern: Eintrag öffnen, anpassen
9. Hinweis: dunkleres Gelb in der Liste = Wochen-Werbung, helleres Gelb = 3-Tages-Werbung

### B5 · Obst PDF-Export 🆕 (~3-4 Steps)
**Rolle:** User, Admin (Viewer hat eigenen Lese-PDF in F-Light)

1. PDF-Button (interaktiv)
2. Optionen: KW, Layout-bedingte Optionen
3. Vorschau zeigen
4. Download
5. „S/W-tauglich: gestrichelter Rahmen = neu, fetter Rahmen = PLU geändert" (auch bei Schwarz-Weiß-Druck erkennbar)

---

## Familie C — Obst & Gemüse Konfiguration (nur Admin)

### C1 · Konfig-Hub & Layout ⚙️ (~6-8 Steps)
**Rolle:** Admin

1. Vom Hub auf „Konfiguration" (interaktiv)
2. Konfig-Hub: drei Kacheln (Layout, Bezeichnungsregeln, Warengruppen)
3. Layout-Page öffnen (interaktiv)
4. **Wichtige Einstellungen:**
   - Display-Modus: Stück/Gewicht getrennt oder „Alle zusammen"
   - Sortierung: Alphabetisch oder Nach Warengruppen
   - Wochentage / Markierungslänge (wie lange gelb/rot bleibt)
   - Schriftgrößen
   - Feature-Flags: Eigene Produkte aktiv? Werbung aktiv?
5. Vorschau testen
6. Speichern
7. Hinweis: Layout-Änderungen wirken nur in diesem Markt

### C2 · Bezeichnungsregeln + Warengruppen ⚙️+🆕 (~9-11 Steps, interaktiv)
**Rolle:** Admin

**WICHTIG:** Bezeichnungsregeln und Warengruppen sind ZWEI VERSCHIEDENE Konzepte!

1. „Bezeichnungsregeln"-Page öffnen (interaktiv)
2. **Was sind Bezeichnungsregeln?** Reine Text-Regeln für alphabetisches Sortieren:
   - Beispiel: „Alles mit 'Bio' im Namen → nach vorne"
   - Beispiel: „Gut & Günstig → in B-Ecke"
   - Hilft beim Filtern/Sortieren in alphabetischer Liste
3. Beispiel-Regel anlegen (interaktiv) — Schlagwort eingeben + Position wählen
4. Anwenden → Effekt in Liste sehen
5. Wechsel zu „Warengruppen" (interaktiv)
6. **Was sind Warengruppen?** Strukturelle Gruppierung der Produkte:
   - „Wie viele Warengruppen brauche ich?" → eigene Entscheidung
   - „Welche Produkte kommen wohin?" → manuell oder per Regel
   - Wirkt nur wenn Layout auf „Sortierung Nach Warengruppen" steht
7. Neue Warengruppe anlegen (interaktiv)
8. Auf Warengruppe klicken → Produkt zuweisen (interaktiv)
9. Reihenfolge der Warengruppen ändern
10. **Verbindung:** Warengruppe vs. Bezeichnungsregel — beide unabhängig kombinierbar

---

## Familie D — Backshop

### D1 · Backshop-Liste verstehen + Glocke 🔄+⚙️ (~12-14 Steps)
**Rolle:** alle (User, Admin, Viewer)
**Sequenz-abhängig:** wenn B1 schon gemacht → Markierungs-/Glocken-Steps kürzer („wie bei Obst — gleiche Logik")

**Liste-Block:**
1. Vom Dashboard auf „Backshop" (interaktiv)
2. **Für Admin:** Hub-Page — Wahl zwischen Liste / Marken-Auswahl / Konfiguration
3. „Liste" öffnen (interaktiv)
4. Listen-Aufbau (Bild, PLU, Name)
5. **Markierungen erklären** (ähnlich wie Obst — kürzer wenn B1 schon gemacht):
   - **PLU rot** = PLU geändert
   - **PLU gelb** = neues Produkt
   - Name-Markierungen für Werbung/Angebote (analog Obst, falls auch im Backshop aktiv)
6. **Angebote-Konzept:** „Werden automatisch hochgeladen, meistens Mittwoch der Vorwoche, immer für die Folge-KW verfügbar"
7. **Marken-Badge:** E (Edeka), H (Harry), A (Aryzta) — drei Quellen, gleiche Produkte teilweise von mehreren
8. Suche öffnen (interaktiv)
9. Toolbar-Buttons: Eigene / Ausgeblendet / Werbung / Umbenannt / PDF
10. „Marken-Auswahl ist eigene Tour" → leitet zu D4

**Glocke-Block (Abschluss, kürzer wenn B1 schon gemacht — sonst wie B1 Schritte 10-15):**
11. Glocke öffnen (interaktiv)
12. Tabs Neu / Geändert / Entfernt — analog Obst, aber mit Backshop-Quellen (Edeka/Harry/Aryzta)
13. Carryover-Verlängerung (interaktiv)
14. Abschluss: „Detail-Touren für die einzelnen Aktionen findest du im Tutorial-Knopf"

### D2 · Eigene Backshop-Produkte: testen vs. fest 🆕 (~6-7 Steps, interaktiv)
**Rolle:** User, Admin

1. „Eigene Produkte"-Button (interaktiv)
2. **Test vs. Fest — der Unterschied:**
   - **Test:** Produkt erscheint nur auf dem **wöchentlichen Angebotszettel** (den du eh ausdruckst). Vorteil: weniger Papier, weil kein neuer Druck der großen Liste nötig
   - **Fest:** Produkt erscheint auch in der **großen Haupt-PDF** (die einmal pro Woche groß gedruckt wird)
3. **Empfehlung:** Erst „Test" → wenn sich's bewährt, auf „Fest" umstellen
4. Neues Produkt testweise anlegen (interaktiv)
5. Speichern, in Liste sehen
6. Konvertieren von „Test" zu „Fest" (falls möglich)
7. „Wenn der Name doch nicht stimmt → Umbenannt-Bereich"

### D3 · Backshop ausblenden + umbenennen 🆕 (~6-8 Steps, interaktiv)
**Rolle:** User, Admin
**Inhalt:** analog B3, plus Hinweis auf Gruppenregeln-Verbindung (siehe E2 — Gruppenregeln können auch ausblenden)

### D4 · Backshop Markenauswahl 🆕 (~5-6 Steps, interaktiv)
**Rolle:** User, Admin

1. Markenauswahl-Page öffnen (interaktiv)
2. **Was ist Markenauswahl?** Im Backshop gibt's drei Quellen (Edeka, Harry, Aryzta), die teilweise **dasselbe Produkt** anbieten. Du wählst, von welcher Marke du die PLU haben willst
3. **Bedienung:** Auf die gewünschte Marken-Kachel klicken (Kachel-Auswahl, kein Swipe)
4. Marken aktivieren/deaktivieren (interaktiv)
5. Effekt in der Liste sehen (Marken-Badge E/H/A)
6. **Verbindung zu Gruppenregeln (E2):** „Wenn du sagst 'alles Brot von Harry', kannst du via Gruppenregeln einzelne Edeka-Brote trotzdem behalten"

### D5 · Backshop Werbung & Bestellungen ⚙️ (~8-10 Steps, interaktiv)
**Rolle:** User, Admin

1. Werbungs-Page (KW-Liste) öffnen (interaktiv)
2. Was bedeutet Werbung im Backshop? — User-Zitat: „Produkte über die Werbung bestellen"
3. Eine KW öffnen (interaktiv)
4. Produkt für KW hinzufügen (interaktiv)
5. **Wochenmenge eintragen** — wie viele Stück bestellen?
6. **EK = Einkaufspreis, VK = Verkaufspreis** (Standard) — ggf. lokal anpassen
7. **Auslieferung-ab-Datum:** ab wann das Produkt verfügbar ist
8. Was, wenn Produkt-Daten falsch aussehen? → Wechsel zu Umbenannt
9. Speichern, in Liste sehen
10. Hinweis: spezielle Visuals (z.B. „angemalt") — kurzes Hinweis-Element

### D6 · Backshop PDF-Export 🆕 (~3-4 Steps)
**Rolle:** User, Admin
**Inhalt:** analog B5, plus Hinweis auf Bilder im PDF (Backshop hat Bild-Spalte)

---

## Familie E — Backshop Konfiguration (nur Admin)

### E1 · Konfig-Hub, Layout, Bezeichnungsregeln ⚙️ (~7-9 Steps)
**Rolle:** Admin

1. Vom Backshop-Hub auf „Konfiguration" (interaktiv)
2. Konfig-Hub: 4-5 Kacheln (Layout, Bezeichnungsregeln, Warengruppen, Sortierung, Gruppenregeln)
3. Layout-Page (interaktiv) — Anzeige-Modus, Wochentage, Schriftgrößen, Markierungsdauer
4. **Backshop-spezifisch:** Anzeige nur „Alle zusammen (alphabetisch)" oder „Nach Warengruppen (alphabetisch)" — keine Stück/Gewicht-Trennung
5. Wechsel zu Bezeichnungsregeln (interaktiv)
6. **Sequenz-abhängig:** wenn Obst-Konfig schon gemacht, kürzer („wie bei Obst — gleiche Logik"); sonst ausführlich (siehe C2)
7. Beispiel-Regel anlegen (interaktiv)
8. Anwenden auf Liste

### E2 · Warengruppen + Sortierung + Gruppenregeln 🆕+⚙️ (~9-12 Steps, interaktiv)
**Rolle:** Admin

1. Warengruppen-Page (interaktiv)
2. **Was sind Warengruppen?** Strukturelle Gruppierung — sequenz-abhängig
3. Warengruppe anlegen, Produkt klicken, zuweisen (interaktiv)
4. **Workflow für Falsch-Zuordnung:** auf Warengruppe klicken → Produkt klicken → zur anderen Warengruppe verschieben → oder „Zuordnung aufheben"
5. **Schlagwort-basierte Zuordnung** (Karte „Zuordnung nach Schlagwort"): Regel anlegen, „Anwenden" klicken (interaktiv)
6. Wechsel zu „Sortierung" — Reihenfolge der Warengruppen anpassen (Drag & Drop)
7. Wechsel zu „Gruppenregeln"
8. **Was sind Gruppenregeln?** „Produkte werden auf einmal ausgeblendet" — Beispiel: „Alle Brote von Edeka"
9. Beispiel-Regel anlegen (interaktiv)
10. Wechsel zur Liste — sehen dass Produkt jetzt unter „Ausgeblendete" steht (interaktiv)
11. Erklären: „Durch Regeln gefiltert" ist die Markierung dort
12. **Verbindung Markenauswahl (D4) ↔ Gruppenregeln:** „Brot von Harry per Markenauswahl, ABER Edeka-Brot trotzdem per Gruppenregel-Ausnahme"

---

## Familie F — Verwaltung (nur Admin)

### F1 · Benutzer verwalten ⚙️ (~5-7 Steps, interaktiv)
**Rolle:** Admin

1. UserManagement öffnen (interaktiv)
2. Übersicht aller Benutzer (Admin sieht alle der eigenen Firma)
3. Neuen User anlegen (interaktiv) — Name, Personalnummer/E-Mail, Rolle
4. Markt zuweisen (interaktiv)
5. **Bereiche-Sichtbarkeit setzen:** Obst und/oder Backshop (UND-Verknüpfung mit Markt-Sichtbarkeit)
6. Passwort zurücksetzen — Einmalpasswort kommunizieren
7. „Wenn der User gelöscht werden soll → Löschen-Knopf" (Hinweis: nur Same-Company)

### F2 · Kassenmodus & QR-Code 🆕 (~5-7 Steps, interaktiv)
**Rolle:** Admin

1. Kassenmodus-Page öffnen (interaktiv)
2. Was ist eine Kasse? Erklärung: Personal-Tablet/Bildschirm an der Kasse
3. Erste Kasse anlegen — Nummer wählen, **Passwort setzen (mind. 6 Zeichen)** (interaktiv)
4. QR-Code zeigt sich automatisch
5. **Was mache ich mit dem QR-Code?**
   - Drucken (Knopf in Tour zeigen)
   - An der Kasse anbringen
   - Personal scannt → kommt direkt zur Kassen-Anmeldung
6. Vorschau im neuen Tab testen (interaktiv)
7. **Sicherheits-Hinweis:** Token läuft nach 6 Monaten ab. Bei Leak: „Neuen Link erzeugen" → alter wird ungültig

---

## Familie G — Abschluss

### G1 · Abschluss-Tour 🔄 (~3 Steps)
**Rolle:** alle

1. „Du hast die Basics gesehen — top!"
2. Wo gibt's mehr? → Tutorial-Knopf im Header (vereint, mit Tour-Auswahl)
3. Wo gibt's Hilfe? → Profil-Menü → Einführung wiederholen

(Feedback-Kanal: noch nicht gebaut — kommt später)

---

## Zusammenfassung

**13 Touren** (v3 hatte 13 → v4 hatte 15 mit Glocke separat → jetzt v5 wieder 13, Glocke in B1/D1 integriert):
- 1 Onboarding (alle)
- 5 Obst (B1 Liste+Glocke, B2 Eigene, B3 Ausblenden+Umbenennen, B4 Werbung, B5 PDF)
- 2 Obst-Konfig (Admin)
- 6 Backshop (D1 Liste+Glocke, D2-D6 wie vorher)
- 2 Backshop-Konfig (Admin)
- 2 Verwaltung (Admin)
- 1 Abschluss

Geschätzt **~115-135 Steps** (heute: 172).

**Tour-Reihenfolge ist NICHT starr.** A1 zuerst, G1 zuletzt. Dazwischen wählt der User selbst.

---

## Mögliche Lücken — was mir auf zweitem Blick noch einfällt

Sieh dir das durch und sag mir, was wichtig genug ist um eingeplant zu werden:

| Thema | Gehört wohin | Wichtigkeit (deine Einschätzung?) |
|---|---|---|
| **Markt-Switcher** im Header (User mit mehreren Märkten) | A1 oder eigene Mini-Tour | ❓ |
| **Passwort-ändern-Page** (vor allem für Erstanmeldung mit Einmal-Passwort) | A1 als Step? | ❓ |
| **Mobile/Tablet-Spezifika** in jeder Liste-Tour | jeweiliger Liste-Tour | ❓ |
| **Vorschau-Modus** für Admin (User-Vorschau aus Profil-Menü) | gibt's nur für Super-Admin laut Doku → entfällt | – |
| **Listen-Sichtbarkeit** (Obst nicht freigeschaltet vs. Backshop freigeschaltet) | A1 als Hinweis | ❓ |
| **Notification-Badges-Bedeutung** (Glocken-Zähler) | jetzt in B1/D1 integriert | ✅ |
| **Filter in Listen** außer Suche (z.B. Markenauswahl-Effekt-Filter) | jeweilige Detail-Tour | ✅ via D4 |
| **Datums-Logik / KW-Wechsel** (was passiert wenn die KW wechselt?) | B1/D1 Step zu Kontextzeile | ✅ erwähnt |
| **Dashboard-Karten-Übersicht** (welche Karten gibt es, welche führen wohin) | A1 ergänzen? | ❓ |

---

## Beispiel-Detailausarbeitung (B2) — ist das das richtige Niveau?

Hier siehst du, wie ich Tour B2 in **echtem Tour-Skript-Niveau** ausarbeiten würde. Wenn das das Niveau ist, das du brauchst, mache ich alle anderen Touren genauso. Wenn zu wenig/zu viel: sag Bescheid.

```
# Tour B2: Eigene Obst-Produkte anlegen
Rolle: User, Admin
Voraussetzung: Test-Modus aktiv (wird in A1 gestartet); Obst-Liste ist offen
Geschätzt: 9 Steps, ~3-5 Minuten

## Step 1 — Begrüßung & Ziel
Anker: masterlist-toolbar-eigene-produkte
Modus: spotlight (kein Klick erforderlich, Weiter-Knopf)
Fier sagt:
  "Hi! In dieser Tour zeige ich dir, wie du eigene Produkte anlegst —
   das sind Produkte, die nicht aus der zentralen PLU-Liste kommen,
   sondern die du selbst pflegst (z.B. saisonale Obstsorten oder
   Sonderaktionen). Klick auf 'Eigene Produkte' oben in der Toolbar."

## Step 2 — Eigene-Produkte-Page öffnen
Anker: masterlist-toolbar-eigene-produkte
Modus: interactive (User MUSS klicken)
Validierung: Pfad enthält /custom-products
Fier sagt:
  "Klick jetzt drauf 👆"
Wenn User nicht klickt: kleine Animation am Knopf.

## Step 3 — Übersicht der Eigene-Produkte-Liste
Anker: obst-custom-list
Modus: spotlight
Fier sagt:
  "Hier landen alle Produkte, die du selbst angelegt hast.
   Aktuell ist die Liste noch leer — gleich legen wir das erste an.
   Übrigens: alle hier sichtbaren Produkte werden auch in der
   Hauptliste mit angezeigt (gelb markiert für eine kurze Zeit
   nach Anlage)."

## Step 4 — Anlegen-Knopf zeigen
Anker: obst-custom-add-button
Modus: interactive
Validierung: obst-custom-add-dialog ist offen (data-state="open")
Fier sagt:
  "Klick auf '+ Neues Produkt' — wir legen unseren ersten eigenen
   Eintrag an."

## Step 5 — Dialog: Erklärung PLU oder Preis
Anker: obst-custom-add-dialog
Modus: spotlight (in Dialog drinnen, der User braucht hier KEINEN Klick,
        aber er soll lesen, weil's wichtig ist)
Fier sagt:
  "Wichtig: Du hast zwei Möglichkeiten — entweder eine PLU-Nummer
   (4-5 Ziffern, z.B. 7123) ODER einen Preis (z.B. 1,50 €).
   Nicht beides! Bei einer PLU wiegt der Kunde an der Kasse —
   bei einem Festpreis nimmt er das Produkt einfach mit."

## Step 6 — Beispiel füllen + Speichern
Anker: obst-custom-add-dialog-submit
Modus: interactive (User darf selbst tippen ODER 'Beispiel füllen' klicken)
Hinweis im Dialog: kleiner Tutorial-Knopf "Mit Beispiel füllen" oben rechts
                   im Dialog, der die Felder mit Demo-Werten füllt
                   (z.B. PLU 99001, Name "Tutorial-Apfel"). Erscheint
                   nur wenn das Tutorial aktiv ist.
Validierung: Dialog ist geschlossen UND Liste hat einen neuen Eintrag
Fier sagt:
  "Probier's aus! Du kannst die Felder selbst ausfüllen oder oben rechts
   auf 'Mit Beispiel füllen' klicken — dann fülle ich dir was Sinnvolles
   ein. Danach 'Speichern' klicken."

## Step 7 — Bestätigung in der Liste
Anker: obst-custom-list (das neue Produkt darin hervorheben)
Modus: spotlight
Fier sagt:
  "Top — dein erstes eigenes Produkt ist da! Du siehst es jetzt sowohl
   hier als auch in der Hauptliste (mit gelber Markierung als 'neu').
   Wenn du den Namen ändern willst → Tour 'Umbenennen'.
   Wenn du es wieder loswerden willst → Bearbeiten und löschen."

## Step 8 — Zurück zur Hauptliste
Anker: masterlist-context-line (oder der Zurück-Button)
Modus: interactive
Fier sagt:
  "Klick auf den Markt-Namen oben (oder die Zurück-Taste deines
   Browsers) — wir gucken uns das in der Hauptliste an."

## Step 9 — Eigene-Produkt in Hauptliste sehen + Abschluss
Anker: masterlist-rows
Modus: spotlight
Fier sagt:
  "Da! Du siehst es jetzt zwischen den anderen Produkten, gelb markiert
   weil's neu ist. Im Test-Modus wird das beim Beenden wieder verworfen —
   echte Produkte bleiben natürlich erhalten.
   Tour fertig! 🎉"
```

**Eigenschaften dieser Beispiel-Tour:**
- Pro Step **konkreter Fier-Text** (kein Stichpunkt-Brei)
- **Modus klar** (spotlight / interactive)
- **Validierung** explizit (was muss passiert sein, damit's weiter geht)
- **Tutorial-Modus-Helfer** vorgeschlagen ('Mit Beispiel füllen'-Knopf nur sichtbar während Tutorial aktiv)
- **Verbindungen zu anderen Touren** ('→ Tour Umbenennen', '→ Tour Werbung')
- **Test-Modus-Hinweis** am Ende: was passiert beim Verlassen

---

## Was ich von dir noch brauche

1. **Tour-Liste OK?** — bleibt es bei diesen 13 Touren (mit Glocke in B1/D1)?
2. **Detail-Niveau wie B2-Beispiel oben — passt das?** Oder zu detailliert / zu wenig detailliert?
3. **Lücken-Liste** — sind die Themen wichtig genug? (Markt-Switcher, Passwort-Ändern, Mobile-Spezifika, Listen-Sichtbarkeit, Dashboard-Karten-Übersicht)
4. **„Megafon aus" — Bestätigung:** „Produkt nicht mehr in Werbung" + Hinweis „Wenn ganz weg → Ausblenden" — passt diese Erklärung?

Wenn das geklärt ist:
- **Schritt 1.5:** ich detailliere alle 13 Touren wie B2 → wird ein langes Dokument, aber genau das was du brauchst um zu sagen „der Step ist gut, der nicht"
- **Schritt 2:** Welcome-Modal-Mockup mit Tour-Auswahl-UX
- **Schritt 3:** Architektur

---

# 📜 DETAILLIERTE TOUR-SKRIPTE (Schritt 1.5)

Hier alle 13 Touren in B2-Niveau ausgearbeitet. Pro Step: **Anker** (data-tour Wert) · **Modus** (interactive/spotlight/wait-for-action) · **Fier-Text**.

Modus-Bedeutung:
- **interactive:** Tour wartet bis User die geforderte Aktion ausführt
- **spotlight:** Erklärung mit „Weiter"-Knopf — User muss aktiv klicken um zu bestätigen dass er's gelesen hat
- **wait-for-action:** Tour wartet auf eine erkennbare App-Veränderung (z.B. Dialog geht auf, Pfad wechselt)

---

## Tour A1 · Erste Schritte

**Rolle:** alle (User, Admin, Viewer)
**Voraussetzung:** keine — startet automatisch nach erstem Login
**Ziel:** App-Header & Profil-Menü kennen, Test-Modus aktiv haben für die folgenden Touren
**Steps:** 8

### Step 1 — Begrüßung
- **Anker:** dashboard-welcome
- **Modus:** spotlight
- **Fier:** „Hi! Ich bin Fier, dein Reiseführer durch diese App. Ich zeig dir Schritt für Schritt was du wo findest. Du kannst jederzeit pausieren — klick mit mir oben rechts auf 'Weiter' wenn du soweit bist."

### Step 2 — Dashboard-Karten-Übersicht
- **Anker:** dashboard-card-obst (oder erste sichtbare Karte)
- **Modus:** spotlight
- **Fier:** „Das hier ist dein Dashboard. Jede Karte führt dich zu einem Bereich der App — z.B. die Obst-Liste, Backshop, Benutzer (für Admins), Kassenmodus (für Admins). Welche Karten du siehst, hängt von deinen Rechten ab."

### Step 3 — Header oben rechts: Glocke
- **Anker:** unified-notification-bell
- **Modus:** spotlight
- **Fier:** „Oben rechts hast du die Glocke — da kommen Hinweise rein, was sich an deinen Listen geändert hat. Mehr dazu in der Liste-Tour."

### Step 4 — Header oben rechts: Tutorial-Knopf
- **Anker:** header-tutorial-icon
- **Modus:** spotlight
- **Fier:** „Hier findest du **mich** wieder — der Tutorial-Knopf. Wenn du eine Tour wiederholen willst oder eine neue starten, klick einfach drauf."

### Step 5 — Profil-Menü öffnen
- **Anker:** profile-menu
- **Modus:** interactive (User muss klicken; Validierung: Dropdown ist offen, data-state="open")
- **Fier:** „Klick mal auf dein Profilbild oben rechts (das Kreis-Symbol mit deinen Initialen). Da findest du Logout, Passwort ändern und 'Einführung wiederholen' — also mich."

### Step 6 — Test-Modus erklären
- **Anker:** header-testmode-menu-item
- **Modus:** spotlight (Dropdown ist offen, Test-Modus-Eintrag ist hervorgehoben)
- **Fier:** „Wichtig: 'Testmodus starten' macht alle deine Aktionen **vorübergehend**. Beim Beenden wird alles verworfen. Genau das brauchen wir für die Touren — du kannst gefahrlos Produkte anlegen, ausblenden, was auch immer."

### Step 7 — Test-Modus aktivieren
- **Anker:** header-testmode-menu-item
- **Modus:** interactive (User klickt auf 'Testmodus starten'; Validierung: TestMode aktiv, gelber Banner sichtbar)
- **Fier:** „Klick jetzt drauf 👆 Du siehst gleich einen gelben Rahmen — das ist dein Sicherheitsnetz."

### Step 8 — Tour-Auswahl
- **Anker:** header-tutorial-icon
- **Modus:** wait-for-action (Übergabe an Welcome-Modal Tour-Auswahl)
- **Fier:** „Top — du bist startklar! Was möchtest du als nächstes lernen? Hier sind die Touren die du anschauen kannst." (zeigt Tour-Auswahl gefiltert nach Rolle und Listen-Sichtbarkeit)

---

## Tour B1 · Obst-Liste verstehen + Glocke

**Rolle:** alle (User, Admin, Viewer)
**Voraussetzung:** A1 abgeschlossen, Test-Modus aktiv
**Ziel:** Liste-Aufbau, Markierungen verstehen, Glocke kennen
**Steps:** 13 (bei Viewer kürzer: ~9 Steps, lasse interaktive Detail-Hinweise weg)

### Step 1 — Vom Dashboard
- **Anker:** dashboard-card-obst
- **Modus:** interactive (Klick; Validierung: Pfad enthält /masterlist oder /obst-hub)
- **Fier:** „Klick auf die Obst-Karte. Das ist deine PLU-Liste."

### Step 2 — Hub-Page (nur Admin)
- **Anker:** admin-obst-hub-page
- **Modus:** spotlight (nur wenn Admin)
- **Fier:** „Als Admin landest du hier auf einer Übersicht: 'PLU-Liste' (was deine Mitarbeiter sehen) und 'Konfiguration' (wo du Layout/Regeln einstellst). Wir gehen heute auf die Liste — Konfiguration ist eine eigene Tour."

### Step 3 — Liste öffnen (nur Admin, sonst skip)
- **Anker:** admin-obst-hub-liste
- **Modus:** interactive (Klick; Validierung: Pfad /masterlist)
- **Fier:** „Klick auf 'PLU-Liste'."

### Step 4 — Listen-Aufbau
- **Anker:** masterlist-rows
- **Modus:** spotlight
- **Fier:** „Hier ist deine PLU-Liste. Je nach Markt-Einstellung siehst du Stück und Gewicht getrennt oder alles in einer Liste. Jede Zeile = ein Produkt mit PLU, Name und ggf. Markierungen."

### Step 5 — Markierung Rot
- **Anker:** masterlist-rows
- **Modus:** spotlight
- **Fier:** „**Rote PLU** = die PLU-Nummer hat sich geändert. Gleiches Produkt, neue Nummer. Wenn du Etiketten gedruckt hast, musst du die wahrscheinlich erneuern."

### Step 6 — Markierung Gelb (PLU)
- **Anker:** masterlist-rows
- **Modus:** spotlight
- **Fier:** „**Gelbe PLU** = neues Produkt diese Woche. Wenn du was verkaufen willst was du noch nicht kennst, hier suchst du."

### Step 7 — Markierung Werbung (helleres/dunkleres Gelb auf Namen)
- **Anker:** masterlist-rows
- **Modus:** spotlight
- **Fier:** „**Helleres Gelb auf dem Namen** = 3-Tages-Werbung. **Dunkleres Gelb** = Wochen-Werbung oder Exit-Aktion. Hilft dir beim Anschreiben der Schilder."

### Step 8 — Suche (interaktiv mit Bananen)
- **Anker:** masterlist-search
- **Modus:** interactive (Klick auf Lupe + 'Banane' tippen; Validierung: Liste gefiltert auf "Banane"-Treffer)
- **Fier:** „Such mal nach Bananen. Klick auf die Lupe oben, tipp 'Banane' und Enter. Du siehst nur noch Bananen-Produkte. Genauso findest du jedes andere Produkt."

### Step 9 — Suche schließen
- **Anker:** masterlist-search (oder X-Knopf in Suchleiste)
- **Modus:** interactive (Suche schließen; Validierung: Liste wieder vollständig)
- **Fier:** „Schließ die Suche wieder mit X."

### Step 10 — Toolbar-Übersicht
- **Anker:** masterlist-toolbar-actions
- **Modus:** spotlight
- **Fier:** „Oben rechts hast du die Toolbar: **Eigene Produkte** (selbst angelegt), **Ausgeblendet** (nicht in Liste), **Werbung**, **Umbenannt**, **PDF**. Für jeden Knopf gibt's eine eigene Tour."

### Step 11 — Glocke öffnen (Übergang zum Glocke-Block)
- **Anker:** unified-notification-bell
- **Modus:** interactive (Klick; Validierung: Notification-Panel offen)
- **Fier:** „Bevor wir die Liste verlassen, zeig ich dir die Glocke. Klick mal drauf."

### Step 12 — Glocke: Tabs
- **Anker:** unified-notification-bell (Panel)
- **Modus:** spotlight
- **Fier:** „Hier siehst du Tabs: **Neu** (was diese Woche dazugekommen ist — passt zu den gelben PLUs in der Liste), **Geändert** (passt zu den roten), **Entfernt** (was rausgefallen ist)."

### Step 13 — Glocke: Carryover (Verlängerung)
- **Anker:** unified-notification-bell (Tab "Entfernt")
- **Modus:** spotlight (interactive falls User wirklich was verlängert)
- **Fier:** „Wenn ein Produkt rausfällt aber du noch Restbestand hast: Klick auf **'1 Woche verlängern'**. Dann bleibt die PLU eine Woche länger gültig — du kannst den Restbestand verkaufen."

### Step 14 — Abschluss
- **Anker:** masterlist-toolbar-actions
- **Modus:** spotlight
- **Fier:** „Tour fertig 🎉. Du kennst jetzt deine Liste. Für Eigene Produkte / Ausblenden / Werbung / PDF gibt's eigene Touren — du findest sie unter dem Tutorial-Knopf oben."

---

## Tour B2 · Eigene Obst-Produkte anlegen

**Rolle:** User, Admin
**Voraussetzung:** A1 + Test-Modus aktiv; Obst-Liste mind. einmal gesehen (B1 empfohlen aber nicht zwingend)
**Ziel:** Eigenes Produkt anlegen, in Liste sehen
**Steps:** 9 (siehe Beispiel-Tour weiter oben — diese ist die Master-Referenz)

→ Volle Step-Beschreibung siehe oben unter "Beispiel-Detailausarbeitung (B2)"

---

## Tour B3 · Obst-Produkte ausblenden + umbenennen

**Rolle:** User, Admin
**Voraussetzung:** A1 + Test-Modus aktiv
**Ziel:** Produkt ausblenden + wieder einblenden, Produkt umbenennen, Effekt in Liste sehen
**Steps:** 9

### Step 1 — Begrüßung
- **Anker:** masterlist-toolbar-ausgeblendete
- **Modus:** spotlight
- **Fier:** „Diese Tour zeigt dir zwei Sachen: wie du Produkte aus deiner Liste ausblendest (z.B. weil du sie nicht verkaufst) und wie du Produkte umbenennst (z.B. weil der zentrale Name unklar ist)."

### Step 2 — Ausgeblendet-Page öffnen
- **Anker:** masterlist-toolbar-ausgeblendete
- **Modus:** interactive (Klick; Validierung: Pfad /hidden-products)
- **Fier:** „Klick auf 'Ausgeblendete' in der Toolbar."

### Step 3 — Ausgeblendet-Übersicht
- **Anker:** obst-hidden-list
- **Modus:** spotlight
- **Fier:** „Hier landen Produkte die du aus der Liste rausnimmst. Sie sind **nicht gelöscht** — du kannst sie jederzeit wieder einblenden."

### Step 4 — Produkt manuell ausblenden
- **Anker:** obst-hidden-add-button
- **Modus:** interactive (Klick + Produkt wählen + speichern; Validierung: Liste hat einen Eintrag mehr)
- **Fier:** „Klick '+ Produkt ausblenden', wähl ein Beispiel-Produkt aus, speichern. Schon ist es nicht mehr in der Hauptliste."

### Step 5 — Wieder einblenden
- **Anker:** obst-hidden-list
- **Modus:** interactive (Eintrag löschen; Validierung: Liste hat einen Eintrag weniger)
- **Fier:** „Klick auf den Mülleimer neben deinem ausgeblendeten Produkt — schon ist es wieder in der Hauptliste."

### Step 6 — Wechsel zu Umbenannt
- **Anker:** masterlist-toolbar-umbenennen
- **Modus:** interactive (Klick; Validierung: Pfad /renamed-products)
- **Fier:** „Jetzt zum Umbenennen. Geh zurück zur Liste-Toolbar und klick 'Umbenannt'."

### Step 7 — Umbenennen-Übersicht
- **Anker:** obst-renamed-list
- **Modus:** spotlight
- **Fier:** „Hier siehst du alle Produkte die du selbst umbenannt hast. Der zentrale Name bleibt im System — du siehst aber **deinen Namen** in der Liste."

### Step 8 — Produkt umbenennen
- **Anker:** obst-renamed-add-button
- **Modus:** interactive (Klick + Produkt wählen + neuer Name + speichern; Validierung: neuer Eintrag)
- **Fier:** „Probier's: '+ Umbenennen', wähl ein Produkt, gib einen neuen Namen ein (z.B. 'Bio-Apfel klein'), speichern. Du siehst den neuen Namen sowohl hier als auch in der Hauptliste."

### Step 9 — Abschluss
- **Anker:** obst-renamed-list
- **Modus:** spotlight
- **Fier:** „Geschafft! Im Test-Modus wird das beim Beenden alles verworfen. Echte Aktionen bleiben erhalten."

---

## Tour B4 · Obst-Werbung anlegen + ändern

**Rolle:** User, Admin
**Voraussetzung:** A1 + Test-Modus aktiv
**Ziel:** Werbung anlegen, Lokalpreis verstehen, Megafon kennen
**Steps:** 10

### Step 1 — Werbung-Page öffnen
- **Anker:** masterlist-toolbar-werbung
- **Modus:** interactive (Klick; Validierung: Pfad /offer-products)
- **Fier:** „Klick 'Werbung' in der Toolbar."

### Step 2 — Übersicht: Eigene + Zentrale
- **Anker:** obst-offer-section-eigen
- **Modus:** spotlight
- **Fier:** „Werbung gibt's in zwei Sorten: **Eigene Werbung** machst du selbst für deinen Markt. **Zentrale Werbung** kommt vom Hauptsitz für alle Märkte. Beide werden in der Liste mit gelbem Namen markiert."

### Step 3 — Megafon-aus mit Bananen-Beispiel
- **Anker:** obst-offer-section-zentral
- **Modus:** spotlight
- **Fier:** „Beispiel: Hauptsitz macht Aktion 'Bananen 1,99 €'. In deinem Markt willst du das nicht bewerben. Klick neben dem Eintrag aufs **Megafon** → ausgeschaltet → keine Werbungs-Markierung mehr in deiner Liste. Bananen sind aber noch da. Wenn du sie ganz raus haben willst → zusätzlich ausblenden (siehe B3)."

### Step 4 — Eigene Werbung anlegen: Knopf
- **Anker:** obst-offer-add-button
- **Modus:** interactive (Klick; Validierung: Dialog offen)
- **Fier:** „Jetzt legen wir eigene Werbung an. Klick '+ Produkt zur Werbung'."

### Step 5 — Produkt suchen + auswählen
- **Anker:** obst-offer-add-dialog
- **Modus:** interactive (Produkt finden + bestätigen)
- **Fier:** „Such ein Produkt (z.B. 'Apfel'), wähl eines aus."

### Step 6 — Kalenderwoche festlegen
- **Anker:** obst-offer-add-dialog
- **Modus:** interactive (KW wählen)
- **Fier:** „Welche KW soll's beworben werden? Wähl die aktuelle oder eine kommende."

### Step 7 — Lokalpreis erklären + setzen
- **Anker:** obst-offer-local-price-dialog (oder im Add-Dialog)
- **Modus:** spotlight + interactive
- **Fier:** „**Lokalpreis** ist dein eigener Preis nur für deinen Markt. Wenn du nichts einträgst, gilt der zentrale/Standard-Preis. Wenn du z.B. 1,49 € einträgst, sieht der Kunde diesen Preis — andere Märkte sehen den Standard."

### Step 8 — Speichern
- **Anker:** obst-offer-add-dialog (Submit-Knopf)
- **Modus:** interactive (Validierung: Dialog zu, Eintrag in Liste)
- **Fier:** „Speichern. Dein Produkt steht jetzt in der Werbung."

### Step 9 — Werbung ändern
- **Anker:** obst-offer-section-eigen (auf den eben angelegten Eintrag)
- **Modus:** interactive (Klick auf Eintrag → öffnet Bearbeiten)
- **Fier:** „Wenn was nicht stimmt: Eintrag anklicken, anpassen, neu speichern. Genauso funktioniert's für KW oder Preis ändern."

### Step 10 — Abschluss
- **Anker:** obst-offer-toolbar
- **Modus:** spotlight
- **Fier:** „Tour fertig! In der Hauptliste siehst du jetzt das Produkt mit dunklerem Gelb auf dem Namen — Wochen-Werbung."

---

## Tour B5 · Obst PDF-Export

**Rolle:** User, Admin (Viewer kann nur lesen, eigene Mini-Tour)
**Voraussetzung:** A1 + Test-Modus optional (PDF-Generierung ist read-only)
**Steps:** 4

### Step 1 — PDF-Knopf
- **Anker:** masterlist-toolbar-pdf
- **Modus:** interactive (Klick; Validierung: Dialog offen)
- **Fier:** „PDF erstellen — klick auf 'PDF' in der Toolbar."

### Step 2 — Optionen
- **Anker:** masterlist-toolbar-pdf (Dialog)
- **Modus:** spotlight
- **Fier:** „Du kannst die KW wählen und je nach Layout-Einstellung ein paar Optionen anpassen. Für den Standard-Druck reichen die Voreinstellungen."

### Step 3 — Vorschau
- **Anker:** masterlist-toolbar-pdf (Preview)
- **Modus:** spotlight
- **Fier:** „Hier siehst du die Vorschau. **S/W-Druck:** rote Zeilen werden mit fettem Rahmen, gelbe mit gestricheltem Rahmen markiert — auch ohne Farbe erkennst du Änderungen."

### Step 4 — Download
- **Anker:** masterlist-toolbar-pdf (Download-Knopf)
- **Modus:** interactive (Download)
- **Fier:** „Download. Fertig — drucken und an die Wand!"

---

## Tour C1 · Obst-Konfiguration: Hub & Layout (nur Admin)

**Rolle:** Admin
**Voraussetzung:** A1 + Test-Modus aktiv
**Steps:** 7

### Step 1 — Konfig öffnen vom Hub
- **Anker:** admin-obst-hub-konfig
- **Modus:** interactive (Klick; Validierung: Pfad /admin/obst/konfiguration)
- **Fier:** „Vom Obst-Hub aus klick auf 'Konfiguration'."

### Step 2 — Konfig-Hub-Übersicht
- **Anker:** obst-konfig-hub-page
- **Modus:** spotlight
- **Fier:** „Hier hast du drei Bereiche: **Layout** (wie sieht die Liste aus), **Bezeichnungsregeln** (wie wird sortiert), **Warengruppen** (wie wird gruppiert). Heute Layout."

### Step 3 — Layout öffnen
- **Anker:** obst-konfig-hub-layout-card
- **Modus:** interactive (Klick; Validierung: Pfad /admin/layout)
- **Fier:** „Klick auf die Layout-Karte."

### Step 4 — Display-Modus erklären
- **Anker:** obst-konfig-layout-display-mode-card
- **Modus:** spotlight
- **Fier:** „**Stück / Gewicht getrennt**: zwei Listen untereinander. **Alle zusammen**: eine Liste, alphabetisch."

### Step 5 — Markierungslänge
- **Anker:** obst-konfig-layout-mark-duration-card
- **Modus:** spotlight + interactive (Wert anpassen)
- **Fier:** „Wie lange bleiben **rote** und **gelbe** Markierungen sichtbar? Standard: 4 Wochen. Du kannst's anpassen."

### Step 6 — Vorschau
- **Anker:** obst-konfig-layout-preview
- **Modus:** spotlight
- **Fier:** „Live-Vorschau zeigt dir wie die Liste aussehen wird. Wenn was nicht passt: hier siehst du's sofort."

### Step 7 — Speichern + Effekt sehen
- **Anker:** obst-konfig-layout-save-status
- **Modus:** spotlight
- **Fier:** „Änderungen speichern automatisch. Wenn du jetzt in die Liste gehst, siehst du das neue Layout."

---

## Tour C2 · Obst-Konfiguration: Bezeichnungsregeln + Warengruppen

**Rolle:** Admin
**Voraussetzung:** A1 + Test-Modus aktiv
**Steps:** 11

### Step 1 — Bezeichnungsregeln öffnen
- **Anker:** obst-konfig-hub-rules-card
- **Modus:** interactive (Klick; Validierung: Pfad /admin/rules)
- **Fier:** „Klick auf 'Bezeichnungsregeln' im Konfig-Hub."

### Step 2 — Was sind Bezeichnungsregeln?
- **Anker:** obst-konfig-rules-keywords-card
- **Modus:** spotlight
- **Fier:** „Bezeichnungsregeln sind **Text-Regeln**. Beispiel: 'Alles mit 'Bio' im Namen → nach vorne'. Hilfreich beim alphabetischen Sortieren — alle Bio-Produkte stehen zusammen."

### Step 3 — Beispielregel anlegen
- **Anker:** obst-konfig-rules-add-button
- **Modus:** interactive (Klick + Schlagwort + Position; Validierung: Regel in Liste)
- **Fier:** „Probier's: '+ Regel', Schlagwort 'Bio', Position 'B' (für vorne in der B-Ecke). Speichern."

### Step 4 — Anwenden auf Liste
- **Anker:** obst-konfig-rules-schlagwort-apply-all
- **Modus:** interactive
- **Fier:** „Klick 'Anwenden auf alle Produkte'. Jetzt landen alle Produkte mit 'Bio' bei B."

### Step 5 — Effekt in Liste sehen (kurzer Sprung)
- **Anker:** masterlist-rows
- **Modus:** spotlight
- **Fier:** „Geh kurz in die Liste — du siehst Bio-Produkte unter B sortiert."

### Step 6 — Wechsel zu Warengruppen
- **Anker:** admin-obst-hub-konfig
- **Modus:** interactive
- **Fier:** „Zurück zum Konfig-Hub, dann auf 'Warengruppen'."

### Step 7 — Was sind Warengruppen?
- **Anker:** obst-konfig-warengruppen-info-card
- **Modus:** spotlight
- **Fier:** „Warengruppen sind **strukturelle Gruppierungen**: Obst, Gemüse, Salate. Anders als Bezeichnungsregeln — die nur Sortierhilfe sind. Warengruppen wirken erst bei Sortierung 'Nach Warengruppen' im Layout."

### Step 8 — Warengruppe anlegen
- **Anker:** obst-konfig-warengruppen-create-dialog
- **Modus:** interactive (Klick + Name + speichern)
- **Fier:** „Leg eine Beispiel-Warengruppe an, z.B. 'Tropische Früchte'."

### Step 9 — Produkt zuweisen
- **Anker:** obst-konfig-warengruppen-pick-card
- **Modus:** interactive (Klick auf Warengruppe + Produkt zuweisen)
- **Fier:** „Klick auf 'Tropische Früchte', dann auf eine Banane in der rechten Spalte → 'Zuweisen'. Banane gehört jetzt zur Tropischen Früchte."

### Step 10 — Reihenfolge anpassen
- **Anker:** obst-konfig-warengruppen-group-list
- **Modus:** spotlight
- **Fier:** „Du kannst die Warengruppen per Drag-and-Drop umsortieren — die Reihenfolge in deiner Liste passt sich an."

### Step 11 — Verbindung Regeln ↔ Warengruppen
- **Anker:** obst-konfig-warengruppen-page
- **Modus:** spotlight
- **Fier:** „Bezeichnungsregeln und Warengruppen kombinieren sich: in einer Warengruppe wird per Bezeichnungsregel sortiert. Beispiel: Warengruppe 'Obst', darin nach Bio-Regel die Bios vorn."

---

## Tour D1 · Backshop-Liste verstehen + Glocke

**Rolle:** alle (User, Admin, Viewer)
**Voraussetzung:** A1 + Test-Modus aktiv
**Sequenz:** wenn B1 schon gemacht → Markierungs-/Glocken-Steps kürzer
**Steps:** 13 (oder 9 wenn B1 schon gemacht)

### Step 1 — Vom Dashboard
- **Anker:** dashboard-card-backshop
- **Modus:** interactive (Klick; Validierung: Pfad /backshop-list oder /backshop-hub)
- **Fier:** „Klick auf die Backshop-Karte."

### Step 2 — Hub (nur Admin)
- **Anker:** backshop-hub-page
- **Modus:** spotlight (nur wenn Admin)
- **Fier:** „Backshop-Hub: **Liste**, **Werbung**, **Marken-Auswahl**, **Konfiguration**. Wir gehen heute auf die Liste."

### Step 3 — Liste öffnen
- **Anker:** backshop-hub-list-card
- **Modus:** interactive
- **Fier:** „Klick auf 'PLU-Liste Backshop'."

### Step 4 — Listen-Aufbau
- **Anker:** backshop-master-table
- **Modus:** spotlight
- **Fier:** „Backshop-Liste: Bild, PLU, Name. Anders als Obst — keine Stück/Gewicht-Trennung."

### Step 5 — Markierungen (kürzer wenn B1 gemacht)
- **Anker:** backshop-master-table
- **Modus:** spotlight
- **Fier:** (wenn B1: „Gleich wie Obst — Rot/Gelb für PLU-Änderungen, Hell/Dunkel-Gelb für Werbungs-Arten") (wenn nicht: ausführlich erklären wie B1 Steps 5-7)

### Step 6 — Marken-Badge erklären
- **Anker:** backshop-master-source-badge
- **Modus:** spotlight
- **Fier:** „Backshop hat drei Quellen: **E** (Edeka), **H** (Harry), **A** (Aryzta). Manche Produkte gibt's von mehreren Marken — über die Marken-Auswahl entscheidest du, von wem du sie haben willst."

### Step 7 — Angebote-Konzept
- **Anker:** backshop-master-marken-hint
- **Modus:** spotlight
- **Fier:** „Angebote werden **automatisch hochgeladen**, meistens am Mittwoch der Vorwoche. Wenn KW 14 anliegt, sind die KW 14-Angebote ab Mittwoch der KW 13 verfügbar."

### Step 8 — Suche (wenn B1 gemacht: kürzer)
- **Anker:** backshop-master-find-trigger
- **Modus:** interactive (suchen 'Brot' z.B.)
- **Fier:** „Suche: such mal 'Brot' oder 'Brötchen'."

### Step 9 — Toolbar
- **Anker:** backshop-master-toolbar
- **Modus:** spotlight
- **Fier:** „Toolbar: **Eigene**, **Ausgeblendet**, **Werbung**, **Umbenannt**, **PDF**. Marken-Auswahl ist eine eigene Tour."

### Step 10 — Glocke öffnen
- **Anker:** unified-notification-bell
- **Modus:** interactive (Klick)
- **Fier:** „Glocke öffnen — analog Obst (wenn B1 gemacht: kürzer)."

### Step 11 — Tabs Neu/Geändert/Entfernt (Backshop-Quellen)
- **Anker:** backshop-notification-tab-new
- **Modus:** spotlight
- **Fier:** „Hier siehst du Änderungen je Quelle. Edeka-Brot neu? Harry-Brötchen entfernt? Alles sortiert nach E/H/A."

### Step 12 — Carryover
- **Anker:** backshop-notification-tab-removed
- **Modus:** spotlight
- **Fier:** „Genauso wie bei Obst: rausgefallene Produkte 1 Woche verlängern für Restbestand."

### Step 13 — Abschluss
- **Anker:** backshop-master-toolbar
- **Modus:** spotlight
- **Fier:** „Backshop-Liste-Tour fertig. Detail-Touren für jeden Toolbar-Knopf gibt's separat."

---

## Tour D2 · Eigene Backshop-Produkte: Test vs. Fest

**Rolle:** User, Admin
**Voraussetzung:** A1 + Test-Modus aktiv
**Steps:** 8

### Step 1 — Eigene-Produkte öffnen
- **Anker:** backshop-master-quick-custom (oder backshop-custom-page-Toolbar)
- **Modus:** interactive
- **Fier:** „Klick 'Eigene Produkte' in der Toolbar."

### Step 2 — Test vs. Fest erklären
- **Anker:** backshop-custom-list
- **Modus:** spotlight
- **Fier:** „Wichtig — zwei Sorten: **Test-Produkte** erscheinen nur auf dem **wöchentlichen Angebotszettel** (den du eh druckst). **Feste Produkte** erscheinen zusätzlich in der **großen Haupt-Liste** (die du seltener neu druckst). Empfehlung: erst Test, wenn's gut läuft → Fest."

### Step 3 — Anlegen-Knopf
- **Anker:** backshop-custom-add-button
- **Modus:** interactive
- **Fier:** „'+ Neues Produkt' klicken."

### Step 4 — Felder ausfüllen
- **Anker:** backshop-custom-add-dialog
- **Modus:** interactive (Beispiel füllen oder selbst, Test-Mode wählen)
- **Fier:** „PLU, Name, Bild (optional), und wichtig: **Test oder Fest** wählen. Heute machen wir 'Test'."

### Step 5 — Speichern
- **Anker:** backshop-custom-add-dialog-submit
- **Modus:** interactive
- **Fier:** „Speichern."

### Step 6 — In Liste sehen
- **Anker:** backshop-custom-list
- **Modus:** spotlight
- **Fier:** „Dein Produkt ist da, mit Test-Badge."

### Step 7 — Bearbeiten + auf Fest umstellen
- **Anker:** backshop-custom-edit-dialog
- **Modus:** interactive (Eintrag öffnen + Test→Fest)
- **Fier:** „Klick auf den Eintrag, ändere 'Test' auf 'Fest', speichern. Jetzt erscheint's auch in der großen Liste."

### Step 8 — Abschluss
- **Anker:** backshop-custom-list
- **Modus:** spotlight
- **Fier:** „Geschafft. Im Test-Modus wird das alles wieder verworfen."

---

## Tour D3 · Backshop ausblenden + umbenennen

**Rolle:** User, Admin
**Voraussetzung:** A1 + Test-Modus aktiv
**Steps:** 9 (analog B3)

Inhalt analog zu B3, Anker mit `backshop-` Prefix:
- backshop-hidden-page, backshop-hidden-add-button, backshop-hidden-list
- backshop-renamed-page, backshop-renamed-add-button, backshop-renamed-list
- Modi: interactive für Anlegen/Löschen, spotlight für Erklärung
- **Zusätzlich:** Erwähnung dass Backshop **Regel-basiertes Ausblenden** hat (siehe Tour E2 Gruppenregeln)

### Step 1 — Ausgeblendet öffnen → Step 9 analog B3
(Ich kürze hier, weil identische Logik. Voll ausgearbeitet wenn du Bestätigung gibst.)

---

## Tour D4 · Backshop Markenauswahl

**Rolle:** User, Admin
**Voraussetzung:** A1 + Test-Modus aktiv
**Steps:** 6

### Step 1 — Markenauswahl-Page
- **Anker:** backshop-marken-auswahl-page
- **Modus:** interactive (Vom Hub oder Toolbar)
- **Fier:** „Klick auf 'Marken-Auswahl' im Backshop-Hub."

### Step 2 — Was ist das?
- **Anker:** backshop-marken-auswahl-list
- **Modus:** spotlight
- **Fier:** „Im Backshop gibt's drei Quellen: Edeka, Harry, Aryzta. Manche Produkte (z.B. Vollkornbrot) gibt's von mehreren. Hier wählst du **deine bevorzugte Marke** pro Produkt."

### Step 3 — Bedienung: Kachel-Klick
- **Anker:** backshop-marken-auswahl-list
- **Modus:** spotlight
- **Fier:** „Pro Produkt-Gruppe siehst du Kacheln der verfügbaren Marken (E, H, A). Klick auf die gewünschte Marke."

### Step 4 — Marke wählen
- **Anker:** backshop-marken-auswahl-list
- **Modus:** interactive
- **Fier:** „Wähl bei einem Beispiel-Produkt eine Marke aus."

### Step 5 — Status-Übersicht
- **Anker:** backshop-marken-auswahl-status
- **Modus:** spotlight
- **Fier:** „Oben siehst du wie viele Produkte du noch nicht zugewiesen hast. Solang noch was offen ist, erscheinen Default-Marken in der Liste."

### Step 6 — Verbindung Gruppenregeln + Abschluss
- **Anker:** backshop-marken-auswahl-page
- **Modus:** spotlight
- **Fier:** „**Tipp:** Mit Gruppenregeln (Tour E2) kannst du Ausnahmen machen: z.B. 'Alles Brot von Harry, aber das Edeka-Brot trotzdem behalten.'"

---

## Tour D5 · Backshop Werbung & Bestellungen

**Rolle:** User, Admin
**Voraussetzung:** A1 + Test-Modus aktiv
**Steps:** 10

### Step 1 — Werbung-Page (KW-Liste)
- **Anker:** backshop-master-toolbar (Werbung-Knopf, oder backshop-werbung-routes)
- **Modus:** interactive
- **Fier:** „Klick 'Werbung' in der Backshop-Toolbar — du landest auf der KW-Übersicht."

### Step 2 — Werbung-Konzept
- **Anker:** backshop-werbung-routes (Liste der KWs)
- **Modus:** spotlight
- **Fier:** „**Werbung im Backshop = Bestellung**. Du trägst pro KW ein, welche Produkte du in welcher Menge bestellen willst, mit EK/VK und Auslieferungsdatum."

### Step 3 — KW öffnen
- **Anker:** backshop-werbung-routes (eine KW anklicken)
- **Modus:** interactive
- **Fier:** „Klick auf eine KW (z.B. die kommende)."

### Step 4 — Produkt hinzufügen
- **Anker:** backshop-offer-add-button
- **Modus:** interactive
- **Fier:** „'+ Produkt' klicken."

### Step 5 — Menge eintragen
- **Anker:** backshop-offer-add-dialog
- **Modus:** interactive
- **Fier:** „Wie viele Stück bestellst du? Trag z.B. 50 ein."

### Step 6 — EK + VK
- **Anker:** backshop-offer-add-dialog
- **Modus:** spotlight + interactive
- **Fier:** „**EK** = dein Einkaufspreis (was du zahlst). **VK** = Verkaufspreis (was der Kunde zahlt). Standard kommt aus dem System — kannst du anpassen."

### Step 7 — Auslieferungsdatum
- **Anker:** backshop-offer-add-dialog
- **Modus:** interactive
- **Fier:** „Ab wann ist das Produkt verfügbar? Wähl ein Datum."

### Step 8 — Speichern
- **Anker:** backshop-offer-add-dialog (submit)
- **Modus:** interactive
- **Fier:** „Speichern."

### Step 9 — Übersicht der KW-Bestellungen
- **Anker:** backshop-offer-page
- **Modus:** spotlight
- **Fier:** „Du siehst alle Bestellungen für diese KW. Wenn was falsch aussieht: Eintrag öffnen, anpassen. Falls der Name komisch ist: → Tour D3 Umbenennen."

### Step 10 — Abschluss
- **Anker:** backshop-offer-section-eigen
- **Modus:** spotlight
- **Fier:** „Tour fertig. Im Test-Modus alles ohne Folgen — übrigens, in echt sieht der Hauptsitz deine Bestellungen auch."

---

## Tour D6 · Backshop PDF-Export

**Rolle:** User, Admin
**Steps:** 4 (analog B5)

Inhalt analog B5 mit Backshop-Spezifika:
- Bilder im PDF erwähnen (Backshop hat Bild-Spalte)
- Anker: backshop-master-pdf-export

---

## Tour E1 · Backshop-Konfig: Hub, Layout, Bezeichnungsregeln (nur Admin)

**Rolle:** Admin
**Voraussetzung:** A1 + Test-Modus aktiv
**Sequenz:** wenn C1 schon gemacht → kürzer
**Steps:** 8

Inhalt parallel zu C1, mit Backshop-Spezifika:
- Anzeige-Modi: nur „Alle zusammen" oder „Nach Warengruppen" (keine Stück/Gewicht-Trennung)
- Anker: backshop-konfig-hub-page, backshop-konfig-layout-page, backshop-konfig-rules-page

---

## Tour E2 · Backshop-Konfig: Warengruppen + Sortierung + Gruppenregeln (nur Admin)

**Rolle:** Admin
**Voraussetzung:** A1 + Test-Modus aktiv
**Steps:** 12

### Step 1-5 — Warengruppen analog C2 Steps 7-10
(mit backshop-konfig-warengruppen-page Ankern)

### Step 6 — Wechsel zu Sortierung
- **Anker:** backshop-konfig-block-sort-page
- **Modus:** interactive
- **Fier:** „Klick auf 'Sortierung'."

### Step 7 — Reihenfolge per Drag
- **Anker:** backshop-konfig-block-sort-section
- **Modus:** interactive
- **Fier:** „Drag-and-Drop die Warengruppen in deine gewünschte Reihenfolge."

### Step 8 — Wechsel zu Gruppenregeln
- **Anker:** backshop-konfig-gruppenregeln-page
- **Modus:** interactive
- **Fier:** „Jetzt zu Gruppenregeln."

### Step 9 — Was sind Gruppenregeln?
- **Anker:** backshop-konfig-gruppenregeln-card
- **Modus:** spotlight
- **Fier:** „**Gruppenregeln** blenden Produkte einer ganzen Marke pro Warengruppe aus. Beispiel: 'Alle Edeka-Brote in Warengruppe Brot ausblenden' — alle auf einmal."

### Step 10 — Beispiel-Regel anlegen
- **Anker:** backshop-konfig-gruppenregeln-source-select
- **Modus:** interactive
- **Fier:** „Wähl eine Warengruppe + eine Quelle (z.B. Brot + Edeka), klick 'Anwenden'."

### Step 11 — Effekt sehen
- **Anker:** backshop-master-table
- **Modus:** spotlight (Sprung in die Liste)
- **Fier:** „Schau in die Hauptliste — die Edeka-Brote sind weg. Im 'Ausgeblendet'-Bereich siehst du sie unter 'Durch Regeln gefiltert'."

### Step 12 — Verbindung Markenauswahl ↔ Gruppenregeln
- **Anker:** backshop-konfig-gruppenregeln-marken-link
- **Modus:** spotlight
- **Fier:** „**Tipp:** Markenauswahl (D4) gibt deine **Default-Marke** vor. Gruppenregeln machen **Bulk-Ausnahmen**. Z.B. Default Harry, aber Gruppenregel 'Edeka-Brötchen wieder anzeigen'."

---

## Tour F1 · Benutzer verwalten (nur Admin)

**Rolle:** Admin
**Voraussetzung:** A1 + Test-Modus aktiv
**Steps:** 7

### Step 1 — UserManagement öffnen
- **Anker:** dashboard-card-users (oder Profil-Menü → Users)
- **Modus:** interactive
- **Fier:** „Klick auf die Benutzer-Karte."

### Step 2 — Übersicht
- **Anker:** user-management-list
- **Modus:** spotlight
- **Fier:** „Hier siehst du alle Benutzer deiner Firma. Du kannst neue anlegen, Rolle ändern, Passwort zurücksetzen, löschen."

### Step 3 — Neuen User anlegen
- **Anker:** user-management-new-user
- **Modus:** interactive
- **Fier:** „'+ Neuer Benutzer'."

### Step 4 — Felder + Rolle
- **Anker:** user-management-create-dialog
- **Modus:** interactive
- **Fier:** „Name, Personalnummer ODER E-Mail (eines reicht), Rolle. Speichern → Einmalpasswort wird angezeigt, das gibst du dem Mitarbeiter."

### Step 5 — Markt zuweisen
- **Anker:** user-management-row-edit (oder Markt-Knopf)
- **Modus:** interactive
- **Fier:** „Klick beim neuen User auf 'Märkte' → wähl welche Märkte er sieht."

### Step 6 — Bereiche-Sichtbarkeit
- **Anker:** user-management-row-edit (Bereiche-Knopf)
- **Modus:** spotlight
- **Fier:** „**Bereiche-Sichtbarkeit:** soll dieser User Obst sehen? Backshop? Beides? Hier einstellen pro User."

### Step 7 — Passwort zurücksetzen
- **Anker:** user-management-row-reset-pw
- **Modus:** spotlight
- **Fier:** „Bei 'Passwort vergessen': klick auf den Schlüssel-Knopf — neues Einmalpasswort, das gibst du dem User."

---

## Tour F2 · Kassenmodus & QR-Code (nur Admin)

**Rolle:** Admin
**Voraussetzung:** A1 + Test-Modus aktiv (Achtung: Kassenmodus-Anlage ist real, nicht testbar)
**Steps:** 7

### Step 1 — Kassenmodus öffnen
- **Anker:** dashboard-card-kiosk (oder Admin-Hub)
- **Modus:** interactive
- **Fier:** „Klick auf 'Kassenmodus' im Admin-Bereich."

### Step 2 — Was ist das?
- **Anker:** kassenmodus-qr (Page)
- **Modus:** spotlight
- **Fier:** „Kassenmodus = ein Tablet/Bildschirm an der Kasse, an dem das Personal die PLU-Liste lesen kann. Anmeldung über QR-Code + Kassen-Passwort."

### Step 3 — Erste Kasse anlegen
- **Anker:** kassenmodus-add-register
- **Modus:** interactive
- **Fier:** „'+ Kasse hinzufügen'. Wähl Nummer (z.B. Kasse 1), Passwort (mindestens **6 Zeichen**)."

### Step 4 — QR-Code zeigt sich
- **Anker:** kassenmodus-qr
- **Modus:** spotlight
- **Fier:** „Hier ist dein QR-Code. Den scannt das Personal, gibt das Passwort ein → ist drin."

### Step 5 — QR-Code drucken
- **Anker:** kassenmodus-qr (Drucken-Knopf)
- **Modus:** interactive
- **Fier:** „Klick 'Drucken' oder 'PDF speichern'. Druck den aus, kleb ihn an die Kasse."

### Step 6 — Vorschau testen
- **Anker:** kassenmodus-qr (Vorschau-Knopf)
- **Modus:** interactive
- **Fier:** „Vorschau: öffnet die Kassen-Anmeldung in neuem Tab. Geben dort dein Kassen-Passwort ein → du siehst die Kassen-Ansicht."

### Step 7 — Sicherheits-Hinweis
- **Anker:** kassenmodus-qr
- **Modus:** spotlight
- **Fier:** „**Wichtig:** Der QR läuft nach **6 Monaten ab**. Bei Leak (jemand fotografiert) klick 'Neuen Link erzeugen' — alter wird ungültig, alles weg."

---

## Tour G1 · Abschluss

**Rolle:** alle
**Voraussetzung:** mind. eine andere Tour abgeschlossen
**Steps:** 3

### Step 1 — Lob
- **Anker:** dashboard-welcome
- **Modus:** spotlight
- **Fier:** „Top — du hast die Basics gelernt! Du kennst jetzt deine Liste, weißt was die Markierungen bedeuten und wie du eigene Sachen anlegst."

### Step 2 — Wiederholen
- **Anker:** header-tutorial-icon
- **Modus:** spotlight
- **Fier:** „Wenn du was vergisst oder eine andere Tour machen willst — der Tutorial-Knopf oben ist dein Anlaufpunkt. Da kannst du jede Tour einzeln wiederholen."

### Step 3 — Hilfe
- **Anker:** profile-menu
- **Modus:** spotlight
- **Fier:** „Im Profil-Menü findest du auch 'Einführung wiederholen' — falls du den Knopf oben mal nicht findest. Bis bald! 👋"

---

## Mini-Tour T-Multi-Markt (conditional, nur wenn User mehrere Märkte hat)

**Rolle:** alle (User, Admin, Viewer) **wenn** `useStores().data.length > 1`
**Steps:** 3

### Step 1 — Markt-Switcher
- **Anker:** header-store-switcher
- **Modus:** spotlight
- **Fier:** „Du hast mehrere Märkte. Oben im Header siehst du den **Markt-Switcher** — der zeigt dir wo du gerade bist."

### Step 2 — Wechseln
- **Anker:** header-store-switcher
- **Modus:** interactive (Klick + anderer Markt wählen)
- **Fier:** „Klick drauf, wähl einen anderen Markt aus."

### Step 3 — Liste zeigt anderen Markt
- **Anker:** masterlist-context-line
- **Modus:** spotlight
- **Fier:** „Die ganze App schaltet jetzt um — du siehst die Liste, Werbung, Benutzer **dieses Markts**. Beim Zurückwechseln sieht der erste Markt wieder genauso aus wie vorher."

---

# 🏁 Schritt 1 abgeschlossen

Alle 13 Touren + 1 Conditional-Tour ausgearbeitet. Bitte durchlesen und Feedback pro Tour geben:
- ✅ passt
- ✏️ anders: was?
- ❌ Tour weg
- ➕ Step fehlt

Sobald Feedback durch, weiter mit:
- **Schritt 2:** Welcome-Modal-Mockup mit vereintem Tutorial-Knopf + Tour-Auswahl-UX
- **Schritt 3:** Architektur (Step-Schema, Orchestrator parallel)
- **Schritt 4:** Tour für Tour bauen
