# Stufe 4 – konkreter Agent-Plan (zum Einfügen im Agent-Modus)

Dieses Dokument ist **copy-paste-tauglich**: Du kannst den Abschnitt [„Prompt-Vorlage für den Agent“](#prompt-vorlage-für-den-agent) oder einzelne **Arbeitspakete** in einen Chat im **Agent-Modus** legen.

**Stufe 5** (Virtualisierung): **Ja – sinnvollerweise danach**, wenn Stufe 4 für die wichtigsten Monolithen durch ist. **Ausnahme:** Wenn sich **messbar** zeigt, dass nur die PLU-Hauptliste CPU/DOM bremst, darf Stufe 5 **zeitlich vorgezogen** werden – dann aber **nicht** dieselbe Session wie ein großer Stufe‑4-Refactor mischen. Kurz: [VIRTUALISIERUNG_SPIKE.md](VIRTUALISIERUNG_SPIKE.md); ausführlicher Plan: [REFACTOR_STUFE_5_AGENT_PLAN.md](REFACTOR_STUFE_5_AGENT_PLAN.md).

Übergeordnete Einordnung: [REFACTOR_ROADMAP_STUFEN.md](REFACTOR_ROADMAP_STUFEN.md).

**Umsetzungsstand:** **4.1–4.3** und **4.4** (UI-Slices Backshop Ausgeblendet) sind umgesetzt. **4.5–4.10:** erste Struktur-Slices (Hooks/Lib) für die genannten großen Seiten – siehe Tabelle unten; weitere Verkleinerung der Pages bei Bedarf inkrementell.

---

## Regeln (für jedes Arbeitspaket)

- Business-Logik nach `src/lib/`, Daten-Hooks nach `src/hooks/`; `src/pages/` nur Orchestrierung (Projektregeln).
- **Keine** Änderung an TanStack-**Query-Keys** oder an `layout-engine.ts`, außer es ist für den Slice **unvermeidlich** und wird explizit begründet.
- Nach jedem Paket: `npm run build` und `npm run test:run`.
- Bei Touch von Listen-Flows / Kiosk / Ausblenden: zusätzlich `npm run test:e2e:full` (oder `:serial` bei Flakes). Siehe [TESTING.md](TESTING.md).
- Orientierung an bestehendem Muster: Masterlisten (`useMasterListDisplayList`, `MasterListPageStates.tsx`).

---

## Definition of Done (pro Arbeitspaket)

| Kriterium | Pflicht |
|-----------|---------|
| Build + Unit-Tests | Immer `npm run build` und `npm run test:run` nach dem Slice. |
| E2E | Bei Touch von **Navigation**, **Listen-Flows**, **Kiosk** oder **Ausblenden**: zusätzlich laut [TESTING.md](TESTING.md) (`test:e2e` / `test:e2e:full` bzw. `:serial`). |
| Doku-Sync | Status-/Tabellenänderungen hier → gleiche Änderung der **Stufe‑4‑Zeile** in [REFACTOR_ROADMAP_STUFEN.md](REFACTOR_ROADMAP_STUFEN.md) (siehe dort „Sync-Regel“). |

**Slice erledigt** = erste sinnvolle Auslagerung (Hook/Lib/Komponente) ist drin und grün getestet – **nicht** automatisch „ganze Page unter Leitplanke“.

**Strikt abgeschlossen** (optional, nur bei Vereinbarung) = Page z. B. deutlich unter ~400–500 Zeilen und große Blöcke ausgelagert; sonst bleibt **weiter offen** als Follow-up.

---

## Arbeitspaket 4.1 – Dev-Hygiene (Masterlisten-PDF-Lazy)

**Ziel:** Vite-HMR stabiler; alle statischen Imports vor `lazy`.

**Dateien:**

- [src/pages/MasterList.tsx](../src/pages/MasterList.tsx)
- [src/pages/BackshopMasterList.tsx](../src/pages/BackshopMasterList.tsx)

**Schritte:**

1. **MasterList.tsx:** Den Block `const ExportPDFDialog = lazy(...)` **entfernen** von seiner aktuellen Position (aktuell zwischen zwei Import-Gruppen). **Alle** `import`-Zeilen **oben** zusammenhalten (eine durchgehende Liste). **`const ExportPDFDialog = lazy(...)`** direkt **nach dem letzten `import`**, **vor** `interface MasterListProps`.
2. **BackshopMasterList.tsx:** Gleiches Muster für `ExportBackshopPDFDialog` – **kein** `import` mehr **nach** dem `lazy`-`const`.
3. `npm run build` → grün.

**Erfolgskriterium:** Keine Syntax-/Lint-Probleme; Dev-Server lädt beide Seiten ohne `500` auf der `.tsx`-URL beim Speichern.

---

## Arbeitspaket 4.2 – `BackshopHiddenProductsPage`: reine Hilfen nach `src/lib/`

**Ziel:** Datei kürzen, keine React-Abhängigkeit in den Hilfen.

**Datei:** [src/pages/BackshopHiddenProductsPage.tsx](../src/pages/BackshopHiddenProductsPage.tsx)

**Schritte:**

1. Identifiziere **modul-lokale Konstanten und Pure Functions** am Dateianfang (z. B. `UNGEORDNET_BLOCK`, `ALL_BLOCKS_PARAM`, Funktion `orderBlockKeys`). Keine Komponenten/Hooks mitziehen.
2. Lege eine neue Datei an, z. B. `src/lib/backshop-hidden-products-page-utils.ts` (Name frei, aber eindeutig; Kommentar auf Deutsch).
3. Exportiere die Hilfen; die Page importiert sie. Public API minimal halten.
4. Falls Unit-Tests für `orderBlockKeys` sinnvoll sind: kleine Datei `src/lib/backshop-hidden-products-page-utils.test.ts`.
5. `npm run build`, `npm run test:run`.

**Erfolgskriterium:** Gleiches Laufzeitverhalten; keine neuen Zyklen (Lib importiert keine React-Komponenten).

---

## Arbeitspaket 4.3 – `BackshopHiddenProductsPage`: Display-/Listen-Logik in Hook(s)

**Ziel:** Page shrink; große `useMemo`-Ketten gebündelt.

**Schritte (iterativ erlaubt):**

1. Lies die Page und gruppiere Logik in **(a)** Daten aus Queries, **(b)** abgeleitete Listen/Zeilen für „manuell ausgeblendet“ vs. „regelbasiert“, **(c)** Such-/Find-in-Page-Binding falls rein ableitbar.
2. Neu: `src/hooks/useBackshopHiddenProductsPageModel.ts` (oder zwei Hooks, wenn die Trennung klarer ist – aber nicht unnötig splitten).
3. Der Hook erhält **nur** Parameter, die von außen kommen (z. B. Store-ID, Version-IDs, Search-Params), und gibt **stabile** Rückgaben für die JSX-Schicht (Listen, Loading-Fahnen, Callbacks).
4. Die Page rendert nur noch Layout, Dialoge, Toolbar – **keine** 200-Zeilen-`useMemo` in der Page, wenn sie im Hook leben können.
5. `npm run build`, `npm run test:run`; bei Bedarf gezielt E2E für Backshop-Ausgeblendete.

**Erfolgskriterium:** Deutliche Zeilenreduktion in der Page; Verhalten unverändert (visuell + Rollen).

---

## Arbeitspaket 4.4 – Optional: UI-Slices (Props-only)

**Ziel:** Wiederkehrende Cards/Alerts wie bei Masterlisten.

**Schritte:**

1. Suche in `BackshopHiddenProductsPage.tsx` nach wiederholten **Card/Alert/Skeleton**-Blöcken für leer/Fehler/Laden.
2. Extrahiere nach `src/components/backshop/` oder `src/components/plu/` mit **nur Props**, keine eigenen Queries.
3. Build + Tests wie oben.

---

## Arbeitspaket 4.5 ff. – Weitere Seiten (Reihenfolge)

Bearbeite **pro Session höchstens eine große Seite** oder ein klares Teilthema.

| Nr. | Datei (Priorität) | Richtung | Slice-Stand (Stand Dokument) |
|-----|-------------------|----------|------------------------------|
| 4.5 | `SuperAdminStoreDetailPage.tsx` | Benutzer-Edge-Mutationen → `useSuperAdminStoreDetailUserMutations` | Minimum erfüllt; weitere Verdünnung optional |
| 4.6 | `CentralCampaignUploadPage.tsx` | Obst-Parsing-Helfer → `central-campaign-upload-page-helpers.ts` | Minimum erfüllt; weitere Verdünnung optional |
| 4.7 | `HiddenItems.tsx` | Anzeige-Helfer → `hidden-items-display.ts`; Rollenpräfix → `dashboard-role-prefix.ts` | Minimum erfüllt; weitere Verdünnung optional |
| 4.8 | `UserManagement.tsx` | Profilliste/Kontext → `useUserManagementProfileList` | Minimum erfüllt; weitere Verdünnung optional |
| 4.9 | `BackshopMarkenAuswahlPage.tsx` | Abgeleitete Gruppenlisten → `useBackshopMarkenAuswahlDerived`; Präfix wie 4.7 | Minimum erfüllt; weitere Verdünnung optional |
| 4.10 | `AdminKassenmodusPage.tsx` | Daten/Mutationen/QR → `useAdminKassenmodusPage` | Minimum erfüllt; weitere Verdünnung optional |

*Minimum erfüllt* = erste Hooks/Lib wie in der Spalte „Richtung“ umgesetzt. *Weitere Verdünnung optional* = Page kann weiter unter die Leitplanke (~400–500 Zeilen orientierend), wenn ihr das als separates Ziel vereinbart.

Vor jedem Paket: `wc -l src/pages/<Datei>` – nach Refactor soll die Page **spürbar** unter die Leitplanke rutschen, wo es machbar ist (orientierend 400–500 Zeilen; Ausnahme wenn die Seite absichtlich viele unabhängige Bereiche hat).

### Zeilenstand `src/pages/` (Snapshot bei formalem Abschluss Stufe 4 / Roadmap-Sync)

Auszug der größten Dateien nach `wc -l src/pages/*.tsx | sort -n` (lokal erneut messen bei Bedarf):

| Zeilen | Datei |
|--------|--------|
| 1066 | `SuperAdminStoreDetailPage.tsx` |
| 943 | `CentralCampaignUploadPage.tsx` |
| 913 | `HiddenItems.tsx` |
| 815 | `UserManagement.tsx` |
| 718 | `BackshopMasterList.tsx` |
| 708 | `BackshopMarkenAuswahlPage.tsx` |
| 633 | `BackshopOfferProductsPage.tsx`, `SuperAdminBackshopProductGroupComposePage.tsx` |
| 565 | `MasterList.tsx` |
| 470 | `BackshopHiddenProductsPage.tsx` |

Weitere Verdünnung dieser Pages bleibt **optional** (Tabellenzeilen 4.5–4.10).

---

## Prompt-Vorlage für den Agent

```
Arbeite nach docs/REFACTOR_STUFE_4_AGENT_PLAN.md.

Paket: [4.1 / 4.2 / 4.3 / …] – exakt die Schritte dort umsetzen.
Projektregeln: src/lib + src/hooks für Logik, keine unnötigen Query-Key-Änderungen.
Danach: npm run build && npm run test:run
Abschluss: REFACTOR_ROADMAP_STUFEN.md (Stufe-4-Zeile) und dieser Plan bei Statusänderung synchron halten (ja/nein vermerken).
```

---

## Stufe 5 – wann?

- **Standard:** Nach den wichtigsten Stufe‑4-Paketen (mindestens **4.1** und die Top‑Priorität **BackshopHiddenProductsPage 4.2–4.3**), sobald ihr Ruhe für ein **eigenes Virtualisierungs-Projekt** habt.
- **Vorgezogen:** Nur bei **Messung** (Profiler, spürbare Lag mit großen Listen), dann [VIRTUALISIERUNG_SPIKE.md](VIRTUALISIERUNG_SPIKE.md) befolgen – **nicht** parallel zu einem großen Page-Refactor in derselben Woche, wenn vermeidbar.
