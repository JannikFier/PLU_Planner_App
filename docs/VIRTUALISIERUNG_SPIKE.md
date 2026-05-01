# Virtualisierung der PLU-Masterlisten – Spike & Konzept

**Status:** Konzept (Stufe 3b). Keine Implementierung in Stufe 3a.  
**Ziel:** Nur bei nachgewiesenem Performance-Bedarf (Profiler, große Listen) angehen – nicht „nebenbei“ beim nächsten UI-Refactor.

## Problemstellung

Die Masterlisten rendern viele Zeilen im DOM. **Virtualisierung** (nur sichtbare Zeilen mounten) reduziert Arbeit für Layout und React, verändert aber:

- **DOM:** Zeilen-Indizes im Browser entsprechen nicht mehr 1:1 allen Listenpositionen.
- **„In Liste suchen“ / Springen zur Zeile:** [`src/lib/find-in-page-scroll.ts`](../src/lib/find-in-page-scroll.ts) und `data-row-index` müssen zur **logischen** Zeilennummer passieren, nicht zur virtuellen Viewport-Position.
- **Browser „Seite durchsuchen“ (Ctrl/Cmd+F):** Nur im DOM vorhandene Knoten sind suchbar; nicht gerenderte virtuelle Zeilen erscheinen **nicht** in der Browser-Suche. Das ist ein bewusster Trade-off oder erfordert einen **eigenen Such-Dialog**, der über die volle Datenliste iteriert und dann scrollt.
- **Kiosk:** [`KioskListFindContext`](../src/contexts/KioskListFindContext.tsx) und externe Trigger für Find-in-Page müssen nach Virtualisierung weiter zuverlässig zur Zeile scrollen und ggf. Fokus setzen.
- **Mobile:** [`PluTableBackshopMobileList`](../src/components/plu/PluTableBackshopMobileList.tsx) und Desktop-Zwei-Spalten-Layout können unterschiedliche Mess-/Höhen-Anforderungen haben (eine Strategie pro Breakpoint oder eine konservative feste Zeilenhöhe).
- **PDF-Export:** Bleibt **datenbasiert** (bereits aus Hooks/Listen), nicht DOM-Screenshot – hier keine Änderung nötig, solange Export aus denselben `DisplayItem[]` wie die Tabelle gespeist wird.

## Bibliothek (Vorschlag)

- **`@tanstack/react-virtual`** – gut passend zu TanStack Query im Stack; kleine API für `Virtualizer` + Scroll-Parent.

Alternativen (`react-window`, `react-virtuoso`) sind möglich; Entscheidungskriterien: zwei Spalten + Buchstaben-/Block-Header als „Sticky“-Sonderzeilen, Messbarkeit der Zeilenhöhe, Lizenz.

## Technische Leitplanken

1. **`data-row-index`:** Fortlaufend über die **flache** sichtbare Tabellenzeilenliste (wie heute in der Layout-Engine ausgedrückt), unabhängig davon, ob die Zeile gerade gemountet ist. Beim Scroll-zum-Treffer: `virtualizer.scrollToIndex(logicalIndex, { align: … })` statt `scrollIntoView` auf einem nicht existierenden Knoten.
2. **Zeilenhöhe:** Entweder **feste Höhe** pro Zeilentyp (einfach, vorhersagbar) oder **dynamic measure** mit Cache – bei Bild-Thumbnails im Backshop ist „fest“ nur akzeptabel, wenn Thumbnail-Box und Textzeilen normiert sind.
3. **Gruppenheader (Buchstabe / Warengruppe):** Als eigene virtuellen „Items“ mit eigenem Typ und Höhe modellieren (ein gemeinsames Array für Virtualizer), analog zu [`buildFlatRows`](../src/lib/plu-table-rows.ts) – möglichst **keine** zweite Quelle der Wahrheit neben der bestehenden Geometrie.
4. **Zwei-Spalten-Desktop:** Entweder ein Virtualizer pro Spalte mit aufgeteilter Liste (symmetrisch zu aktuellem Layout) oder ein Virtualizer für eine „virtuelle“ lange Liste mit CSS-Grid – wird im Spike prototypisch verglichen.

## E2E / Playwright (Pflicht vor Merge einer Virtualisierung)

Erweiterungen zu [`docs/TESTING.md`](TESTING.md), nicht nur Smoke:

| Szenario | Erwartung |
|----------|-----------|
| Find-in-Page / Kiosk-Suche zu mittlerer und letzter Zeile | Scroll-Ziel sichtbar, Treffer-Hervorhebung korrekt |
| Reload auf Masterliste | Kein Layout-Sprung, keine leeren Lücken |
| Mobile Backshop-Karten (falls virtualisiert) | Kein horizontales Overflow (bestehende `mobile-layout`-Patterns) |
| PDF-Dialog öffnen | Item-Anzahl konsistent mit nicht-virtualisierter Referenz (Staging-Daten) |

Bestehende Selektoren (`data-tour`, `data-testid`) beibehalten oder gezielt ergänzen – nicht nur auf erste sichtbare Zeilen verlassen.

## Spike-Ablauf (empfohlen)

1. Branch nur für Spike; eine Liste (z. B. Obst Master mit synthetisch vielen Dummy-Zeilen oder Prod-anonymisierte große KW).
2. Minimalen Vertical-Virtualizer nur für **eine** Spalte / einen Modus (Desktop SEPARATED oder MIXED).
3. `scrollToDataRowIndex` an neue Scroll-API anbinden; Unit-Test für Mapping Index → Offset falls extrahiert.
4. Dokumentierte Entscheidung: Ctrl+F akzeptiert eingeschränkt vs. eigenes Suchfeld.

## Referenz

- Projektregel: [.cursor/rules/component-size-and-agents.mdc](../.cursor/rules/component-size-and-agents.mdc) (Performance-Stufen / Virtualisierung).
- Kurz erwähnt in [TESTING.md – Virtualisierung](TESTING.md#virtualisierung-langer-listen-bewusst-zurückgestellt).
