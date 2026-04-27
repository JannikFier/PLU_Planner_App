# HTML-Prototyp „Warengruppen“

Eigenständiger statischer Prototyp (React 18 + Babel-Standalone) ohne Anbindung an die produktive App unter `src/`.

## Start

Im Projektroot:

```bash
npx serve prototypes/backshop-warengruppen-html
```

Dann im Browser `http://localhost:3000/Warengruppen.html` öffnen (Port kann von `serve` abweichen).

**Hinweis:** Nicht über `file://` öffnen — externe Babel-`src`-Skripte (`*.jsx`) werden vom Browser oft blockiert.

## Tweaks / Edit-Mode

Unten rechts erscheint das Panel, wenn das Host-Fenster eine der folgenden Nachrichten sendet:

- `postMessage('__activate_edit_mode', '*')` (String, abwärtskompatibel)
- `postMessage({ type: '__activate_edit_mode' }, '*')` (Objekt laut Spez)

Inhalt: Mobile-Konzept A/B/C, Rationale-Karten ein/aus. Standardwerte aus `/*EDITMODE-BEGIN*/…/*EDITMODE-END*/` im Boot-Skript in `Warengruppen.html`.

## Verhalten

- Toast-Dauer für Zuordnungen: ca. **5 Sekunden** mit „Rückgängig“ und Schließen.
- Design-Canvas: Zoom (Mausrad), Schwenken auf freier Fläche oder Alt+Ziehen; Artboards per **„::“-Griff** verschieben; **Klick auf die Artboard-Überschrift** öffnet Fokus-Ansicht (Schließen-Button).

## Dateien

| Datei | Rolle |
|--------|--------|
| `Warengruppen.html` | React/Babel, Design-Canvas, Tweaks, Boot |
| `data.js` | `window.WG_DATA` / `window.WGPROT_DATA` |
| `tokens.js` | `window.WG_TOKENS`, `wgInjectGlobalStyles()`, `wgRegisterProtoIcons()` → `window.WG_ICONS` |
| `store.jsx` | `WGProvider` / `useWG` |
| `ui.jsx` | `window.WG_UI` |
| `tablet-app.jsx` | Desktop/iPad, `WgEmbeddedWorkbench` mit `variant` |
| `mobile-app.jsx` | iPhone A/B/C |
