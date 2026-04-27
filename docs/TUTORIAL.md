# Modulares Tutorial („Fier“)

## Überblick

Die App bietet ein **rollen- und marktabhängiges Onboarding** mit dem Maskottchen **Fier**. Fortschritt und Einstellungen (z. B. „nicht mehr automatisch anzeigen“) werden in der Tabelle `user_tutorial_state` **pro Benutzer und Markt** (`user_id`, `store_id`) gespeichert.

- **Super-Admin** ohne aktive **User-Vorschau** sieht kein Tutorial (kein Markt-Kontext wie Endnutzer).
- **Super-Admin in der User-Vorschau** (simulierte Rolle) nutzt dieselbe Logik wie die gewählte Rolle.

## Module und Inhalts-Versionen

Die Tutorial-Inhalte sind in **Module** unterteilt (siehe `TUTORIAL_CONTENT_VERSIONS` in [`src/lib/tutorial-types.ts`](../src/lib/tutorial-types.ts)):

| Modul   | Inhalt (Kurz) |
|---------|----------------|
| `basics` | Dashboard, Profilmenü klicken, Testmodus aktivieren, Bereichskacheln |
| `obst`   | PLU-Liste Obst/Gemüse (Toolbar, Suche, Markierungen, Coach-Vertiefung) |
| `backshop` | Backshop-Liste (Toolbar, Suche, Coach-Vertiefung) |
| `users`  | Benutzerverwaltung (Admin, Dialog „Neuer Benutzer“) |

Wenn du **neue Funktionen** erklären willst oder Texte/Steps änderst:

1. **Steps** in [`src/lib/tutorial-registry.ts`](../src/lib/tutorial-registry.ts) bzw. die `data-tour`-Attribute in den UI-Komponenten anpassen.
2. Die passende **Inhalts-Version** in `TUTORIAL_CONTENT_VERSIONS` für dieses Modul **erhöhen**. Nutzer, deren gespeicherte `contentVersionSeen` kleiner ist, werden das Modul erneut angeboten bekommen (siehe `moduleNeedsRefresh` in `tutorial-types.ts` und die Logik im `TutorialOrchestratorProvider`).

So bleibt die Tour **kurz**, bleibt aber bei Feature-Updates **nachziehbar**, ohne alles linear zu verlängern.

## UI-Anker (`data-tour`)

Spotlight-Schritte referenzieren stabile Selektoren `data-tour="..."`. Bei Layout-Änderungen diese Attribute mitziehen, sonst überspringt der Filter ggf. Schritte oder die Tour wirkt leer.

## Datenbank

Migration: [`supabase/migrations/069_user_tutorial_state.sql`](../supabase/migrations/069_user_tutorial_state.sql) (Tabelle + RLS).

## Gen-E Award / Demo-Accounts

Für Jury-Zugänge kann der gespeicherte Stand zurückgesetzt werden, indem die Zeilen in `user_tutorial_state` für den Test-User/Markt gelöscht oder `state` auf `{}` gesetzt wird (z. B. per SQL im Supabase SQL Editor). **Zugangsdaten nicht** ungeschützt im Repo dokumentieren.

## Technik

- **driver.js** für die geführten Schritte, siehe [`src/lib/run-driver-tour.ts`](../src/lib/run-driver-tour.ts). Aktive Tour kann per `destroyActiveDriverTour()` hart beendet werden (z. B. Testmodus aus).
- **Orchestrator**: [`src/contexts/TutorialOrchestratorContext.tsx`](../src/contexts/TutorialOrchestratorContext.tsx) (eingebunden in [`src/App.tsx`](../src/App.tsx) innerhalb von `BrowserRouter`).
- **SVG-Maskottchen**: [`src/components/tutorial/FierMascot.tsx`](../src/components/tutorial/FierMascot.tsx).
- **Interaktive Task-Kette**: [`src/lib/tutorial-interactive-engine.ts`](../src/lib/tutorial-interactive-engine.ts) + Coach-Panel [`src/components/tutorial/TutorialCoachPanel.tsx`](../src/components/tutorial/TutorialCoachPanel.tsx); Situations-Keys: [`src/lib/tutorial-fier-presets.ts`](../src/lib/tutorial-fier-presets.ts).
- **Curriculum-Matrix** (Feature × Rolle × Testmodus, `data-tour`-Inventar, bekannte Produkt-Risiken): [`docs/TUTORIAL_CURRICULUM.md`](TUTORIAL_CURRICULUM.md).

## Darstellung: driver.js vs. Fier-Coach

- **driver.js**: Popover-Texte ohne Maskottchen-Grafik; kurze Spotlights auf `data-tour`-Elemente.
- **Coach (`TutorialCoachPanel`)**: Zeigt **Fier** (`FierMascot`) mit `fierKey`-Pose und optional `nearSelector` für die Position nahe einem Anker (Desktop).
- **Empfehlung**: Längere Erklärungen und klick-getriebene Anweisungen in **Coach-Tasks**; driver nur für erste Orientierung auf der Fläche.

## Replay „Beim nächsten Mal“

Wählt der Nutzer im Abschlussdialog **Beim nächsten Mal wieder**, bleibt `replayOnNextLogin` in der DB gesetzt. Kurz danach unterdrückt [`src/lib/tutorial-replay-session.ts`](../src/lib/tutorial-replay-session.ts) das Willkommens-Modal nur für **ca. 1,2 Sekunden**, damit es nicht in derselben Schließen-Animation sofort wieder aufgeht. Danach (und nach **Reload**) greift `replayOnNextLogin` wieder normal, ohne Logout zu erzwingen. Zusätzlich wird die Unterdrückung nach **erfolgreich abgeschlossener Tour** geleert. **Logout** (`SIGNED_OUT`) setzt das Defer ebenfalls zurück ([`AuthContext`](../src/contexts/AuthContext.tsx)). Im Follow-up gibt es **„Jetzt erneut starten“**, um sofort mit zurückgesetztem Tutorial-Fortschritt ins Willkommen zu springen.

## Einführung manuell wiederholen

Im **Profilmenü** (oben rechts) steht **„Einführung wiederholen“**: setzt den Tutorial-Zustand zurück (`modules` geleert, `fullResetNext`/`autoDisabled` passend) und öffnet das Willkommens-Modal auf dem jeweiligen Rollen-Dashboard. Super-Admins ohne User-Vorschau sehen den Eintrag nicht (kein Tutorial-Kontext).

## Testmodus und Tour

- **User/Admin:** Nach dem ersten driver-Segment „Basics“ folgt eine **interaktive Kette**: Profilmenü öffnen (`data-state="open"` am Trigger `data-tour="profile-menu"`), dann **Testmodus starten** im Menü. Erst danach ein kurzer driver-Schritt auf den Badge **„Testmodus beenden“** (`data-tour="testmode-exit-button"`). Wenn der Testmodus nach der Kette noch nicht aktiv ist, schaltet der Orchestrator ihn **fallback** ein, bevor Listen-Module folgen.
- **Viewer:** kein Testmodus-Zwang; keine interaktive Testmodus-Kette.
- **Testmodus beenden** (Profil, Banner, synchroner Tab) löst `plu-tutorial-testmode-off` aus: laufende driver-Tour wird zerstört, Task-Warteschlange abgebrochen, Dialog **„Tour pausiert“** mit Optionen Testmodus wieder an / Tour beenden.
- **Benutzerverwaltung** im Testmodus: Edge-Aufrufe liefern nur Stub-Antworten; Toasts weisen auf **Simulation** hin (kein echter Nutzer / kein echtes Passwort / keine echte Löschung).

## Design-Quellen Fier

Prototypen und die große Situationsbibliothek liegen unter [`Externe/Figur/`](../Externe/Figur/README.md) (README und `SITUATIONS.md` dort).
