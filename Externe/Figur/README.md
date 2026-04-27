# Maskottchen „Vier“ – Design-Quellen

Dieser Ordner enthält **HTML/React-JSX-Prototypen** für Vier (Cartoon-4), unabhängig von der produktiven App unter `src/components/tutorial/`.

## Wichtige Dateien

| Datei | Zweck |
|--------|--------|
| `mascot-library.jsx` | Große **Situationsbibliothek** (Posen, Requisiten, Tutorial-/Inline-/State-Karten). |
| `mascot-cartoon-v4.jsx` | Basis-Körper / Augen / Arme – wird von der Library importiert (Babel-HTML-Setup). |
| `Mascot - Vier Library.html` | **Übersichtskarten** aller Situationen im Browser öffnen (lokal, mit `npx serve` oder direkt aus dem Dateisystem je nach Browser-Sicherheit). |
| `Mascot - Vier v4.html` | Einzelvorschau. |
| `design-canvas.jsx`, `context-*.jsx` | Hilfsdateien für die HTML-Demos. |
| `PLU_PLANNER_Handbuch.pdf` | Produkt-Handbuch (nicht nur Figur). |

## App-Portierung

Die gebaute App nutzt [`src/components/tutorial/VierMascot.tsx`](../../src/components/tutorial/VierMascot.tsx) und [`src/lib/tutorial-vier-presets.ts`](../../src/lib/tutorial-vier-presets.ts), um **stabile Keys** aus der Design-Library auf verfügbare SVG-Posen zu mappen.

## Pflege

Neue Posen zuerst in `mascot-library.jsx` / HTML prüfen, dann Presets und ggf. `VierMascot` in der App erweitern.

Siehe auch [`SITUATIONS.md`](SITUATIONS.md) und [`docs/TUTORIAL_CURRICULUM.md`](../../docs/TUTORIAL_CURRICULUM.md).
