# Tutorial-Audit (2026-05-03)

Bonus-Audit aus Phase 1 des Tutorial-Rewrites. Zwei Teile:
1. **Trigger-Übersicht** — wo wird das Tutorial-Fenster geöffnet?
2. **„Fier"-Anwesenheit** — in wie vielen Schritten ist Fier präsent?

Beides ist als Datenbasis für **Phase 3** (Inhalts-Workshop) gedacht. In Phase 1 wurde nichts inhaltlich verändert.

---

## Teil 1 — Wo wird das Tutorial geöffnet?

Übersicht aller UI-Stellen, an denen das Tutorial gestartet, fortgesetzt oder neu begonnen werden kann.

### A) Header — Sparkles-Icon (Rundgang)
**Sichtbar wenn:** `tutorialActive === true` (also wenn ein Tutorial gerade läuft oder offen ist).
**Ort:** Header rechts neben dem Profil-Menü.
**Datei:** [src/components/layout/AppHeader.tsx:449-461](src/components/layout/AppHeader.tsx#L449-L461)
**Anker:** `data-tour="header-tutorial-icon"`

Das Dropdown-Menü dahinter enthält:
- **„Fortsetzen"** → ruft `repeatIntroduction('continue')` (Anker `header-tutorial-continue`)
- **„Neu starten"** → ruft `repeatIntroduction('restart')` (Anker `header-tutorial-restart`)
- **„Tour abbrechen"** → ruft Abbruch-Logik (Anker `header-tutorial-cancel`)

### B) Header — Checklist-Popover (Status aller Module)
**Sichtbar wenn:** `tutorialActive === true`.
**Datei:** [src/components/layout/AppHeader.tsx:439-446](src/components/layout/AppHeader.tsx#L439-L446)
**Komponente:** `TutorialChecklistPopover`
**Anker:** `data-tour="header-tutorial-checklist"`

Zeigt pro Modul (basics, obst, backshop, users, ...) den Status (offen / erledigt) und einen Replay-Button.
- **Pro Modul „Wiederholen"** → ruft `tutorialReplayModule(mod)` ([src/components/tutorial/TutorialChecklistPopover.tsx:127](src/components/tutorial/TutorialChecklistPopover.tsx#L127))
- **„Alle wiederholen"** → ruft `repeatIntroduction('restart')` ([src/components/tutorial/TutorialChecklistPopover.tsx:143](src/components/tutorial/TutorialChecklistPopover.tsx#L143))

### C) Profil-Menü — „Einführung wiederholen"
**Datei:** [src/components/layout/AppHeader.tsx:614](src/components/layout/AppHeader.tsx#L614)
**Anker:** `data-tour="header-replay-intro"`

Eintrag im Profil-Dropdown (Zahnrad/Avatar oben rechts). Ruft `repeatIntroduction()` ohne Mode-Argument → öffnet die Welcome-Modal-Kaskade neu.

### D) Welcome-Modal nach Login
**Trigger:** automatisch nach erstem Login wenn der User noch kein Tutorial gesehen hat (oder explizit „beim nächsten Mal wieder anzeigen" gewählt hat).
**Datei:** [src/components/tutorial/TutorialModals.tsx](src/components/tutorial/TutorialModals.tsx)
**Steuerung:** `TutorialOrchestratorContext` entscheidet basierend auf `payload.replayOnNextLogin` und `payload.dismissedForever`.

Modal-Buttons:
- **„Von Anfang"** → `onReplayFromStart` ([TutorialModals.tsx:177](src/components/tutorial/TutorialModals.tsx#L177))
- **„Fortsetzen"** → `onReplayContinue` ([TutorialModals.tsx:180](src/components/tutorial/TutorialModals.tsx#L180))
- **„Jetzt neu starten"** → `onRestartNow` ([TutorialModals.tsx:186](src/components/tutorial/TutorialModals.tsx#L186))

### E) Coach-Panel (während laufender Tour)
Während eine Tour läuft: das Coach-Panel zeigt unten/seitlich den aktuellen Schritt.
**Datei:** [src/components/tutorial/TutorialCoachPanel.tsx:270](src/components/tutorial/TutorialCoachPanel.tsx#L270)
Bietet „Abbrechen", „Weiter", „Überspringen". Kein eigener Eintrittspunkt, sondern UI während laufender Tour.

### F) Debug-Overlay (nur DEV)
**Datei:** [src/components/tutorial/TutorialDebugOverlay.tsx](src/components/tutorial/TutorialDebugOverlay.tsx)
Sichtbar wenn `isTutorialDebugEnabled()`. Buffer-Anzeige für Tutorial-Events. Kein User-Trigger.

---

### Master-Schalter

Übergreifend: `isTutorialUiEnabled()` in [src/lib/tutorial-ui-env.ts](src/lib/tutorial-ui-env.ts).
Wenn `false`, wird der gesamte Orchestrator durch einen `noopOrchestrator` ersetzt → keiner der oben genannten Trigger ist sichtbar.

**Stand 2026-05-03:** Tutorial in Production aus.

---

## Teil 2 — „Fier"-Anwesenheit pro Modul

Auswertung aller 13 Curriculum-Module + `tutorial-registry.ts`. Pro Step zwei Indikatoren:
- **Fier-Text:** Der String enthält explizit „Fier:" (z.B. „Fier: Klicke oben rechts...").
- **fierKey:** Der Step hat ein `fierKey:`-Feld (Avatar-Geste wie 'point', 'think', 'wave').

| Modul | Steps | Fier-Text | fierKey | Ohne jegliche Fier-Präsenz |
|---|---:|---:|---:|---:|
| curriculum-admin-konfig | 29 | 5 | 29 | 0 |
| curriculum-admin | 6 | 1 | 6 | 0 |
| curriculum-backshop-deep | 22 | 3 | 22 | 0 |
| curriculum-backshop-marken | 10 | 0 | 10 | 0 |
| curriculum-backshop-upload | 10 | 1 | 10 | 0 |
| curriculum-basics | 14 | 1 | 14 | 0 |
| curriculum-closing | 5 | 0 | 5 | 0 |
| curriculum-hidden-renamed-custom | 21 | 0 | 21 | 0 |
| curriculum-obst-deep | 21 | 5 | 21 | 0 |
| curriculum-user | 0 | 0 | 0 | 0 |
| curriculum-users-light | 5 | 0 | 5 | 0 |
| curriculum-viewer | 2 | 2 | 2 | 0 |
| curriculum-werbung | 15 | 2 | 15 | 0 |
| **registry (Driver-Spotlights)** | **12** | **0** | **0** | **12** |
| **TOTAL** | **172** | **20** | **160** | **12** |

### Quoten

| Indikator | Steps mit Fier | Quote |
|---|---:|---:|
| Fier-Text (im body/description) | 20 / 172 | **12 %** |
| fierKey (Avatar-Geste) | 160 / 172 | **93 %** |

### Interpretation

- **Avatar/Geste (fierKey):** zu 93 % schon vorhanden. Die 12 Steps ohne sind ausschließlich die Driver.js-Spotlights in `tutorial-registry.ts` (`buildBasicsSteps`, `buildObstMasterlistSteps`, `buildBackshopListSteps`, `buildUsersSteps`). Diese Steps haben designgemäß keine Coach-Avatar-Anbindung — sie sind nur kurze Highlight-Boxen.
- **Namentliche Anrede „Fier:" im Text:** zu 88 % NICHT vorhanden. Nur 20 von 172 Steps reden den User in Fier-Stimme an.

### Wo Fier-Text komplett fehlt (Module mit 0 Fier-Text-Steps)

- `backshop-marken` (10 Steps) — keine Fier-Anrede
- `closing` (5 Steps) — Abschluss komplett ohne Fier-Anrede
- `hidden-renamed-custom` (21 Steps!) — größtes Modul ohne Fier-Anrede
- `users-light` (5 Steps)
- `registry` (12 Driver-Spotlights, designgemäß)

### Phase-3-Vorschlag

Wenn Konsistenz gewünscht ist („Fier soll in jedem Schritt anwesend sein"), heißt das in Phase 3:

1. **Driver-Spotlights (12 Steps in registry):** entscheiden — bleiben sie schnelle Highlight-Boxen, oder werden sie zu Coach-Tasks umgebaut, damit Fier auch dort spricht?
2. **152 Coach-Tasks ohne „Fier:"-Anrede:** body-Texte ergänzen um Fier-Stimme. Beispiel:
   - **Heute:** „Klicke oben rechts auf dein Profilbild."
   - **Mit Fier:** „Fier: Klicke oben rechts auf dein Profilbild — da finden wir gleich Wichtiges."
3. **Style-Helper:** in [src/lib/tutorial-curriculum-style.ts](src/lib/tutorial-curriculum-style.ts) gibt es bereits `actionStep()`, `navStep()`, `ackStep()` — diese könnten so erweitert werden, dass sie automatisch ein „Fier:"-Prefix anhängen, wenn keiner vorhanden ist.
4. **Validate-Skript-Erweiterung (optional):** kann prüfen, dass jeder Coach-Task entweder „Fier" im body hat ODER explizit als „nur Spotlight" markiert ist. Damit verhindert man, dass neue Steps wieder ohne Fier-Anrede gebaut werden.

Diese Entscheidungen gehören in den Curriculum-Workshop (Phase 3) — heute bewusst keine Implementierung.

---

## Was Phase 1 sonst noch geändert hat

Zur Vollständigkeit, die vier Bug-Fixes (B1-B4) aus Phase 1:

| ID | Was | Datei |
|---|---|---|
| B1 | Step 3 in Obst-Masterlist-Steps zeigt jetzt auf neuen Anker `masterlist-rows` (vorher fälschlich auf Toolbar) | [src/lib/tutorial-registry.ts](src/lib/tutorial-registry.ts), [src/components/plu/PLUTable.tsx](src/components/plu/PLUTable.tsx), [src/lib/tutorial-anchors.ts](src/lib/tutorial-anchors.ts) |
| B2 | `run-driver-tour.ts` delegiert jetzt komplett an `run-driver-tour-v2.ts` (Mutex aktiv) | [src/lib/run-driver-tour.ts](src/lib/run-driver-tour.ts) |
| B3 | `staleTime: 30_000 → 0` in Tutorial-Persistenz | [src/hooks/useTutorialPersistence.ts](src/hooks/useTutorialPersistence.ts) |
| B4 | DEV-Toast bei fehlenden Ankern (entlarvt stille Step-Filterung) | [src/lib/tutorial-orchestrator-utils.ts](src/lib/tutorial-orchestrator-utils.ts) |
