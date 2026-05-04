# Tutorial-Bug-Audit — Phase 1.5

**Datum:** 2026-05-03
**Kontext:** Nach Phase 1 hat User in DEV das Tutorial getestet und mehrere Inhalts-/Layout-Bugs gefunden. Dieses Dokument katalogisiert systematisch, was wo falsch ist. **Kein Inhalts-Fix in Phase 1.5** — das gehört in Phase 3 (gemeinsamer Curriculum-Workshop).

---

## Was Phase 1.5 implementiert hat

| Fix | Datei | Beschreibung |
|---|---|---|
| **Coach-Panel-Profilbild-Bug** | [src/components/tutorial/TutorialCoachPanel.tsx:128-135](src/components/tutorial/TutorialCoachPanel.tsx#L128-L135) | Panel zeigte am rechten Rand ins Leere zwischen Glocke und Sparkles. Ursache: künstliches `extraLeft = 72`. Fix: Panel mittig unter Avatar, Pfeil zeigt jetzt zuverlässig nach oben. |

---

## Curriculum-Inventar mit Interaktivitäts-Quote

Quelle: alle 13 Curriculum-Files + `tutorial-registry.ts`.

| Modul | Tasks | mit `validate()` | nur Info/Ack | Interaktivitäts-Quote |
|---|---:|---:|---:|---:|
| basics | 14 | 8 | 6 | **57 %** |
| admin | 6 | 6 | 0 | **100 %** (aber kleines Modul) |
| viewer | 2 | 2 | 0 | **100 %** (aber kleines Modul) |
| admin-konfig | 29 | 0 | 29 | **0 %** |
| backshop-deep | 22 | 0 | 22 | **0 %** |
| backshop-marken | 10 | 0 | 10 | **0 %** |
| backshop-upload | 10 | 0 | 10 | **0 %** |
| closing | 5 | 0 | 5 | **0 %** |
| hidden-renamed-custom | 21 | 0 | 21 | **0 %** |
| obst-deep | 21 | 0 | 21 | **0 %** |
| users-light | 5 | 0 | 5 | **0 %** |
| werbung | 15 | 0 | 15 | **0 %** |
| registry (Driver-Spotlights) | 12 | – | 12 | – |

**Befund:** **156 von 172 Tasks (91 %) sind reine Klick-dich-durch-Steps.** Nur die `basics`/`admin`/`viewer`-Module haben echte Klick-Validierung (`validate: () => isProfileMenuOpen()` etc.).

Das deckt sich mit User-Feedback: „Eigene Produkte → fordert dich nicht auf zu klicken", „blende doch mal ein Produkt aus" — fehlt überall.

---

## Bug-Kategorien aus User-Test (2026-05-03)

### A) Falscher Inhalt für Rolle

| ID | Bug | Datei / Stelle |
|---|---|---|
| **A1** | `backshop-upload` wird laut [TutorialOrchestratorContext.tsx:647](src/contexts/TutorialOrchestratorContext.tsx#L647) für **Admin** gezeigt — aber User sagt: Upload ist **nur Super-Admin**. | [src/contexts/TutorialOrchestratorContext.tsx:296-297](src/contexts/TutorialOrchestratorContext.tsx#L296-L297) — die Upload-Option wird unter `isAdminRole` hinzugefügt. |
| **A2** | Konfig-Vorwahl Admin (zwischen „Liste sehen" und „Liste konfigurieren") fehlt im Curriculum komplett. User springt direkt zu „Aktion in PLU-Liste". | Kein dedizierter Step in `tutorial-curriculum-admin*.ts`. |

### B) Fehlende Interaktivität

| ID | Bug | Datei |
|---|---|---|
| **B1** | „Eigene Produkte → Neues Produkt anlegen" ist nur Info-Step, fordert nicht zum Klick auf | [src/lib/tutorial-curriculum-hidden-renamed-custom.ts](src/lib/tutorial-curriculum-hidden-renamed-custom.ts) — alle 21 Tasks ohne `validate` |
| **B2** | „Produkt ausblenden" sagt nur Bescheid, fordert nicht zum Klick auf | dito |
| **B3** | Fast alle Module außer `basics`/`admin`/`viewer` haben **null Interaktivität** (siehe Tabelle oben) | siehe Tabelle |

### C) Fehlende Module / Steps

| ID | Bug | Konsequenz |
|---|---|---|
| **C1** | **Kassenmodus-Tour fehlt komplett.** `grep -r kiosk\|Kassen src/lib/tutorial-curriculum-*.ts` → kein Treffer. | User wird durch Kalenderwoche/Glocke/Sparkles geführt, aber Kassenmodus wird übersprungen. |
| **C2** | Konfig-Vorwahl Admin fehlt (siehe A2) | Sprung von „Markt wählen" direkt zur Liste, ohne Erklärung dass es auch eine Konfig-Seite gibt. |

### D) Layout-Bugs

| ID | Bug | Datei | Status |
|---|---|---|---|
| **D1** | Coach-Panel beim Profilmenü zeigt Pfeil ins Leere | [src/components/tutorial/TutorialCoachPanel.tsx:128](src/components/tutorial/TutorialCoachPanel.tsx#L128) | **gefixt in Phase 1.5** |
| **D2** | Klick auf Sparkles/Tutorial-Icon: Coach-Panel müsste umpositionieren, tut es nicht | [src/components/tutorial/TutorialCoachPanel.tsx](src/components/tutorial/TutorialCoachPanel.tsx) — kein `header-tutorial-icon`-Sonderfall in `computeProfileCoachPosition`-Familie | **offen** (Phase 2/3) |

### E) UX-Probleme

| ID | Bug | Datei |
|---|---|---|
| **E1** | Versehentlich wegklicken → kein „Weiter machen"-Button, stattdessen 4 überfordernde Auswahlen | [src/components/tutorial/TutorialModals.tsx](src/components/tutorial/TutorialModals.tsx) — die Modal-Kaskade ist zu komplex |
| **E2** | Tour läuft sich „abgehackt" an — Steps werden ohne Erklärung übersprungen wenn Anker fehlen | Phase 1 hat DEV-Toast hinzugefügt; in Prod weiterhin still |

### F) Inkonsistente Fier-Präsenz

| ID | Bug | Daten |
|---|---|---|
| **F1** | Fier-Avatar fehlt in einigen Steps (vor allem Driver-Spotlights) | 12 von 172 Steps ohne `fierKey` (alle in `tutorial-registry.ts`) |
| **F2** | „Fier:"-Anrede im Text fehlt in 88 % aller Tasks | siehe [tutorial-audit-2026-05-03.md](tutorial-audit-2026-05-03.md) |

---

## Empfehlungen für Phase 2/3

Phase 1.5 hat klar gezeigt: das Curriculum ist nicht durch Patches reparierbar. Die **Inhalts-Probleme** (A, B, C, F) sind so durchdringend, dass eine **systematische Überarbeitung in Phase 3** der einzige saubere Weg ist.

**Vorschlag:** Phase 2 + Phase 3 zusammenziehen statt strikt nacheinander.

### Phase 2 (Architektur, ~1 Woche)
- Neuer Orchestrator parallel (siehe Plan-Datei)
- Ein einziges Step-Datenmodell (kein TutorialTask vs. TutorialStep mehr)
- Sauberes Step-Schema mit explizitem `mode: 'info' | 'click-required' | 'complete-action'`
- `Role`-Filterung als Step-Property statt Build-Funktions-Trick
- Coach-Panel-Layout: weitere Sonderfälle (D2) sauber gelöst durch generischere Algorithmik

### Phase 3 (Curriculum komplett neu, ~1-2 Wochen, mit dir)
Modul für Modul gemeinsam durchgehen, dabei für jedes Modul:

1. **Was ist drin (Soll-Inhalt)?** — du sagst, ich notiere
2. **Wer sieht es (Rolle/Bedingungen)?** — strikte Filterung
3. **Welche Steps sind interaktiv (Klick-Pflicht)?**
4. **Welche Anker werden gebraucht?** — wir prüfen pro Step ob der Anker existiert
5. **Fier-Anrede konsistent** — jeder Step bekommt entweder Fier-Text oder ist explizit als „Spotlight" markiert

**Neu zu bauen:**
- **Kassenmodus-Tour** (komplett fehlend)
- **Admin-Konfig-Vorwahl-Step**

**Komplett zu überarbeiten:**
- `hidden-renamed-custom`: 21 Steps → mit Interaktivität
- `backshop-upload`: Rolle prüfen (Super-Admin?), interaktiv machen
- `obst-deep`, `backshop-deep`, `werbung`: jeweils mit Click-Validierung statt nur Info

**Kann erstmal bleiben:**
- `basics`, `admin`, `viewer`: schon interaktiv
- `closing`: kurz, ok

---

## Was die User-Beobachtungen kategorisiert

| User-Wahrnehmung | Bug-ID(s) | In welchem Schritt fixen |
|---|---|---|
| „Kassenmodus wird übersprungen" | C1 | Phase 3 |
| „Konfig-Vorwahl beim Admin fehlt" | C2 | Phase 3 |
| „Aktion in PLU-Liste — die 4 (Fier) fehlt" | F1, F2 | Phase 3 |
| „Excel-Upload gibt es nur für Super-Admin" | A1 | Phase 3 |
| „Eigene Produkte → fordert nicht zum Anlegen auf" | B1 | Phase 3 |
| „Ausblenden ist auch nicht interaktiv" | B2 | Phase 3 |
| „Versehentlich wegklicken → keine Weiter-Hilfe" | E1 | Phase 2 (Architektur) |
| „Pfeil zeigt zwischen Glocke und Tutorial-Icon" | D1 | **Phase 1.5 — gefixt** |
| „Klick auf Tutorial-Icon: Panel positioniert nicht um" | D2 | Phase 2 |
