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
11. **Tab „Neu":** Produkte die diese KW neu sind (gelblich-oranger Streifen vorn, passt zur gelben PLU). „Ausblenden"-Knopf pro Eintrag → Toast „Produkt ausgeblendet"/„Produkt wieder eingeblendet"
12. **Tab „Geändert":** Produkte mit neuer PLU (rötlich-oranger Streifen vorn, passt zur roten PLU). Sub-Text **„Ehemals PLU {nummer}"** unter dem Namen
13. **Tab „Raus" + Carryover (interaktiv):** rausgefallene Produkte mit Pill „Rausgefallen". **Zwei Buttons pro Eintrag:**
    - **„Eine KW in Liste"** (sekundär) — Produkt einmalig übernehmen für Restbestand. Nach Klick erscheint Audit-Trail-Sub-Text „Markt: wieder in Liste · zuletzt {User}, {Datum}"
    - **„Nicht übernehmen"** (primär blau) — bestätigt das Rauswerfen
14. Pro Sektion „Gelesen"-Knopf, Footer-Knopf „Alles als gelesen markieren"
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

### B4 · Obst-Werbung anlegen + ändern ⚙️ (~9-11 Steps, interaktiv)
**Rolle:** User, Admin

1. „Werbung"-Button (interaktiv)
2. **Zwei Sektionen:** „Zentrale Werbung (KW XX/YYYY)" (vom Hauptsitz) und „Eigene Werbung" (vom Markt selbst)
3. **Stift pro Zeile = „Eigener Aktionspreis":** Dialog mit Untertitel „Nur für diesen Markt. Der zentrale Vorgabepreis bleibt zur Orientierung sichtbar." Read-only Zentral-Referenz + Number-Input „Eigener Verkaufspreis (€)". Toast: **„Eigener Aktionspreis gespeichert"**
4. **Megafon pro Zeile** (interaktiv) — Dialog **„Zentrale Werbung":** „Diese Aktion kommt von der Zentrale. Du kannst sie für deinen Markt abschalten oder die Zeile komplett aus deiner Liste entfernen." **Drei Optionen:**
   - **„Nur normale Zeile (ohne Werbung)"** (blau) → Megafon aus, Zeile bleibt in Liste durchgestrichen ausgegraut. Toast: „Werbung aus, Produkt bleibt in der Liste"
   - **„Aus Liste und PDF entfernen"** (rot, destruktiv) — Zeile komplett raus
   - **„Abbrechen"**
5. **Bananen-Beispiel:** Zentrale Kampagne „Bananen 1,99 €" → Megafon-Klick → „Nur normale Zeile" → Bananen ohne Werbungs-Hinweis aber noch in Liste. Wenn ganz weg: zusätzlich ausblenden (siehe B3)
6. **Eigene Werbung anlegen:** „Produkte zur Werbung hinzufügen"-Knopf (interaktiv) — großer Dialog mit Suche + 2-spaltige Tabelle
7. Klick auf Megafon eines Produkts → Detail-Dialog: Artikel-Card + **„Aktionspreis (€), optional"** (Placeholder „Leer = nur Werbung ohne…") + **„Laufzeit:"** Dropdown 1/2/3/4 Wochen
8. **Submit-Buttons:** „Zur Aktion hinzufügen (ab dieser KW)" (blau) ODER „Abrechnungsperiode (4 Wochen)" (sekundär)
9. Speichern → Eintrag in „Eigene Werbung"
10. **Markierungen erinnern:** dunkleres Gelb auf Namen = Wochen-Werbung, helleres Gelb = 3-Tages-Werbung
11. Werbung wieder ändern: Stift-Icon → Aktionspreis-Dialog erneut öffnen

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
2. **Für Admin:** Hub-Page mit DREI Karten (anders als Obst!):
   - **PLU-Liste** → Backshop-Masterliste
   - **Konfiguration der Liste** → Layout/Bezeichnungsregeln/Warengruppen/Gruppenregeln (4 Sub-Karten)
   - **Backshop** (Sub-Hub) → Werbung + Backshop-Liste (Kachel-PDF)
3. „PLU-Liste" öffnen (interaktiv)
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

### D2 · Eigene Backshop-Produkte: Test vs. Fest 🆕 (~7-8 Steps, interaktiv)
**Rolle:** User, Admin
**Wichtig:** **Bild ist PFLICHT** — ohne Bild bleibt „Hinzufügen" disabled (live verifiziert)!

1. „+ Eigene Produkte"-Button (interaktiv)
2. „+ Eigenes Produkt hinzufügen" → Dialog
3. **Test vs. Fest — der Unterschied (Dropdown „Angebots-PDF"):**
   - **„Test (unter 'Neue Produkte' auf Angebots-PDF)"** (Default) — erscheint nur auf wöchentlichem Angebots-Zettel. Hinweis im Dialog: „'Test': zusätzlich auf dem PDF 'Nur Angebote'. Beim Export der vollen Liste kannst du alle Test-Artikel auf einmal übernehmen."
   - **„Sofort fest in der Hauptliste"** — direkt in PLU-/Backshop-Liste
4. **Empfehlung:** erst „Test" → wenn bewährt, auf „Fest" umstellen
5. **Pflichtfelder ausfüllen:** PLU (4–5 Ziffern) + Artikelname + **Bild** (über „Bild wählen" oder „Foto aufnehmen" — Webcam, gut für Tablets im Markt) + Warengruppe (Dropdown oder „Neue Warengruppe erstellen"-Link für Inline-Anlage)
6. **Ohne Bild:** „Hinzufügen" bleibt disabled — bestätigt durch Live-Test
7. Speichern → in Liste sehen
8. Bearbeiten via Stift → Test/Fest-Dropdown ändern, neue Position prüfen

### D3 · Backshop ausblenden + umbenennen 🆕 (~8-10 Steps, interaktiv)
**Rolle:** User, Admin
**Hinweis:** Backshop-Hidden-Page ist anders als Obst — sie hat **zwei Tabs**!

**Ausblenden-Block:**
1. „Ausgeblendete"-Button (interaktiv) → `/admin/backshop-hidden-products`
2. **Header:** Auge-Schrägstrich-Icon + Help-Icon + Lupe + „Produkte ausblenden"-Knopf
3. **Tab „Manuell ausgeblendet"** + Counter: Quellen-Filter-Pills (Alle/E Edeka/H Harry/A Aryzta/O Eigene), Card-Grid pro Warengruppe → Detail-Tabelle mit blauem Einblenden-Knopf
4. **Tab „Durch Regel gefiltert"** + Counter: zeigt Produkte die durch Gruppenregeln (E2) oder Markenauswahl (D4) ausgeblendet sind. Pro Zeile: Knopf **„Marken wählen"** (führt zur Marken-Auswahl mit Pre-Selection) + Einblenden-Knopf
5. „Produkte ausblenden"-Klick → `/admin/pick-hide-backshop` — wie Obst aber **mit Bildern und Quellen-Pills (E/H/A)** pro Zeile. **Wichtig:** Counter zählt PLU, nicht Marken-Varianten — eine PLU bei Edeka+Harry markiert beide automatisch

**Umbenennen-Block (Backshop hat Bild-Override!):**
6. „Umbenennen"-Button → Renamed-Liste mit 3-Spalten (Bild | PLU | ORIGINAL | AKTUELL | Aktion)
7. Stift-Dialog **„Produkt umbenennen":** Feld „Neuer Name" + **Bild-Sektion** mit Thumbnail + Buttons „Bild ersetzen" / „Bild entfernen" — NEU gegenüber Obst!
8. Speichern → Toast „Produktname geändert"
9. Zurücksetzen-Bestätigung Backshop: „Der Anzeigename wird wieder auf '{Original-Name}' gesetzt. **Das Bild bleibt unverändert.**" (Backshop-Extra-Hinweis)

### D4 · Backshop Markenauswahl 🆕 (~5-6 Steps, interaktiv)
**Rolle:** User, Admin

1. Markenauswahl-Page öffnen (interaktiv)
2. **Was ist Markenauswahl?** Im Backshop gibt's drei Quellen (Edeka, Harry, Aryzta), die teilweise **dasselbe Produkt** anbieten. Du wählst, von welcher Marke du die PLU haben willst
3. **Bedienung:** Auf die gewünschte Marken-Kachel klicken (Kachel-Auswahl, kein Swipe)
4. Marken aktivieren/deaktivieren (interaktiv)
5. Effekt in der Liste sehen (Marken-Badge E/H/A)
6. **Verbindung zu Gruppenregeln (E2):** „Wenn du sagst 'alles Brot von Harry', kannst du via Gruppenregeln einzelne Edeka-Brote trotzdem behalten"

### D5 · Backshop Werbung & Bestellungen ⚙️ (~10-12 Steps, interaktiv)
**Rolle:** User, Admin
**Wichtig:** Backshop-Werbung ist anders als Obst — hier bestellst du tatsächlich Mengen pro Tag mit EK/VK!

1. **Vom Hub:** „Backshop" → Sub-Hub mit zwei Karten („Werbung" + „Backshop-Liste"). Klick „Werbung" (interaktiv)
2. **KW-Liste-Übersicht** (`/admin/backshop-werbung`) — drei Sektionen:
   - **Aktuelle Woche** (1 Card mit Pill „Aktuelle Woche")
   - **Kommende Kalenderwochen** (3 Cards mit „Auslieferung ab DD.MM.YYYY")
   - **Frühere Werbe-Kalenderwochen (letzte 3)** — klappbares Akkordeon
3. KW-Card anklicken (interaktiv) → KW-Detail-Page
4. **Bestelltabelle** — pro Werbe-Produkt eine Zeile mit Spalten: **Bild | PLU | Artikel | + (manuell hinzu) | LISTE EK / LISTE VK | AKTION EK / AKTION VK | Mo–Sa | Code**
5. **Mo–Sa = SECHS separate Number-Inputs** (Mo, Di, Mi, Do, Fr, Sa) — du trägst pro Tag ein wieviele Stück du bestellst
6. **Beispiel:** Bei „Wurzelbrot dunkel" (PLU 88550) Mo-Feld auf 20 setzen — wird **automatisch gespeichert** (kein Save-Klick nötig)
7. **EK = Einkaufspreis** (was du zahlst), **VK = Verkaufspreis** (was Kunde zahlt). Standard kommt aus Excel-Upload, kannst lokal anpassen
8. **„Code"-Spalte = Strichcode-Symbol** → Dialog mit großem Barcode (CODE128/EAN-Style) und GTIN-Nummer (z. B. „Aus Artikelnummer / GTIN 7388329"). Hilft beim Etiketten-Druck
9. Wenn Produkt-Daten falsch aussehen → Wechsel zu „Umbenannt" (Tour D3)
10. **„PDF exportieren"-Knopf** rechts oben → druckbare Bestelltabelle (Knopf wird zu „PDF wird erstellt…", Toast nach ~3s „PDF wurde erstellt.")
11. Auslieferungs-Countdown auf KW-Cards: „Noch X Tag(e) · Auslieferung ab DD.MM.YYYY"
12. Abschluss: „Tour fertig — die Bestelltabelle ist deine wichtigste Backshop-Werbe-Sicht"

### D6 · Backshop PDF-Export (Werbung) 🆕 (~3-4 Steps)
**Rolle:** User, Admin
**Inhalt:** PDF aus der Werbungs-Bestelltabelle (siehe D5). Sortierung default „Nach Warengruppe", Sub für „Nur Angebote": „Angebotszeilen und ggf. neue Produkte (Test), A–Z, eigener Titel."

### D7 · Backshop-Liste (Kachel-PDF) 🆕 (~5-6 Steps) ⭐ NEU — war übersehen
**Rolle:** User, Admin (Viewer hat Lese-Sicht)
**Konzept:** Druckbare Kachel-Übersicht aller Backshop-Produkte mit Bildern + Strichcodes — Service für tägliche Markt-Nutzung an der Auslage. **Werbe-Artikel sind hier NICHT enthalten**, das ist eine separate Bestelltabelle (D5).

1. **Vom Hub:** „Backshop" → Sub-Hub → Karte „Backshop-Liste" (interaktiv) → `/admin/backshop-kacheln`
2. **Tab-Navigation oben** beschreiben: **Werbung | Backshop-Liste (aktiv) | PLU-Liste | Konfiguration** — vier Tabs zur Schnellnavigation
3. **Kachel-Grid pro Warengruppe:** Sektion-Header in Großbuchstaben (z. B. „BROT"), 6 Kacheln pro Reihe (Desktop). Pro Kachel: **Bild oben + PLU mittig + ARTIKEL-Name + STRICHCODE als gerenderter Barcode unten**
4. „Stand: {Datum} {Zeit} · {Markt} · Liste KW{aktuell}/{Jahr}" — Hinweis dass es **ohne Werbungs-Artikel** ist (das ist gewollt — Werbe-Produkte sind in D5)
5. **„PDF erzeugen"-Knopf rechts oben** (interaktiv) — direkter Klick (kein Optionen-Dialog!). Knopf wird zu **„PDF wird erstellt…"** mit Refresh-Spinner, nach ~3s Toast **„PDF wurde erstellt."** + Auto-Download
6. Abschluss: „Diese Kachel-Liste hilft dir schnell die richtige PLU zu finden, ohne Original-Excel durchzusuchen. Strichcode-Sicht ist auch nützlich beim Etiketten-Druck."

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

**14 Touren** (v6 nach Browser-Agent-Walkthrough — D7 Kachel-PDF ergänzt):
- 1 Onboarding (alle)
- 5 Obst (B1 Liste+Glocke, B2 Eigene, B3 Ausblenden+Umbenennen, B4 Werbung+Megafon, B5 PDF)
- 2 Obst-Konfig (Admin)
- 7 Backshop (D1 Liste+Glocke, D2 Eigene Test/Fest, D3 Ausblenden+Umbenennen, D4 Markenauswahl, D5 Werbung+Bestellungen Mo-Sa, D6 PDF Werbung, **D7 Kachel-PDF** ⭐ NEU)
- 2 Backshop-Konfig (Admin)
- 2 Verwaltung (Admin)
- 1 Abschluss

Geschätzt **~125-145 Steps** (heute: 172).

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


---

# 📜 DETAILLIERTE TOUR-SKRIPTE (v6 nach Browser-Agent-Walkthrough 2026-05-04)

Pro Step: **Anker** · **Modus** · **Fier-Text** mit echten App-Texten. Modus: `spotlight` (Lesen + Weiter), `interactive` (Klick erforderlich), `wait-for-action` (App-Veränderung erwarten).

Toast-Texte sind **echt aus dem Live-Test** zitiert (siehe `docs/tutorial-app-walkthrough.md`).

---

## A1 · Erste Schritte
**Rolle:** alle | **Voraussetzung:** keine | **Steps:** 9

1. **Begrüßung** · `dashboard-welcome` · spotlight
   *Fier:* „Hi! Ich bin Fier, dein Reiseführer durch Fier Hub. Ich zeig dir Schritt für Schritt was du wo findest. Klick mit mir auf 'Weiter' wenn du soweit bist."

2. **Dashboard-Karten** · `dashboard-card-obst` · spotlight
   *Fier:* „Das hier ist dein Dashboard mit vier Karten: Obst & Gemüse, Backshop, Benutzer, Kassenmodus. Welche du siehst hängt von deinen Rechten ab."

3. **Header-Glocke** · `unified-notification-bell` · spotlight
   *Fier:* „Oben rechts die Glocke zeigt was sich an deinen Listen geändert hat — neue Produkte, geänderte PLUs, rausgefallene Artikel. Mehr in der Liste-Tour."

4. **Tutorial-Knopf** · `header-tutorial-icon` · spotlight
   *Fier:* „Hier findest du mich wieder — der Tutorial-Knopf. Wenn du eine Tour wiederholen oder eine neue starten willst, klick einfach drauf."

5. **Profil-Menü öffnen** · `profile-menu` · interactive (Validierung: data-state="open")
   *Fier:* „Klick mal auf dein Profilbild oben rechts. Da findest du Logout, Admin-Bereich und vor allem 'Testmodus starten'."

6. **Testmodus erklären** · `header-testmode-menu-item` · spotlight
   *Fier:* „Wichtig: 'Testmodus starten' macht alle deine Aktionen vorübergehend. Beim Beenden wird alles verworfen. Genau das brauchen wir für die Touren — du kannst gefahrlos klicken."

7. **Testmodus aktivieren** · `header-testmode-menu-item` · interactive (Validierung: gelber Rahmen sichtbar)
   *Fier:* „Klick jetzt drauf 👆 Du siehst gleich einen gelben Rahmen — das ist dein Sicherheitsnetz. Toast bestätigt: 'Testmodus aktiviert – Änderungen werden nicht gespeichert.'"

8. **Testmodus-Floating-Knopf** · `testmode-exit-button` · spotlight
   *Fier:* „Unten rechts gibt's jetzt den 'Testmodus beenden'-Knopf. Den brauchen wir später wenn wir fertig sind."

9. **Tour-Auswahl** · `header-tutorial-icon` · wait-for-action
   *Fier:* „Top — du bist startklar! Was möchtest du als nächstes lernen? Hier sind die Touren die zu dir passen."

---

## B1 · Obst-Liste verstehen + Glocke
**Rolle:** alle | **Voraussetzung:** A1 + Testmodus | **Steps:** 15 (Viewer: ~10)

**Liste-Block:**

1. **Vom Dashboard** · `dashboard-card-obst` · interactive (Validierung: Pfad /masterlist oder /admin/obst)
   *Fier:* „Klick auf die Obst-Karte."

2. **Hub (nur Admin)** · `admin-obst-hub-page` · spotlight
   *Fier:* „Als Admin landest du auf einer Übersicht: 'PLU-Liste' (was deine Mitarbeiter sehen) und 'Konfiguration' (Layout/Regeln). Heute zeigen wir die Liste."

3. **Liste öffnen** (nur Admin) · `admin-obst-hub-liste` · interactive
   *Fier:* „Klick auf 'PLU-Liste'."

4. **Listen-Aufbau** · `masterlist-rows` · spotlight
   *Fier:* „Hier ist deine PLU-Liste — Desktop zwei Spalten, Mobile eine. Buchstaben-Trenner '— A —' für die Sortierung. Je nach Layout siehst du Stück und Gewicht getrennt oder gemischt."

5. **Markierung Rot** · `masterlist-rows` · spotlight
   *Fier:* „Rote PLU = die Nummer hat sich geändert (gleiches Produkt, neue PLU). Wenn du Etiketten gedruckt hast, musst du die wahrscheinlich erneuern."

6. **Markierung Gelb (PLU)** · `masterlist-rows` · spotlight
   *Fier:* „Gelbe PLU = neues Produkt diese Woche. Wenn du was verkaufen willst was du noch nicht kennst, hier suchst du."

7. **Markierung Werbung (Name)** · `masterlist-rows` · spotlight
   *Fier:* „Helleres Gelb auf dem Namen = 3-Tages-Werbung. Dunkleres Gelb = Wochen-Werbung oder Exit-Aktion. Hilft beim Anschreiben der Schilder."

8. **Suche mit Bananen** · `masterlist-search` · interactive (Validierung: Suche aktiv mit Treffern)
   *Fier:* „Such mal nach Bananen. Klick auf die Lupe oben, tipp 'Banane' und Enter. Du siehst nur noch Bananen-Produkte."

9. **Suche schließen** · `masterlist-search` · interactive
   *Fier:* „Schließ die Suche wieder mit X — alle Produkte sind wieder da."

10. **Kontextzeile** · `masterlist-context-line` · spotlight
    *Fier:* „Oben siehst du Sortierung ('Alphabetisch'), Anzeige-Modus ('Nach Typ getrennt'), Liste-KW + Aktiv-Pill. Diese Statusanzeigen sind nicht klickbar — sie zeigen, was in der Konfiguration eingestellt ist."

11. **Toolbar-Buttons** · `masterlist-toolbar-actions` · spotlight
    *Fier:* „Oben rechts hast du die Toolbar: Eigene Produkte, Ausgeblendete, Werbung, Umbenennen, PDF. Für jeden Knopf gibt's eine eigene Tour."

**Glocke-Block (Abschluss):**

12. **Glocke öffnen** · `unified-notification-bell` · interactive (Validierung: Modal offen)
    *Fier:* „Bevor wir die Liste verlassen, zeig ich dir die Glocke. Klick mal drauf."

13. **Tabs Neu/Geändert** · `unified-notification-bell` · spotlight
    *Fier:* „Tab 'Neu': Produkte mit gelber PLU. Tab 'Geändert': Produkte mit neuer PLU — Sub-Text zeigt 'Ehemals PLU {nummer}'."

14. **Tab „Raus" (Carryover)** · `unified-notification-bell` · spotlight
    *Fier:* „Tab 'Raus' zeigt rausgefallene Produkte. Pro Eintrag zwei Knöpfe: 'Eine KW in Liste' (sekundär) übernimmt das Produkt einmalig für Restbestand. 'Nicht übernehmen' (blau, primär) bestätigt das Rauswerfen."

15. **Abschluss** · `masterlist-toolbar-actions` · spotlight
    *Fier:* „Tour fertig 🎉. Eigene Touren für jede Toolbar-Aktion findest du im Tutorial-Knopf oben."

---

## B2 · Eigene Obst-Produkte
**Rolle:** User, Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 9

1. **Toolbar-Button** · `masterlist-toolbar-eigene-produkte` · interactive
   *Fier:* „In dieser Tour zeige ich dir, wie du eigene Produkte anlegst — Sachen die nicht aus der zentralen PLU-Liste kommen. Klick auf 'Eigene Produkte' oben."

2. **Eigene-Produkte-Page** · `obst-custom-list` · spotlight
   *Fier:* „Hier landen alle Produkte die du selbst angelegt hast. Tabelle mit PLU, Name, Typ, Preis und Aktions-Icons rechts: Stift, Auge-Schrägstrich, Mülltonne."

3. **Anlegen-Knopf** · `obst-custom-add-button` · interactive (Validierung: Dialog offen)
   *Fier:* „Klick '+ Eigenes Produkt hinzufügen'."

4. **PLU oder Preis** · `obst-custom-add-dialog` · spotlight
   *Fier:* „Wichtig: Du hast zwei Möglichkeiten — entweder eine PLU (4–5 Ziffern, z.B. 7123) ODER einen Preis (z.B. 1,50 €). Nicht beides! Bei PLU wiegt der Kunde an der Kasse, bei Festpreis nimmt er das Produkt einfach mit."

5. **Felder ausfüllen** · `obst-custom-add-dialog` · interactive (Validierung: Felder gefüllt)
   *Fier:* „Probier's: PLU 98765, Name 'Mein Test-Apfel', Typ 'Stück'. Validierung: Wenn die PLU schon existiert, wird das Feld rot mit 'PLU 98765 existiert bereits' und Hinzufügen disabled."

6. **Speichern** · `obst-custom-add-dialog-submit` · interactive (Validierung: Toast)
   *Fier:* „Klick 'Hinzufügen'. Toast erscheint: 'Eigenes Produkt hinzugefügt'."

7. **In Liste sehen** · `obst-custom-list` · spotlight
   *Fier:* „Dein neuer Eintrag erscheint in der Tabelle mit Pill 'Von mir erstellt'. Auch in der Hauptliste ist er jetzt mit gelber PLU markiert (zeitlich begrenzt)."

8. **Bearbeiten** · `obst-custom-edit-dialog` · spotlight
   *Fier:* „Stift-Icon öffnet Edit-Dialog: PLU bleibt read-only ('PLU kann nicht geändert werden'), Name/Typ/Preis sind editierbar."

9. **Abschluss** · `obst-custom-list` · spotlight
   *Fier:* „Im Testmodus wird das beim Beenden wieder verworfen — echte Produkte bleiben natürlich erhalten. Wenn du den Namen ändern willst, gibt's eine eigene Umbenennen-Tour."

---

## B3 · Obst-Produkte ausblenden + umbenennen
**Rolle:** User, Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 11

**Ausblenden:**

1. **Ausgeblendete-Page öffnen** · `masterlist-toolbar-ausgeblendete` · interactive
   *Fier:* „Klick 'Ausgeblendete' in der Toolbar."

2. **Empty-State erklären** · `obst-hidden-list` · spotlight
   *Fier:* „Hier landen Produkte die du aus deiner Liste rausnimmst. Sie sind nicht gelöscht — du kannst sie jederzeit wieder einblenden."

3. **Picker öffnen** · `obst-hidden-add-button` · interactive (Validierung: Pfad /pick-hide-obst)
   *Fier:* „Klick 'Produkte ausblenden' oben rechts."

4. **Picker-Auswahl** · `obst-hidden-add-dialog` · interactive (Validierung: mind. 1 Checkbox)
   *Fier:* „Auf der nächsten Seite siehst du eine Liste aller verfügbaren Produkte mit Buchstaben-Trennern und Sektion '=== STÜCK ==='. Klick die Checkbox bei einem Beispiel-Produkt an."

5. **Submit Picker** · `obst-hidden-add-dialog-submit` · interactive (Validierung: Toast)
   *Fier:* „Sticky-Footer unten zeigt 'X Produkte ausblenden' — Klick. Toast: 'X Produkte ausgeblendet' + Redirect zur Hidden-Liste."

6. **Wieder einblenden** · `obst-hidden-list` · interactive (Validierung: Eintrag weg)
   *Fier:* „Pro Zeile: blauer 'Einblenden'-Knopf. Klick — Toast 'Produkt wieder eingeblendet', Zeile verschwindet."

**Umbenennen:**

7. **Umbenennen öffnen** · `masterlist-toolbar-umbenennen` · interactive
   *Fier:* „Zurück zur Liste, dann 'Umbenennen' in der Toolbar."

8. **Renamed-Tabelle erklären** · `obst-renamed-list` · spotlight
   *Fier:* „3-Spalten-Tabelle: PLU, Original, Aktuell, Zurücksetzen-Knopf. Hier siehst du alle Umbenennungen für deinen Markt — die zentrale Master-Liste bleibt unverändert."

9. **Pick-Rename öffnen** · `obst-renamed-add-button` · interactive
   *Fier:* „Klick 'Produkte umbenennen' für die Auswahl-Page."

10. **Umbenennen-Dialog** · `obst-renamed-rename-dialog-submit` · interactive (Validierung: Toast „Produktname geändert")
    *Fier:* „Klick auf einen Eintrag — Dialog mit PLU + 'Original: {Name}' + Feld 'Neuer Name'. Tipp einen neuen Namen ein, speichern. Toast: 'Produktname geändert'."

11. **Zurücksetzen** · `obst-renamed-reset-confirm` · spotlight
    *Fier:* „Falls du zurück willst: 'Zurücksetzen'-Knopf in der Renamed-Liste. Bestätigung: 'Der Anzeigename wird wieder auf {Original} gesetzt.' Eintrag verschwindet."

---

## B4 · Obst-Werbung anlegen + ändern
**Rolle:** User, Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 11

1. **Werbung öffnen** · `masterlist-toolbar-werbung` · interactive
   *Fier:* „Klick 'Werbung' in der Toolbar."

2. **Zwei Sektionen erklären** · `obst-offer-section-zentral` · spotlight
   *Fier:* „Werbung gibt's in zwei Sorten: 'Zentrale Werbung' kommt vom Hauptsitz für alle Märkte. 'Eigene Werbung' machst du selbst. Beide werden in der Liste mit gelbem Namen markiert."

3. **Aktionspreis-Stift erklären** · `obst-offer-section-zentral` · spotlight
   *Fier:* „Bei zentraler Werbung: Stift-Icon öffnet 'Eigener Aktionspreis'-Dialog. Untertitel: 'Nur für diesen Markt. Der zentrale Vorgabepreis bleibt zur Orientierung sichtbar.' Du gibst einen eigenen VK ein, Toast: 'Eigener Aktionspreis gespeichert.'"

4. **Megafon erklären (Bananen-Beispiel)** · `obst-offer-section-zentral` · spotlight
   *Fier:* „Beispiel: Hauptsitz macht Aktion 'Bananen 1,99 €'. In deinem Markt willst du das nicht bewerben. Klick aufs Megafon-Icon."

5. **Megafon-Dialog 3 Optionen** · `obst-offer-section-zentral` · spotlight
   *Fier:* „Dialog 'Zentrale Werbung': Drei Optionen — 'Nur normale Zeile (ohne Werbung)' (blau, Werbung weg, Produkt bleibt durchgestrichen ausgegraut, Toast 'Werbung aus, Produkt bleibt in der Liste'). 'Aus Liste und PDF entfernen' (rot, komplett raus). 'Abbrechen'."

6. **Eigene Werbung anlegen** · `obst-offer-add-button` · interactive (Validierung: Dialog offen)
   *Fier:* „Jetzt legen wir eigene Werbung an. Klick '+ Produkte zur Werbung hinzufügen'."

7. **Produkt suchen + Megafon** · `obst-offer-add-dialog` · interactive
   *Fier:* „Großer Dialog mit Suche + 2-spaltige Tabelle. Such ein Produkt (z.B. 'Apfel'), klick auf das Megafon der Zeile."

8. **Detail-Dialog Aktionspreis + Laufzeit** · `obst-offer-add-dialog` · interactive
   *Fier:* „Detail-Dialog: 'Aktionspreis (€), optional' (leer = nur Werbung ohne Preis-Override) + 'Laufzeit:' Dropdown 1/2/3/4 Wochen."

9. **Speichern** · `obst-offer-add-dialog-submit` · interactive (Validierung: Eintrag in Liste)
   *Fier:* „Zwei Submit-Buttons: 'Zur Aktion hinzufügen (ab dieser KW)' (blau) ODER 'Abrechnungsperiode (4 Wochen)'. Nach Klick: Eintrag erscheint in 'Eigene Werbung'."

10. **Markierungs-Effekt** · `obst-offer-section-eigen` · spotlight
    *Fier:* „In der Hauptliste siehst du das Produkt jetzt mit dunklerem Gelb auf dem Namen — Wochen-Werbung. Helleres Gelb wäre 3-Tages-Werbung gewesen."

11. **Abschluss** · `obst-offer-toolbar` · spotlight
    *Fier:* „Tour fertig! Wenn du bestehende Werbung ändern willst: Stift-Icon in der Liste."

---

## B5 · Obst PDF-Export
**Rolle:** User, Admin (Viewer hat eigene Lese-Variante) | **Voraussetzung:** A1 | **Steps:** 5

1. **PDF-Knopf** · `masterlist-toolbar-pdf` · interactive (Validierung: Dialog offen)
   *Fier:* „Klick 'PDF' in der Toolbar."

2. **KW-Auswahl + Inhalt** · `masterlist-toolbar-pdf` · spotlight
   *Fier:* „Dialog 'PDF exportieren': Dropdown 'Kalenderwoche für PDF' (Default aktive KW). Inhalt: Radio-Karten 'Volle Liste' oder 'Nur Angebote'."

3. **Sub-Optionen volle Liste** · `masterlist-toolbar-pdf` · spotlight
   *Fier:* „Bei 'Volle Liste': Sub-Toggle 'Mit Angeboten' (default) oder 'Ohne Angebots-Hinweise'. So entscheidest du ob die Werbungs-Markierungen mit ins PDF kommen."

4. **Vorschau-Card** · `masterlist-toolbar-pdf` · spotlight
   *Fier:* „Vorschau zeigt Counter ('KW19/2026 — 181 Artikel') + Pills für Statistik ('5 Neue', '3 PLU geändert', '1 Eigene'). S/W-tauglich: gestrichelter Rahmen = neu, fetter Rahmen = PLU geändert."

5. **Download** · `masterlist-toolbar-pdf` · interactive
   *Fier:* „Drei Buttons unten: 'Abbrechen' / 'Drucken' / 'PDF herunterladen' (blau). Toast nach Erstellung: 'PDF wurde erstellt.'"


---

## C1 · Obst-Konfiguration: Layout
**Rolle:** Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 9

1. **Konfig öffnen** · `admin-obst-hub-konfig` · interactive
   *Fier:* „Vom Obst-Hub aus klick auf 'Konfiguration'."

2. **Konfig-Hub** · `obst-konfig-hub-page` · spotlight
   *Fier:* „Drei Karten: Layout, Bezeichnungsregeln, Warengruppen. Heute Layout."

3. **Layout-Page** · `obst-konfig-hub-layout-card` · interactive
   *Fier:* „Klick auf die Layout-Karte."

4. **Anzeige-Modus** · `obst-konfig-layout-display-mode-card` · spotlight
   *Fier:* „'Alle zusammen': Stück und Gewicht in einer Liste gemischt. 'Stück + Gewicht getrennt': zwei separate Bereiche. Wähle was zu deinem Markt passt."

5. **Sortierung** · `obst-konfig-layout-sort-mode-card` · spotlight
   *Fier:* „'Alphabetisch (A–Z)': Buchstaben-Header. 'Nach Warengruppen': Gruppen-Header und aktiviert die Warengruppen-Workbench."

6. **Markierungsdauer** · `obst-konfig-layout-mark-duration-card` · interactive
   *Fier:* „Wie lange bleiben rote und gelbe Markierungen sichtbar? Standard: Rot 1 KW, Gelb 1 KW. Bis 4 KW möglich."

7. **Schriftgrößen + Vorschau** · `obst-konfig-layout-fonts-card` · spotlight
   *Fier:* „Drei Felder bei Zeilenweise: Listen-Header (28), Spaltenköpfe (16), Produktzeilen (18). Live-Vorschau rechts zeigt das Ergebnis sofort."

8. **Features-Toggles** · `obst-konfig-layout-features-card` · spotlight
   *Fier:* „Drei Toggles: 'Eigene Produkte' (User dürfen anlegen), 'Produkte ausblenden', 'Warengruppen' (aktiviert die Workbench)."

9. **Auto-Save** · `obst-konfig-layout-save-status` · spotlight
   *Fier:* „Alles speichert automatisch — kein Speichern-Knopf. Status oben rechts: Loader während speichern, Checkmark wenn fertig. Tour fertig!"

---

## C2 · Obst-Konfiguration: Bezeichnungsregeln + Warengruppen
**Rolle:** Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 12

**Bezeichnungsregeln:**

1. **Regeln-Page** · `obst-konfig-hub-rules-card` · interactive
   *Fier:* „Vom Konfig-Hub: 'Bezeichnungsregeln'."

2. **Konzept** · `obst-konfig-rules-keywords-card` · spotlight
   *Fier:* „Bezeichnungsregeln sind Text-Regeln zum alphabetischen Sortieren. Beispiel: 'Bio' immer vorne, oder 'GG' immer hinten. Hat NICHTS mit Warengruppen zu tun!"

3. **Schlagwort anlegen** · `obst-konfig-rules-add-button` · interactive
   *Fier:* „Klick '+ Regel'. Dialog 'Schlagwort-Manager' öffnet sich."

4. **Eingabe + Position** · `obst-konfig-rules-schlagwort-input` · interactive
   *Fier:* „Tipp 'Bio' ein. Position: 'Vorne anzeigen' (default). Live-Vorschau zeigt: 'X Produkte enthalten Bio · Y davon werden geändert' mit Vorher → Nachher Liste."

5. **Hinzufügen + Anwenden** · `obst-konfig-rules-schlagwort-submit` · interactive
   *Fier:* „Klick '+ Hinzufügen'. Toast: 'Regel hinzugefügt'. Dann unten 'Alle Regeln anwenden' (blau). Toast: 'Namensdarstellung ist für diesen Markt in der Liste aktiv (keine zentrale Master-Speicherung).' — markt-lokal, Master bleibt unverändert."

**Warengruppen:**

6. **Wechsel zu Warengruppen** · `admin-obst-hub-konfig` · interactive
   *Fier:* „Zurück zum Konfig-Hub, dann auf 'Warengruppen'."

7. **Konzept** · `obst-konfig-warengruppen-info-card` · spotlight
   *Fier:* „Warengruppen sind STRUKTURELLE Gruppierungen — 'Obst', 'Gemüse', 'Kräuter'. Anders als Bezeichnungsregeln. Wirken nur bei Sortierung 'Nach Warengruppen' im Layout."

8. **Hinweis-Banner** · `obst-konfig-warengruppen-layout-hint` · spotlight
   *Fier:* „Falls Sortierung noch auf 'Alphabetisch' steht: Hinweis-Banner oben mit Direkt-Link zu Layout."

9. **Warengruppe anlegen** · `obst-konfig-warengruppen-create-dialog` · interactive
   *Fier:* „'+ Neu' oder Plus-Knopf in der linken Sidebar. Dialog mit Namens-Feld. Beispiel: 'Tropische Früchte'. Toast: 'Warengruppe erstellt'."

10. **Produkt zuweisen** · `obst-konfig-warengruppen-products-assign-button` · interactive
    *Fier:* „Mittel-Spalte: Such 'Mango'. Checkbox bei einem Treffer. Rechte Spalte: Knopf 'Auswahl → Tropische Früchte zuweisen' (blau im Sticky-Footer)."

11. **Reihenfolge** · `obst-konfig-warengruppen-group-list` · spotlight
    *Fier:* „Per Drag-and-Drop am 6-Punkt-Griff verschiebst du Warengruppen. Die Reihenfolge persistiert sofort."

12. **Verbindung erklären** · `obst-konfig-warengruppen-page` · spotlight
    *Fier:* „Bezeichnungsregeln + Warengruppen kombinieren sich: in einer Warengruppe wird per Bezeichnungsregel sortiert. Tour fertig!"

---

## D1 · Backshop-Liste verstehen + Glocke
**Rolle:** alle | **Voraussetzung:** A1 + Testmodus | **Steps:** 14 (sequenz-abhängig kürzer wenn B1 schon gemacht)

1. **Vom Dashboard** · `dashboard-card-backshop` · interactive
   *Fier:* „Klick auf die Backshop-Karte."

2. **Hub mit DREI Karten** · `backshop-hub-page` · spotlight
   *Fier:* „Backshop-Hub hat drei Karten (anders als Obst!): 'PLU-Liste', 'Konfiguration der Liste' (4 Sub-Karten), und 'Backshop' (Sub-Hub mit Werbung + Backshop-Liste)."

3. **PLU-Liste öffnen** · `backshop-hub-list-card` · interactive
   *Fier:* „Klick auf 'PLU-Liste Backshop'."

4. **Listen-Aufbau** · `backshop-master-table` · spotlight
   *Fier:* „Spalten: Bild (Thumbnail) | PLU | Name. Anders als Obst — keine Stück/Gewicht-Trennung."

5. **Markierungen** · `backshop-master-table` · spotlight
   *Fier:* (wenn B1 gemacht: „Wie bei Obst — Rot/Gelb auf PLU, Hell/Dunkel-Gelb auf Namen für Werbung.") (wenn nicht: ausführlich erklären wie B1 Steps 5-7)

6. **Marken-Badge E/H/A** · `backshop-master-source-badge` · spotlight
   *Fier:* „Backshop hat drei Quellen: E (Edeka, blau), H (Harry, orange), A (Aryzta, rot/violett). Manche Produkte gibt's von mehreren Marken — über die Marken-Auswahl entscheidest du, von wem du sie haben willst."

7. **Zeitraum-Zeile + Werbe-KW-Wahl** · `backshop-master-toolbar` · spotlight
   *Fier:* „Zeitraum 'KW 17 – KW 19 · 2026' — die zweite KW ist ein Dropdown! Wenn Werbung für spätere Wochen existiert, kannst du die anzeigen lassen (nur vorwärts). Plus 'Archiv'-Pill für ältere KWen."

8. **Suche** · `backshop-master-find-trigger` · interactive
   *Fier:* „Such mal 'Brot' oder 'Brötchen'."

9. **Toolbar 6 Aktionen** · `backshop-master-toolbar` · spotlight
   *Fier:* „Toolbar Zeile 2 hat sechs Aktionen: Eigene Produkte, Ausgeblendete, Werbung, Marken-Auswahl, Umbenennen, PDF. Für jeden Knopf gibt's eine eigene Tour."

**Glocke-Block:**

10. **Glocke öffnen** · `unified-notification-bell` · interactive
    *Fier:* „Glocke öffnen — analog Obst (wenn B1 gemacht: kürzer)."

11. **Tabs für Backshop-Quellen** · `backshop-notification-tab-new` · spotlight
    *Fier:* „Hier siehst du Änderungen je Quelle. Edeka-Brot neu? Harry-Brötchen entfernt? Alles mit E/H/A-Badge sortiert."

12. **Tab „Raus" Carryover** · `backshop-notification-tab-removed` · spotlight
    *Fier:* „Genauso wie bei Obst: 'Eine KW in Liste' (sekundär, einmaliges Übernehmen) oder 'Nicht übernehmen' (blau, primär)."

13. **„Alle als gelesen"** · `backshop-notification-mark-all-read` · spotlight
    *Fier:* „Footer-Knopf 'Alles als gelesen markieren' (für beide Bereiche, falls sichtbar)."

14. **Abschluss** · `backshop-master-toolbar` · spotlight
    *Fier:* „Backshop-Liste-Tour fertig. Detail-Touren für jeden Toolbar-Knopf gibt's separat."

---

## D2 · Eigene Backshop-Produkte: Test vs. Fest
**Rolle:** User, Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 8

1. **Eigene-Produkte öffnen** · `backshop-master-quick-custom` · interactive
   *Fier:* „Klick 'Eigene Produkte' in der Backshop-Toolbar."

2. **Empty-State** · `backshop-custom-page` · spotlight
   *Fier:* „'Noch keine eigenen Backshop-Produkte. Füge eines hinzu (mit Bild).' — wichtig: Bild ist Pflicht!"

3. **Anlegen-Dialog** · `backshop-custom-add-button` · interactive
   *Fier:* „Klick '+ Eigenes Produkt hinzufügen'."

4. **Test vs. Fest erklären** · `backshop-custom-add-dialog` · spotlight
   *Fier:* „Wichtig — Dropdown 'Angebots-PDF' mit zwei Optionen: 'Test (unter Neue Produkte auf Angebots-PDF)' (Default, sparen Papier weil Angebots-Zettel eh wöchentlich gedruckt wird). ODER 'Sofort fest in der Hauptliste' (auch im großen PDF). Empfehlung: erst Test, wenn bewährt → Fest."

5. **Bild-Pflicht** · `backshop-custom-add-dialog` · spotlight
   *Fier:* „Wichtig: BILD IST PFLICHT! Zwei Buttons: 'Bild wählen' (Datei-Picker) oder 'Foto aufnehmen' (Webcam — gut für Tablets im Markt). Ohne Bild bleibt 'Hinzufügen' disabled."

6. **Felder + Warengruppe** · `backshop-custom-add-dialog` · interactive
   *Fier:* „Pflichtfelder: PLU (4-5 Ziffern) + Name. Warengruppe per Dropdown. Cooler Trick: Link 'Neue Warengruppe erstellen' verwandelt das Dropdown in Inline-Anlage — kein separater Dialog!"

7. **Speichern** · `backshop-custom-add-dialog-submit` · interactive (Validierung: Eintrag in Liste)
   *Fier:* „Klick 'Hinzufügen'. Eintrag erscheint in der Tabelle."

8. **Edit Test → Fest** · `backshop-custom-edit-dialog` · spotlight
   *Fier:* „Wenn sich's bewährt: Stift-Icon → Edit-Dialog → Dropdown 'Sofort fest in der Hauptliste' wählen. Jetzt erscheint's auch in der großen PLU-Liste."

---

## D3 · Backshop ausblenden + umbenennen
**Rolle:** User, Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 11

**Ausblenden (mit zwei Tabs!):**

1. **Hidden-Page öffnen** · `backshop-master-quick-hidden` · interactive
   *Fier:* „Klick 'Ausgeblendete' in der Toolbar."

2. **Header beschreiben** · `backshop-hidden-page` · spotlight
   *Fier:* „Backshop-Hidden ist anders als Obst! Header mit Auge-Schrägstrich-Icon + Help-Icon + Lupe + 'Produkte ausblenden'-Knopf."

3. **Tab „Manuell"** · `backshop-hidden-mode-manual` · spotlight
   *Fier:* „Tab 'Manuell ausgeblendet' + Counter. Quellen-Filter-Pills oben: 'Alle X / E Edeka X / H Harry X / A Aryzta X / O Eigene X'."

4. **Card-Grid pro Warengruppe** · `backshop-hidden-list` · spotlight
   *Fier:* „Sektion 'Warengruppen': Card-Grid mit Counter-Pill, Bild, Layer-Icon. Klick auf Card → Detail-Tabelle (PLU, Artikel, Marke, Warengruppe, Ausgeblendet von, Einblenden-Knopf)."

5. **Tab „Durch Regel gefiltert"** · `backshop-hidden-mode-rule` · spotlight
   *Fier:* „Tab 'Durch Regel gefiltert' + Counter — Produkte die durch Gruppenregeln (E2) oder Markenauswahl (D4) ausgeblendet sind. Pro Zeile zusätzlich: Knopf 'Marken wählen' führt zur Marken-Auswahl mit Pre-Selection."

6. **Picker mit Bildern + E/H/A** · `backshop-hidden-add-button` · interactive
   *Fier:* „Klick 'Produkte ausblenden' oben rechts → Picker mit Bildern und Quellen-Pills (E/H/A) pro Zeile. Sektion-Header '=== BROT ==='. Wichtig: Counter zählt PLU, nicht Marken-Varianten — eine PLU bei E+H markiert beide automatisch!"

7. **Submit** · `backshop-hidden-add-dialog-submit` · interactive (Validierung: Toast)
   *Fier:* „Sticky-Footer: 'X Produkte ausblenden'. Toast: 'X Produkte ausgeblendet'."

**Umbenennen (mit Bild-Override!):**

8. **Umbenennen öffnen** · `backshop-master-toolbar` · interactive
   *Fier:* „Zurück zur Liste, 'Umbenennen' in der Toolbar."

9. **Renamed-Tabelle** · `backshop-renamed-list` · spotlight
   *Fier:* „4-Spalten-Tabelle: Bild | PLU | Original | Aktuell + Zurücksetzen-Knopf. Backshop hat zusätzlich Bild-Spalte!"

10. **Stift mit Bild-Sektion** · `backshop-renamed-add-dialog` · interactive
    *Fier:* „Stift-Dialog: Feld 'Neuer Name' + BILD-SEKTION mit Thumbnail + 'Bild ersetzen' (öffnet Datei-Picker) / 'Bild entfernen' (Mülltonne). NEU gegenüber Obst!"

11. **Zurücksetzen-Bestätigung** · `backshop-renamed-list` · spotlight
    *Fier:* „Zurücksetzen-Bestätigung Backshop: 'Der Anzeigename wird wieder auf {Original} gesetzt. Das Bild bleibt unverändert.' — Backshop-Extra-Hinweis!"


---

## D4 · Backshop Markenauswahl
**Rolle:** User, Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 9

1. **Marken-Auswahl öffnen** · `backshop-master-toolbar` · interactive (Validierung: Pfad /marken-auswahl)
   *Fier:* „Klick 'Marken-Auswahl' in der Backshop-Toolbar."

2. **Konzept** · `backshop-marken-auswahl-page` · spotlight
   *Fier:* „Im Backshop gibt's drei Quellen (E/H/A) die teilweise dasselbe Produkt anbieten — z.B. Vollkornbrot von Edeka UND Harry. Hier wählst du, von welcher Marke du es haben willst."

3. **Sidebar mit Status-Filtern** · `backshop-marken-auswahl-sidebar` · spotlight
   *Fier:* „Linke Sidebar: Suche oben + Status-Filter-Pills 'Alle / Offen / Teilweise / Alle bestätigt'. Pro Master-Eintrag: Counter wie '0/1' oder '1/2' + Status-Pill. Aktiver Master blau."

4. **Status-Banner** · `backshop-marken-auswahl-status` · spotlight
   *Fier:* „Oben im Detail-View ein Banner mit vier möglichen Zuständen: hellblau 'Keine Auswahl – alle Marken bleiben sichtbar' (Initial). Gelb 'Exklusiv-Modus: nur diese Marke bleibt'. Hellblau 'X von Y gewählt'. Grün 'Alle Marken bestätigt – auditierbar gespeichert'."

5. **Bedienung erklären** · `backshop-marken-auswahl-list` · spotlight
   *Fier:* „WICHTIG: Kachel-System, kein Tinder-Swipe! Einfachklick = Mehrfachauswahl + Auto-Sprung zum nächsten Master. Doppelklick oder Shift+Enter = Exklusiv-Modus (nur diese Marke)."

6. **Marke wählen** · `backshop-marken-auswahl-list` · interactive
   *Fier:* „Klick auf eine Marken-Kachel. Aktive Card bekommt blauen Rand + Häkchen oben rechts. Wenn du eine Marke wählst, springt der Counter im Status-Filter automatisch (z.B. 'Offen 19 → 18')."

7. **Auswirkung-Tabelle** · `backshop-marken-auswahl-preview` · spotlight
   *Fier:* „Unten 'AUSWIRKUNG AUF DIE MASTERLISTE': Tabelle pro Marken-Variante mit Sichtbarkeits-Pill — 'sichtbar' (grün), 'sichtbar (ohne Wahl)' (gelblich, Initial), 'ausgeblendet' (grau, durch andere Wahl gefiltert)."

8. **Weiter-Button** · `backshop-marken-auswahl-page` · interactive
   *Fier:* „Footer: 'Zurück' / 'Weiter' (blau). 'Weiter' springt zum nächsten offenen oder teilweisen Master in der Sidebar."

9. **Verbindung Gruppenregeln** · `backshop-marken-auswahl-page` · spotlight
   *Fier:* „Tipp: Mit Gruppenregeln (Tour E2) machst du Bulk-Wahlen auf Warengruppen-Ebene. Markenauswahl hier ist die Feinabstimmung pro Master-Produkt."

---

## D5 · Backshop Werbung & Bestellungen
**Rolle:** User, Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 12

1. **Vom Hub: Sub-Hub** · `backshop-hub-werbung-card` · interactive
   *Fier:* „Vom Backshop-Hub aus: Sub-Hub 'Backshop' (Karte). Im Sub-Hub: zwei Karten 'Werbung' und 'Backshop-Liste'. Klick 'Werbung'."

2. **KW-Liste-Übersicht** · `backshop-werbung-routes` · spotlight
   *Fier:* „Untertitel: 'Kalenderwoche wählen – Artikel, Preise und Strichcode aus der zentralen Werbung für diesen Markt.' Drei Sektionen: Aktuelle Woche, Kommende KWen (3 Cards), Frühere (Akkordeon)."

3. **KW-Card öffnen** · `backshop-werbung-routes` · interactive (Validierung: KW-Detail offen)
   *Fier:* „Card-Click → KW-Detail. Auslieferungs-Countdown: 'Noch X Tag(e) · Auslieferung ab DD.MM.YYYY'."

4. **Bestelltabelle erklären** · `backshop-offer-page` · spotlight
   *Fier:* „Pro Werbe-Produkt eine Zeile mit: Bild | PLU | Artikel | + (manuell hinzufügen) | LISTE EK / LISTE VK | AKTION EK / AKTION VK | Mo–Sa | Code."

5. **Mo-Sa SECHS Inputs** · `backshop-offer-page` · interactive
   *Fier:* „'Mo–Sa' ist SECHS separate Number-Inputs (Mo, Di, Mi, Do, Fr, Sa) — du trägst pro Tag ein wieviele Stück du bestellst. Beispiel: bei Wurzelbrot dunkel Mo-Feld auf 20 setzen."

6. **Auto-Save** · `backshop-offer-page` · spotlight
   *Fier:* „Eingabe wird automatisch gespeichert — kein Speichern-Klick nötig. Sobald du das Feld verlässt, ist es persistiert."

7. **EK + VK** · `backshop-offer-page` · spotlight
   *Fier:* „EK = dein Einkaufspreis (was du zahlst). VK = Verkaufspreis (was Kunde zahlt). Standard kommt aus Excel-Upload, du kannst lokal anpassen."

8. **Strichcode-Symbol** · `backshop-offer-page` · interactive
   *Fier:* „'Code'-Spalte = Strichcode-Symbol. Klick öffnet Dialog mit großem Barcode (CODE128/EAN-Style) und Nummer — z.B. 'Wurzelbrot dunkel / PLU 88550 / Werbung KW19/2026 / GTIN 7388329'. Hilft beim Etiketten-Druck."

9. **PDF-Export** · `backshop-offer-page` · interactive
   *Fier:* „Rechts oben: 'PDF exportieren'-Knopf für die druckbare Bestelltabelle."

10. **Falsche Daten** · `backshop-offer-page` · spotlight
    *Fier:* „Wenn ein Produkt-Name komisch aussieht: → Tour D3 'Umbenennen', dort kannst du markt-spezifisch korrigieren."

11. **Verbindung zum Sub-Hub** · `backshop-hub-werbung-card` · spotlight
    *Fier:* „Sub-Hub hat noch 'Backshop-Liste' — eine Kachel-Übersicht ohne Werbe-Artikel für die tägliche Markt-Nutzung. Tour D7."

12. **Abschluss** · `backshop-offer-toolbar` · spotlight
    *Fier:* „Tour fertig. Bestelltabelle ist deine wichtigste Backshop-Werbe-Sicht."

---

## D6 · Backshop PDF-Export (Werbung)
**Rolle:** User, Admin | **Voraussetzung:** A1 | **Steps:** 4

1. **PDF-Knopf** · `backshop-master-pdf-export` · interactive (Validierung: Dialog offen)
   *Fier:* „Klick 'PDF' in der Backshop-Toolbar."

2. **Optionen Backshop-spezifisch** · `backshop-master-pdf-export` · spotlight
   *Fier:* „'Volle Liste' oder 'Nur Angebote'. Bei 'Nur Angebote': 'Angebotszeilen und ggf. neue Produkte (Test), A–Z, eigener Titel.' Sortierung default 'Nach Warengruppe'. Spalten 'Bild | PLU | Name'."

3. **Vorschau** · `backshop-master-pdf-export` · spotlight
   *Fier:* „Vorschau zeigt Counter und Layout. Bilder kommen mit ins PDF (Backshop hat Bild-Spalte)."

4. **Download** · `backshop-master-pdf-export` · interactive
   *Fier:* „'PDF herunterladen' (blau). Toast nach Erstellung: 'PDF wurde erstellt.'"

---

## D7 · Backshop-Liste (Kachel-PDF) ⭐ war übersehen
**Rolle:** User, Admin (Viewer hat Lese-Sicht) | **Voraussetzung:** A1 | **Steps:** 6

1. **Vom Sub-Hub** · `backshop-hub-list-card` · interactive (Validierung: Pfad /backshop-kacheln)
   *Fier:* „Vom Backshop-Hub: Sub-Hub 'Backshop' → 'Backshop-Liste'-Karte (Quadrat-Raster). Das öffnet die Kachel-Übersicht."

2. **Tab-Navigation oben** · `backshop-master-page` · spotlight
   *Fier:* „Vier Tabs zur Schnellnavigation: Werbung | Backshop-Liste (aktiv) | PLU-Liste | Konfiguration."

3. **Kachel-Grid** · `backshop-master-table` · spotlight
   *Fier:* „Sektion-Header in Großbuchstaben pro Warengruppe (z.B. 'BROT'). Pro Kachel: Bild oben + PLU mittig + Artikel-Name + STRICHCODE als gerenderter Barcode unten. Desktop 6 pro Reihe."

4. **Untertitel verstehen** · `backshop-master-page` · spotlight
   *Fier:* „'Stand: {Datum} {Zeit} · {Markt} · Liste KW{aktuell}/{Jahr}'. Wichtig: 'Übersicht ohne Werbungs-Artikel' — Werbe-Produkte sind in der Werbungs-Tour (D5), das hier ist die Standard-Sortimentssicht."

5. **PDF erzeugen** · `backshop-master-pdf-export` · interactive (Validierung: Toast)
   *Fier:* „Rechts oben: 'PDF erzeugen'-Knopf — direkter Klick (kein Optionen-Dialog wie bei PLU-Liste-PDF). Knopf wird zu 'PDF wird erstellt…' mit Refresh-Spinner. Nach ~3 Sekunden Toast: 'PDF wurde erstellt.' + Auto-Download."

6. **Wofür nutzen** · `backshop-master-page` · spotlight
   *Fier:* „Diese Kachel-Liste hilft dir schnell die richtige PLU zu finden, ohne Original-Excel durchzusuchen. Strichcode-Sicht ist auch nützlich beim Etiketten-Druck. Tour fertig!"

---

## E1 · Backshop-Konfig: Layout + Bezeichnungsregeln
**Rolle:** Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 9 (sequenz-abhängig kürzer wenn C1/C2 schon gemacht)

1. **Konfig öffnen** · `backshop-hub-konfig-card` · interactive
   *Fier:* „Vom Backshop-Hub: 'Konfiguration der Liste'."

2. **4 Sub-Karten** · `backshop-konfig-hub-page` · spotlight
   *Fier:* „Backshop-Konfig hat VIER Karten (Obst hatte drei): Layout, Bezeichnungsregeln, Warengruppen sortieren, Gruppenregeln. Heute Layout + Regeln."

3. **Layout** · `backshop-konfig-hub-layout-card` · interactive
   *Fier:* „Klick auf Layout-Karte."

4. **Anzeige (Backshop-spezifisch)** · `backshop-konfig-layout-display-mode-card` · spotlight
   *Fier:* „Anzeige nur 'Alle zusammen (alphabetisch)' oder 'Nach Warengruppen (alphabetisch)' — keine Stück/Gewicht-Trennung wie bei Obst."

5. **PDF-Seitenumbruch** · `backshop-konfig-layout-pdf-page-break` · spotlight
   *Fier:* „NEU bei Backshop: Toggle 'Vorschau: eine Seite pro Warengruppe'. PDF bricht platzsparend um — neue Seite nur wenn nächste Warengruppe komplett nicht mehr passt."

6. **Default-Schriftgrößen anders** · `backshop-konfig-layout-fonts-card` · spotlight
   *Fier:* „Backshop hat größere Default-Schriften: 32/24/18 (Obst war 28/16/18). Du kannst's anpassen."

7. **Markierungsdauer** · `backshop-konfig-layout-mark-duration-card` · spotlight
   *Fier:* „Backshop-Default: Rot 2 KW, Gelb 2 KW (Obst war 1/1). Anpassbar."

**Bezeichnungsregeln:**

8. **Wechsel zu Regeln** · `backshop-konfig-hub-rules-card` · interactive
   *Fier:* „Zurück zum Konfig-Hub, dann auf 'Bezeichnungsregeln'."

9. **Regel-Konzept (sequenz-abhängig)** · `backshop-konfig-rules-keywords-card` · spotlight
   *Fier:* (wenn C2 gemacht: „Wie bei Obst — Schlagwort + Position. Placeholder hier: 'Bio' oder 'Vollkorn'.") (wenn nicht: ausführlich erklären analog C2)

---

## E2 · Backshop-Konfig: Warengruppen + Sortierung + Gruppenregeln
**Rolle:** Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 13

**Workbench:**

1. **Warengruppen öffnen** · `backshop-konfig-hub-block-sort-card` · interactive
   *Fier:* „Konfig-Hub → 'Warengruppen sortieren'."

2. **3-Spalten-Workbench** · `backshop-konfig-block-sort-section` · spotlight
   *Fier:* „Drei Spalten: Links Warengruppen mit Counter (z.B. 'Brot 53'), Mitte Artikel-Karten mit Bildern, Rechts Status-Card mit 'OHNE ZUORDNUNG / MARKT-OVERRIDES / ARTIKEL GESAMT / ZULETZT GEÄNDERT'."

3. **Neue Warengruppe** · `backshop-konfig-warengruppen-create-dialog` · interactive
   *Fier:* „Linke Spalte: '+ Neu'-Knopf. Dialog 'Neue Warengruppe (Backshop)' mit Name-Feld. Toast: 'Warengruppe erstellt'."

4. **Mehrfachauswahl + Zuweisen** · `backshop-konfig-warengruppen-products-assign-button` · interactive
   *Fier:* „Mittlere Spalte: 'Mehrfachauswahl'-Knopf aktiviert Checkboxen + 'Alle auswählen'-Knopf. Wähl 2-3 Artikel, dann Sticky-Footer 'Auswahl → {Gruppe} zuweisen' (blau)."

5. **Drag-and-Drop** · `backshop-konfig-warengruppen-products-list` · spotlight
   *Fier:* „Pro Karte: 6-Punkt-Drag-Handle unten rechts. Drag eines Artikels auf andere Gruppe in der Sidebar = Markt-Override."

6. **Warengruppe löschen** · `backshop-konfig-warengruppen-delete-confirm` · spotlight
   *Fier:* „Aktive Gruppe → Mülltonnen-Icon → Bestätigung 'Test-Gruppe wirklich löschen? Produkte verlieren nur die Zuordnung.' Toast: 'Warengruppe gelöscht'."

**Gruppenregeln:**

7. **Gruppenregeln öffnen** · `backshop-konfig-hub-gruppenregeln-card` · interactive
   *Fier:* „Zurück zum Konfig-Hub, dann auf 'Gruppenregeln'."

8. **Konzept** · `backshop-konfig-gruppenregeln-card` · spotlight
   *Fier:* „Pro Warengruppe eine bevorzugte Marke wählen. Untertitel: 'Nicht bevorzugte Master-Marken werden in der Listenansicht ausgeblendet; Angebote der aktuellen Kalenderwoche und eigene Produkte bleiben sichtbar. Fein anpassen kannst du unter Marken-Auswahl.'"

9. **Tabelle erklären** · `backshop-konfig-gruppenregeln-table` · spotlight
   *Fier:* „Pro Warengruppe eine Zeile mit Dropdown 'Bevorzugte Marke'. Wenn gesetzt: zusätzlicher Knopf 'Erneut anwenden'."

10. **Marke wählen** · `backshop-konfig-gruppenregeln-source-select` · interactive
    *Fier:* „Beispiel: Warengruppe 'Brot' → Dropdown 'Harry'. Toast: 'Regel auf 10 Gruppe(n) angewendet.' (10 = Brot-Untergruppen in der Sortiments-Hierarchie). Wechsel der Marke löst direkt die Anwendung aus."

11. **Effekt prüfen** · `backshop-master-table` · spotlight
    *Fier:* „Wechsel kurz zur Backshop-Liste — du siehst dass nicht-Harry-Brote jetzt unter 'Durch Regel gefiltert' (Tour D3) gelistet sind."

12. **Erneut anwenden** · `backshop-konfig-gruppenregeln-reapply-button` · spotlight
    *Fier:* „Falls neue Produkte hochgeladen werden: 'Erneut anwenden' aktualisiert die Filterung."

13. **Verbindung Markenauswahl** · `backshop-konfig-gruppenregeln-marken-link` · spotlight
    *Fier:* „Tipp: Markenauswahl (D4) ist Feinabstimmung pro Master-Produkt. Gruppenregeln machen Bulk-Defaults pro Warengruppe. Beispiel: Default Harry, aber Edeka-Brötchen pro Master ausnehmen."


---

## F1 · Benutzer verwalten
**Rolle:** Admin | **Voraussetzung:** A1 + Testmodus | **Steps:** 9

1. **UserManagement öffnen** · `dashboard-card-users` · interactive
   *Fier:* „Vom Dashboard auf 'Benutzer'-Karte."

2. **Tabelle erklären** · `user-management-list` · spotlight
   *Fier:* „Tabelle 'Alle Benutzer (X)' mit Spalten: Name, Personalnr., E-Mail, Rolle, Märkte, Aktionen. Pro Zeile vier Knöpfe: Märkte, Bereiche (Auge), Passwort (Schlüssel), Löschen (rot)."

3. **Neuer Benutzer** · `user-management-new-user` · interactive
   *Fier:* „Klick '+ Neuer Benutzer' (blau, oben rechts)."

4. **Felder + Rolle** · `user-management-create-dialog` · interactive
   *Fier:* „Untertitel: 'Der Benutzer erhält ein Einmalpasswort und muss beim ersten Login ein eigenes Passwort vergeben.' Felder: Name (Pflicht), Personalnummer 7-stellig ODER E-Mail (mind. eines), Rolle Dropdown 'User (Personal)' (default) / Admin / Viewer (nur Liste + PDF). Hinweis: 'Der Benutzer wird dem Markt {Test} zugewiesen.'"

5. **Erstellen + Einmalpasswort** · `user-management-create-submit` · interactive (Validierung: Einmalpasswort-Dialog)
   *Fier:* „Klick 'Benutzer erstellen' (disabled bis Pflichtfelder gefüllt). Spinner 'Wird erstellt…'. Nach ~2s: Einmalpasswort-Dialog mit großem Mono-Passwort + Kopier-Icon. Hinweis: 'Dieses Passwort wird nur einmal angezeigt. Bitte notieren oder kopieren.'"

6. **Märkte zuweisen** · `user-management-row-edit` · interactive
   *Fier:* „Bei einer User-Zeile: 'Märkte'-Knopf. Dialog mit Untertitel 'Märkte zuweisen oder entfernen. Änderungen werden sofort gespeichert.' (Auto-Save, kein Save-Knopf!) Markt-Cards mit Checkbox + Name + Slug."

7. **Bereiche-Sichtbarkeit** · `user-management-row-edit` · interactive
   *Fier:* „'Bereiche'-Knopf (Auge): zwei Toggles 'Obst und Gemüse' + 'Backshop'. Auch hier Auto-Save. Untertitel: 'Welche Listen soll dieser Benutzer sehen?'"

8. **Passwort zurücksetzen** · `user-management-row-reset-pw` · interactive
   *Fier:* „Schlüssel-Icon: Bestätigungs-Dialog 'Passwort zurücksetzen?' Buttons: Abbrechen / 'Passwort zurücksetzen' (blau). Neues Einmalpasswort wird angezeigt."

9. **Löschen + Card „Kassen & QR"** · `user-management-page` · spotlight
   *Fier:* „Mülltonne (rot, disabled für eigenen Account): Bestätigungs-Dialog 'Benutzer wirklich löschen?' Buttons: 'Nein, nicht löschen' / 'Ja, löschen' (rot). Toast: 'Benutzer wurde gelöscht.' Unten Card 'Kassen & QR' für Kassen-Konten — die sind separat. Tour fertig!"

---

## F2 · Kassenmodus & QR-Code
**Rolle:** Admin | **Voraussetzung:** A1 (Achtung: Kassen-Anlage ist auch im Testmodus echt!) | **Steps:** 8

1. **Kassenmodus öffnen** · `dashboard-card-kiosk` · interactive
   *Fier:* „Vom Dashboard: 'Kassenmodus'-Karte."

2. **Konzept** · `kassenmodus-qr` · spotlight
   *Fier:* „Kassenmodus = Tablet/Bildschirm an der Kasse. Das Personal scannt QR + gibt Passwort ein → kommt in Kiosk-Layout (nur Listen, kein PDF, kein Marktwechsler). Sicherheit: Token läuft nach 6 Monaten ab."

3. **Card 'Einstiegs-Link & QR'** · `kassenmodus-qr` · spotlight
   *Fier:* „Card oben: URL mit Token + 'Gültig bis {Datum}'. Großer QR-Code rechts (~200×200 px). Fünf Aktion-Buttons: Link kopieren, Drucken, PDF speichern, Neuen Link erzeugen, Vorschau (neuer Tab)."

4. **Info-Banner** · `kassenmodus-qr` · spotlight
   *Fier:* „Wichtige Warnung: 'Gleicher Browser, mehrere Tabs / Wenn du hier eingeloggt bist und im neuen Tab die Kasse anmeldest, gilt die Kiosk-Session für alle offenen Tabs dieser Website.' Für Vorschau ohne deine Admin-Session zu verlieren: privates Fenster oder zweites Browser-Profil."

5. **Erste Kasse anlegen** · `kassenmodus-add-register` · spotlight
   *Fier:* „Card 'Kasse hinzufügen' unten links. Dropdown 'Kassen-Nummer' (Default 'Kasse 2 (nächste)') + Passwort-Feld (mind. 6 Zeichen) + '+ Kasse anlegen'-Knopf."

6. **Kassen-Liste** · `kassenmodus-registers-list` · spotlight
   *Fier:* „Card 'Kassen' rechts: pro existierende Kasse Zeile mit Anzeigename + 'Deaktivieren' (sekundär) + 'Passwort ändern' (Schlüssel) + Mülltonne (Löschen)."

7. **Link kopieren testen** · `kassenmodus-qr` · interactive
   *Fier:* „Klick 'Link kopieren'. Toast: 'Link kopiert.' URL ist jetzt in der Zwischenablage."

8. **Sicherheits-Hinweis** · `kassenmodus-qr` · spotlight
   *Fier:* „Wichtig: 'Neuen Link erzeugen' rotiert den Token — ALLE aktiven Kassen-Sessions werden danach ungültig! Nur nutzen wenn QR geleakt ist. Token läuft sowieso nach 6 Monaten ab. Tour fertig!"

---

## G1 · Abschluss
**Rolle:** alle | **Voraussetzung:** mind. 1 andere Tour | **Steps:** 4

1. **Lob** · `dashboard-welcome` · spotlight
   *Fier:* „Top — du hast die Basics gelernt! Du kennst jetzt deine Listen, weißt was die Markierungen bedeuten und wie du eigene Sachen anlegst."

2. **Wiederholen** · `header-tutorial-icon` · spotlight
   *Fier:* „Wenn du was vergisst oder eine andere Tour machen willst — der Tutorial-Knopf oben ist dein Anlaufpunkt. Da kannst du jede Tour einzeln wiederholen."

3. **Profil-Menü als Backup** · `profile-menu` · spotlight
   *Fier:* „Im Profil-Menü findest du auch 'Einführung wiederholen' — falls du den Knopf oben mal nicht findest."

4. **Testmodus beenden** · `testmode-exit-button` · spotlight
   *Fier:* „Wenn du noch im Testmodus bist (gelber Rahmen): unten rechts 'Testmodus beenden' klicken. Alle Test-Aktionen werden verworfen, du bist wieder im echten System. Bis bald! 👋"

---

## T-Multi-Markt (conditional)
**Rolle:** alle (User, Admin, Viewer) **wenn** `useStores().data.length > 1` | **Steps:** 3

1. **Markt-Switcher** · `header-store-switcher` · spotlight
   *Fier:* „Du hast mehrere Märkte. Oben im Header siehst du den Markt-Switcher — der zeigt dir wo du gerade bist."

2. **Wechseln** · `header-store-switcher` · interactive (Validierung: anderer Markt aktiv)
   *Fier:* „Klick drauf, wähl einen anderen Markt aus."

3. **Effekt** · `masterlist-context-line` · spotlight
   *Fier:* „Die ganze App schaltet jetzt um — du siehst Listen, Werbung, Benutzer dieses Markts. Beim Zurückwechseln sieht der erste Markt wieder genauso aus wie vorher."


Alle 13 Touren + 1 Conditional-Tour ausgearbeitet. Bitte durchlesen und Feedback pro Tour geben:
- ✅ passt
- ✏️ anders: was?
- ❌ Tour weg
- ➕ Step fehlt

Sobald Feedback durch, weiter mit:
- **Schritt 2:** Welcome-Modal-Mockup mit vereintem Tutorial-Knopf + Tour-Auswahl-UX
- **Schritt 3:** Architektur (Step-Schema, Orchestrator parallel)
- **Schritt 4:** Tour für Tour bauen
