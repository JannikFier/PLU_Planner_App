# Nachbau-Anweisung: „Ausgeblendete Produkte (Backshop)" — Super-Admin-Ansicht

Ziel: Eine Super-Admin-Seite im Fier-Hub-Stil, die zwei Listen verwaltet —
(1) **manuell ausgeblendete** Produkte und
(2) Produkte, die **durch Regeln** nicht in der Hauptliste erscheinen.
Drei gleichberechtigte Design-Varianten werden nebeneinander auf einem Design-Canvas präsentiert, mit Tweaks (Dichte, Dark Mode).

---

## 1. Projekt-Struktur

Lege genau diese Dateien im Projekt-Root an:

```
Ausgeblendete Produkte.html   ← Einstieg, Host für Canvas + Tweaks
styles.css                     ← Tokens + alle geteilten Styles
data.js                        ← Kategorien, Produkte, Regeln (window.HubData)
shared.jsx                     ← Icons, Badges, Chips, Kacheln, Zeilen, Bulk-Bar
variant-a.jsx                  ← Variante A: Tabs „Manuell / Regel"
variant-b.jsx                  ← Variante B: Ein Stream mit Herkunfts-Chip
variant-c.jsx                  ← Variante C: Profi-Tabelle + Sidebar-Facetten
design-canvas.jsx              ← Starter-Komponente (pan/zoom Canvas)
tweaks-panel.jsx               ← Starter-Komponente (Tweaks-Panel)
```

Die beiden Starter-Komponenten werden **nicht** von Hand geschrieben — sie stammen aus der Starter-Library.

---

## 2. Reihenfolge des Baus

1. **`styles.css`** zuerst — das ist das Design-System. Alles andere baut darauf auf.
2. **`data.js`** — Mock-Daten.
3. **`shared.jsx`** — wiederverwendbare UI-Primitives.
4. **Varianten A/B/C** — jede nutzt dieselben `shared.jsx`-Komponenten, unterscheidet sich nur im Layout.
5. **`Ausgeblendete Produkte.html`** — ganz zum Schluss; hostet Canvas + Tweaks.

---

## 3. Design-System (styles.css) — die wichtigsten Tokens

Alle Farben als CSS Custom Properties auf `:root`, mit `[data-theme="dark"]`-Overrides. Schlüssel-Gruppen:

- **Neutrals:** `--n-0` bis `--n-900` (warm-kühles Grau)
- **Flächen:** `--bg-app`, `--bg-card`, `--bg-subtle`, `--bg-sunken`
- **Primary (Fier-Hub-Blau):** `--blue-50/100/500/600/700` (500 = `#2f6bff`)
- **Super-Admin-Amber:** `--amber-50/100/600/700`
- **Marken-Badge-Palette (abstrakt, NICHT echte Markenfarben):**
  - E: Indigo `#6b4fd8` auf `#eae5ff`
  - H: Burnt Orange `#c85e1f` auf `#ffe8d6`
  - A: Teal `#2a8a7a` auf `#d7f0ea`
  - O („Eigene"): Grau `#5a6068` auf `#e8ebef`
- **Regel-Chip:** Violett `--rule-600: #6b4fd8` auf `--rule-50: #f3edff`
- **Radii:** `--r-xs 4` · `--r-sm 6` · `--r-md 8` · `--r-lg 12` · `--r-pill 999`
- **Shadows:** `--shadow-xs/sm/md/lg`
- **Type:** Inter (Google Fonts), Feature-Settings `"ss01", "cv11"`

**Globale Klassen**, die alle Varianten benutzen:
`.hub-root`, `.hub-topbar`, `.hub-page`, `.hub-page-head`, `.btn` (+ `.btn--primary/ghost/icon/sm`), `.search`, `.seg`, `.chip` (+ `.chip-row`), `.panel` (+ `.panel-head`, `.panel-body`), `.tile` (+ Kompakt-Variante), `.bbadge` (+ `--E/H/A/O`), `.origin` (+ `--manual/--rule`), `.rule-chip`, `.prow-check`, `.prow-thumb`, `.tabs` + `.tab`, `.bulkbar`, `.side` (Sidebar), `.dense-row` / `.dense-head`, `.a-row` / `.a-head`, `.stream-row`, `.rule-group`.

**Density-Hook:** `[data-density="compact"]` und `[data-density="roomy"]` modifizieren Padding und Thumb-Größen von `.tile` und `.prow`.

---

## 4. Daten (data.js)

Hängt alles an `window.HubData`:

```js
const CATEGORIES = [
  { id: "croissant", name: "Croissant", manual: 4, calc: 3 },
  // ... 8 Gruppen insgesamt (Croissant, Baguette, Süßes, Laugengebäck,
  //     Brot, Brötchen, Snacks, keine Gruppe)
];

const PRODUCTS = [
  // ca. 30 Einträge, gemischt aus:
  {
    id, plu, name, brand: "E"|"H"|"A"|"O",
    cat: "<categoryId>",
    origin: "manual" | "rule",
    // für manual:
    by: "M. Keller", since: "2026-04-14",
    // für rule:
    ruleId: "rule-brand-e", hint: "Durch Regel ausgefiltert; …"
  }
];

const RULES = {
  "rule-brand-e":      { name, kind: "Marken-Regel",  short, letter: "E" },
  "rule-cat-baguette": { name, kind: "Gruppen-Regel", short, letter: "G" },
  // ...
};

const BRAND_LABELS = { E: "Edeka", H: "Harry", A: "Aryzta", O: "Eigene" };
window.HubData = { CATEGORIES, PRODUCTS, RULES, BRAND_LABELS };
```

**Wichtig:** Keine deutschen „Gänsefüßchen" in JS-Strings (bricht die Syntax wenn sie mit `"..."` kombiniert werden). Stattdessen einfache Anführungszeichen benutzen oder im String weglassen.

---

## 5. Shared-Komponenten (shared.jsx)

Jede Komponente wird am Ende mit `Object.assign(window, {...})` global exportiert — Babel-Scripts teilen sonst keinen Scope.

- **`Icon`** — Lucide-ähnliche Inline-SVGs: Search, EyeOff, Eye, ChevronLeft/Right/Down, Check, Crown, Info, Hand, Filter, Swap, Trash, More, X, Plus.
- **`BreadThumb({ cat, size })`** — Platzhalter-SVG pro Kategorie (curve = Croissant, bar = Baguette, dome = Süßes, pretzel = Laugen, loaf = Brot, round = Brötchen, square = Snacks). Je Kategorie eine andere Farbe + Form.
- **`BBadge({ brand, pill, label })`** — 22×22 Buchstaben-Badge (E/H/A/O) oder Pill-Variante mit Label.
- **`OriginChip({ kind })`** — „Manuell" (grauer Chip mit Hand-Icon) oder „Regel" (violett mit Filter-Icon).
- **`RuleChip({ ruleId, onOpen })`** — klickbarer Chip mit kleinem quadratischen Buchstaben-Dot plus Kurzname.
- **`CheckBox({ checked, onChange })`** — 18×18 quadratisch, blau wenn gesetzt, Check-Icon innen.
- **`TopBar`** — Fier-Hub-Kopfzeile: Zurück-Pfeil, Logo (`of` auf dunklem Hintergrund), Name + Sub, rechts Super-Admin-Amber-Pill + Avatar „JA".
- **`PageHeader({ title, sub, right })`** — grauer Strich links, EyeOff-Icon neben Titel, Subtitle, Actions rechts.
- **`BrandSeg` / `BrandChips`** — zwei Stile für den Markenfilter (Pill-Segment oder Chips mit Zählern).
- **`SearchField({ value, onChange, placeholder })`** — mit Lupe links, X-Reset rechts.
- **`CategoryTile({ cat, count, active, onClick })`** — 48px Thumb + Name + Zähler; aktive mit blauem Ring.
- **`BulkBar({ count, onClear, actions })`** — sticky, dunkel (`var(--n-800)`), blauer Count-Badge, Trenner, dann kontextspezifische Actions; erscheint nur wenn `count > 0`.

---

## 6. Die drei Varianten

**Alle Varianten teilen:** `<TopBar>`, `<PageHeader>`, Marken-Filter, Such-Feld, Kategorie-Filter, Bulk-Toolbar, Produktzeilen mit gleichen Feldern. Sie unterscheiden sich nur in **Layout & Informationsarchitektur**.

### Variante A — Tabs „Manuell / Regel" (variant-a.jsx)

- State: `tab` (manual|rule), `brand`, `query`, `cat`, `selected` (Set), `expandedRule` (Set).
- Layout: Tabs oben, darunter Filterleiste (Suche + Brand-Chips), darunter 4-spaltiges Kachel-Grid für Warengruppen.
- **Manual-Tab:** flache Tabelle (`.a-row`) mit PLU, Thumb, Name+seit, Marke, Gruppe, „Ausgeblendet von", Actions.
- **Rule-Tab:** Accordion pro Regel — `rule-group-head` zum Aufklappen, darin dieselbe Tabellenstruktur mit Hinweis-Spalte.
- Bulk-Aktionen sind **tab-abhängig** (im Regel-Tab gibt es „Trotz Regel anzeigen" + „Regel bearbeiten").

### Variante B — Ein Stream mit Herkunfts-Chip (variant-b.jsx)

- Keine Tabs. Alle Produkte in **einer** Liste (`.stream-row`, 7-spaltiges Grid).
- Oben: Suche, dann Origin-Chips (`Alle / Manuell / Regel`), Trenner, Brand-Chips.
- Warengruppen als **horizontal scrollender Chip-Strip** (keine Kacheln).
- Pro Zeile: Checkbox, Thumb, PLU, Name (+ Sub: „ausgeblendet von X" ODER Regel-Hint), **Herkunfts-Chip** (Manuell-Chip oder anklickbarer Regel-Chip), Marke+Gruppe, Actions.

### Variante C — Profi-Tabelle (variant-c.jsx)

- Layout: **Sidebar links (232 px)** + Main.
- Sidebar hat 4 Sektionen: Suche, Herkunft (alle/manuell/regel mit Zählern), Marke, Warengruppe.
- Main: kleine Meta-Leiste mit Gesamtanzahl + „N Filter zurücksetzen", dann dichte 9-spaltige Tabelle (`.dense-row`, 12.5px Text).
- **Sortierbare Spaltenköpfe** (PLU, Artikel, Gruppe, Herkunft) via `SortHead`-Komponente.
- Kompakt per Default (`density2 = "compact"`).

---

## 7. Host-Datei (Ausgeblendete Produkte.html)

```html
<!doctype html><html lang="de"><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=1400">
  <title>Ausgeblendete Produkte — Design-Exploration</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <!-- React 18.3.1 + Babel 7.29.0 mit PINNED Integrity-Hashes (siehe Projekt-Vorlage) -->
</head>
<body>
  <div id="root"></div>
  <script src="data.js"></script>
  <script type="text/babel" src="shared.jsx"></script>
  <script type="text/babel" src="variant-a.jsx"></script>
  <script type="text/babel" src="variant-b.jsx"></script>
  <script type="text/babel" src="variant-c.jsx"></script>
  <script type="text/babel" src="design-canvas.jsx"></script>
  <script type="text/babel" src="tweaks-panel.jsx"></script>
  <script type="text/babel">
    const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
      "density": "normal", "dark": false, "showLabels": true
    }/*EDITMODE-END*/;

    function App() {
      const [tweaks, setTweaks] = useTweaks(TWEAK_DEFAULTS);
      React.useEffect(() => {
        document.documentElement.setAttribute("data-theme", tweaks.dark ? "dark" : "light");
        document.body.style.background = tweaks.dark ? "#0a0b0d" : "#f0eee9";
      }, [tweaks.dark]);
      return (<>
        <DesignCanvas title="Ausgeblendete Produkte (Backshop)" subtitle="Drei Richtungen für die Super-Admin-Ansicht">
          <DCSection id="variants" title="Design-Varianten">
            <DCArtboard id="variant-a" label="A · Tabs" width={1280} height={1600}>
              <VariantA density2={tweaks.density} />
            </DCArtboard>
            <DCArtboard id="variant-b" label="B · Ein Stream" width={1280} height={1600}>
              <VariantB density2={tweaks.density} />
            </DCArtboard>
            <DCArtboard id="variant-c" label="C · Profi-Tabelle" width={1480} height={1600}>
              <VariantC density2={tweaks.density} />
            </DCArtboard>
          </DCSection>
          <DCSection id="notes" title="Design-Notizen">
            {/* 4 kleine DCArtboards als farbige Post-its (gelb/blau/grün/lila) */}
          </DCSection>
        </DesignCanvas>
        <TweaksPanel title="Tweaks">
          <TweakSection title="Ansicht">
            <TweakRadio label="Dichte" value={tweaks.density}
              onChange={(v) => setTweaks({ density: v })}
              options={[{value:"roomy",label:"Luftig"},{value:"normal",label:"Normal"},{value:"compact",label:"Kompakt"}]} />
            <TweakToggle label="Dark Mode" value={tweaks.dark} onChange={(v) => setTweaks({ dark: v })} />
          </TweakSection>
        </TweaksPanel>
      </>);
    }
    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  </script>
</body></html>
```

**Zwei Starter-Komponenten kopieren** (nicht selbst schreiben):
1. `design-canvas.jsx` — liefert `DesignCanvas`, `DCSection`, `DCArtboard`, `DCPostIt` (Achtung: großes „I").
2. `tweaks-panel.jsx` — liefert `TweaksPanel`, `useTweaks`, `TweakSection`, `TweakRadio`, `TweakToggle` etc.

---

## 8. Design-Prinzipien, die quer durch alles gelten

1. **Marken bleiben abstrakt** — Buchstaben-Badges (E/H/A/O) mit eigenem Farbsystem, **nie** echte Markenlogos/-farben.
2. **Bulk first** — jede Variante hat Mehrfachauswahl + schwebende Bulk-Toolbar. Die Actions in der Toolbar sind kontextabhängig (Manuell vs. Regel).
3. **Regel-Ursache sichtbar** — überall, wo ein Produkt wegen einer Regel fehlt, zeigt ein klickbarer `RuleChip` kompakt an, welche Regel greift.
4. **Warengruppen konsistent als Filter** — in A als Kachel-Grid, in B als Chip-Strip, in C als Sidebar-Liste. Klick toggled immer die gleiche Logik.
5. **Ein Design-System, drei Layouts** — alle drei Varianten benutzen dieselben CSS-Variablen und Komponenten aus `shared.jsx`. Wer den Stil ändern will, ändert nur `styles.css`.
6. **Tweaks sparsam** — Dichte + Dark Mode. Mehr Tweaks nicht aufdrängen.
7. **Keine Fake-Metriken, keine Icon-Overkill** — Dichte entsteht durch Struktur, nicht durch Dekor.

---

## 9. Häufige Stolpersteine

- **Script-Scope:** Jedes `<script type="text/babel">` hat eigenen Scope. Alle wiederverwendeten Komponenten **müssen** am Ende ihrer Datei mit `Object.assign(window, {...})` global gemacht werden.
- **Style-Objekte:** Keine globalen `const styles = {...}` — immer komponenten-spezifische Namen (`variantAStyles`) oder inline stylen.
- **JSX-Strings mit deutschen Anführungszeichen:** doppelte `"` in JS-Strings escapen oder durch einfache `'` ersetzen. „..." in JSX-Text ist okay.
- **Integrity-Hashes** für React + Babel nicht weglassen oder ändern — die exakten Versionen (18.3.1 / 7.29.0) sind Pflicht.
- **DCPostIt** hat ein großes „I" (nicht `DCPostit`). Braucht absolute Position (`top`/`left`/…). Für Notizen in Sektionen lieber normale `DCArtboards` mit farbigen Hintergründen nehmen.

---

Das ist alles. Wer diese Anweisung befolgt, bekommt exakt das gleiche Ergebnis: drei saubere Varianten auf einem Canvas, mit Dark Mode und Dichte-Schalter.

---

## 10. Wichtig: Lesart B — „Alle heutigen Funktionen behalten"

Dieser Prototyp ist ein **Design-Nachbau**, kein Funktions-Ersatz. Beim Übertrag in die echte App (`BackshopHiddenProductsPage.tsx`) gilt:

- **Nur Layout, Komponenten und Tokens übernehmen**, nicht die Mock-Daten.
- **Alle existierenden Hooks, RPCs und Dialoge bleiben** — `useBackshopHiddenItems`, Regel-Liste über Sichtbarkeits-Diff, Blöcke, Quell-Segmente, Dialoge, Find-in-Page, Carryover, Line-Visibility-Overrides, etc.
- **Mock → echt Mapping:**
  - `brand: "E"|"H"|"A"|"O"` → echte Quellen `master / custom / unknown` + `BACKSHOP_SOURCES` (Buchstabe + Farbe aus der Palette in `styles.css` übernehmen, Benennung aus der App).
  - `origin: "manual"|"rule"` → wie bereits im Code getrennt (manuelle Ausblendliste vs. berechnete Diff-Liste).
  - `ruleId` → existierende Regel-ID aus der Sichtbarkeitslogik.
  - Bulk-Aktionen („In Hauptliste anzeigen", „Regel bearbeiten", „Marken wählen") → an existierende Dialoge/Rechte binden; wenn eine Aktion aktuell nicht existiert, weglassen statt mocken.
  - Sortieren, Filter-Reset, Export → nur aktivieren, wenn der gleiche State in React/URL schon vorhanden ist.
- **Rollen-Frage klären:** Zeigt die App eine gewählte Variante pro Nutzer, oder bleibt Variante A/B/C ein Super-Admin-Preview? Empfehlung: **eine Variante festlegen** (A oder C sind Produktions-Kandidaten), andere nur im Prototyp lassen.
- **Design-Tokens:** `styles.css` als Quelle für Farben/Radii/Shadows, aber in die bestehende Token-Struktur (shadcn `index.css`) mergen — **nicht parallel laufen lassen**.

**Faustregel:** Das neue Design ersetzt nur das Layout und die visuelle Schicht. Jede Datenquelle, jeder Button-Handler und jeder Dialog bleibt wie er ist — er bekommt nur neue Klassen/JSX drumherum.

