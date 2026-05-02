# Stufe 5 – M0 (Messung & Go/No-Go) vor Produktions-Virtualisierung

Dieses Dokument ist die **formale Schwelle** vor Beginn der Pakete **5.1–5.8** in [REFACTOR_STUFE_5_AGENT_PLAN.md](REFACTOR_STUFE_5_AGENT_PLAN.md). **Kein** Virtualisierungs-Code in der PLU-Hauptliste ohne erfülltes M0.

**Abgrenzung zu Stufe 4:** Ein „abgeschlossener“ Stufe‑4‑Plan ([REFACTOR_ROADMAP_STUFEN.md](REFACTOR_ROADMAP_STUFEN.md)) ist **keine** Voraussetzung für M0 und **kein** automatisches Startsignal für Stufe 5. Virtualisierung folgt nur **messbarem Bedarf + dieser Checkliste + Go**. Umgekehrt: Ohne erfülltes M0 werden die Pakete **5.1ff.** nicht begonnen.

## Checkliste M0

1. **Problemhypothese:** DOM-/Scroll-Lag oder hohe CPU bei typischen Listengrößen (Markt + Version) reproduzierbar?
2. **Messung:** Browser-Profiler (Rendering, Scripting), ggf. Performance-Panel; dokumentierte Schritte (URL, Rolle, Listengröße).
3. **Risikoabgleich:** [VIRTUALISIERUNG_SPIKE.md](VIRTUALISIERUNG_SPIKE.md) – Find-in-Page, Kiosk, E2E-Matrix bewusst geprüft.
4. **Flag-Strategie:** Wie wird virtuell/nicht-virtuell geschaltet (z. B. Env/Feature-Flag laut Stufe‑5‑Plan 5.0)?
5. **Go/No-Go:** Entscheidung dokumentiert (Datum, wer); bei **No-Go** keine Umsetzung von 5.1ff.

Nach **Go** strikt **5.0 → 5.1 → … → 5.8** laut Agent-Plan; **nicht** parallel zu großen Stufe‑4-Refactors an derselben Listen-Komponente.
