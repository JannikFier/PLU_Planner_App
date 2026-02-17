# Offene Punkte und Verbesserungen

Diese Datei listet bekannte Issues und Verbesserungsideen für spätere Sprints.

---

## Offen / Nächste Session

### Render-Problem: PLU-Tabelle erscheint erst nach Klick/Focus

**Status:** Deutlich verbessert (Prefetch-Waterfall behoben + Visibility-API)

**Problem:** Nach Reload und Klick auf Masterliste dauerte es teils ~7+ Sekunden, bis die PLU-Tabelle sichtbar war.

**Mögliche Ursachen:**
- Browser-Throttling in Hintergrund-Tabs (requestAnimationFrame wird nicht aufgerufen)
- Cursor Simple Browser / eingebettete Browser haben anderes Verhalten
- React-Batch-Updates werden erst bei User-Interaktion geflusht

**Bereits umgesetzt:**
- **Prefetch-Waterfall entfernt:** plu-items wird gestartet, sobald version/active **oder** versions fertig ist (nicht erst nach version/active). Deutlich schnellere Anzeige nach Reload + Klick auf Masterliste (Log-Messung: von ~7,7 s auf unter 1 s).
- AuthPrefetch: Prefetch startet bei Auth (nicht erst beim Dashboard)
- Page Visibility API: Re-Render bei `visibilitychange` → `visible`
- Super-Admin landet standardmäßig auf Dashboard (Login, Root, Home); von dort Karte „Masterliste“

**Falls Problem fortbesteht – nächste Schritte:**
1. Mit Debug-Logs prüfen: Wann ist `showTable: true` im State vs. wann malt der Browser?
2. `requestAnimationFrame`-Loop testen, um Paint zu erzwingen
3. Prüfen ob Cursor-Browser vs. externer Chrome unterschiedliches Verhalten zeigt
4. React DevTools Profiler: Werden Komponenten neu gerendert, aber nicht gepaintet?

---

## Erledigt (Referenz)

- Suchfunktion zum Ausblenden auf Masterliste
- Prefetch für MasterList/Layout
- AuthPrefetch beim App-Start
- Visibility-API für Tab-Focus
- Super-Admin Standard-Ansicht: Dashboard (Pfeil zurück führt zum Dashboard; Masterliste über Karte)
