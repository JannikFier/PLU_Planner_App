# Tutorial Writing Guide – Fier-Stimme & Texte

Dieses Dokument bündelt die Schreibregeln für das app-weite Tutorial.
Ziel: Wenig Text, viel Handeln. Fier erklärt **kurz** und zeigt dann, wo man selbst dranklicken soll.

---

## Stimme und Haltung

- **Persönlich, aber professionell.** Du-Form, keine Floskeln.
- **Fier spricht in Ich-Form**, wenn es natürlich wirkt: „Fier: Ich zeige dir…".
- **Imperativ vor Beschreibung:** „Klicke …", „Öffne …", „Wähle …".
- **Kein Marketing-Sprech.** Keine „einmaligen" oder „grandiosen" Funktionen.
- **Jargon vermeiden.** Begriffe der App benutzen (Masterliste, Marken-Auswahl, Warengruppen), keine IT-Vokabeln.

## Richtwerte

| Feld          | Max. Zeichen | Empfehlung                              |
| ------------- | ------------ | --------------------------------------- |
| Headline      | **80**       | 4–6 Wörter, Substantiv-lastig           |
| Body          | **140**      | 1 Satz, optional 1 kurzer Zusatz        |
| Task-Step     | **200**      | Action → Nutzen → Notbremse (falls nötig) |
| Closing-Body  | **200**      | Einmal kurz danke sagen                 |

Die CI warnt bei Überschreitung (nicht-blockierend) in Phase 4.

## Aufbau eines Moduls

1. **Kontext setzen** (1 Satz, Driver-Popover): „Das ist die Masterliste."
2. **Eine Aktion** (Coach-Task): „Öffne Eigene Produkte."
3. **Rückweg** (Task mit `validate`): „Zurück zur Masterliste."
4. **Max 5–7 Schritte** pro Modul. Lieber aufteilen.

## Gute vs. schlechte Beispiele

### Headline

- ✅ „Wähle einen Bereich"
- ✅ „Obst- und Gemüse-Liste"
- ❌ „In diesem Schritt zeige ich dir, wie du…" (gehört in den Body, nicht in die Headline)

### Body

- ✅ „Die Toolbar rechts bündelt eigene Produkte, Ausgeblendete, Werbung, Umbenennen und PDF."
- ✅ „Klicke oben rechts auf dein Profilbild."
- ❌ „Hier kannst du nun eine Vielzahl an Möglichkeiten entdecken, um deine Liste optimal zu strukturieren." (kein Nutzen, kein Imperativ)

### Aktions-Schritt

- ✅ „Wähle „Testmodus starten". Im Testmodus bleiben Änderungen lokal."
- ❌ „Für den weiteren Verlauf ist es essenziell, dass du nun in den Testmodus wechselst, damit wir keine Daten versehentlich verändern." (zu lang, zu förmlich)

## Tonalität pro Situation

| Situation                 | Fier-Stimme                                                    |
| ------------------------- | -------------------------------------------------------------- |
| Begrüßung                 | „Hi, ich bin Fier. 4 Minuten für eine kurze Runde?"            |
| Aktion fordern            | „Klicke oben rechts auf dein Profilbild."                      |
| Erfolg / Zwischen-Lob     | „Super, das sitzt."                                            |
| Pause                     | „Tour pausiert – du kannst jederzeit über das Icon fortsetzen." |
| Abschluss                 | „Gut gemacht. Über die Glocke bleibst du informiert."          |
| Kein Zugriff              | „Dieser Bereich ist für deinen Markt nicht freigeschaltet."    |

## Reviewer-Checkliste

Vor dem Merge eines Curriculum-Patches prüfen:

- [ ] Headline ≤ 80 Zeichen? Imperativ oder Substantiv?
- [ ] Body ≤ 140 Zeichen? Genau ein Gedanke?
- [ ] Mindestens **eine echte Aktion** im Modul (`validate`, nicht nur „Weiter")?
- [ ] `fierKey` passt zur Situation (kein „hero" als Füller)?
- [ ] `nearSelector` existiert (Validator-Script grün)?
- [ ] Keine Jargon-Abkürzungen, keine Admin-Texte im User-Curriculum?
- [ ] Kein „ich zeige dir jetzt" – direkt den Nutzen nennen.
- [ ] Schlusssatz eines Moduls führt zurück zum Dashboard oder zum nächsten Kontext.

## Rollen-Anpassung

- **Viewer:** Nur Erklärschritte, keine schreibenden Aktionen. Fier erklärt, was *man sieht*, nicht, was man tun soll.
- **User:** Echte Interaktionen im Testmodus (Produkt auswählen, Dialog öffnen/schließen).
- **Admin:** Zusätzliche Konfigurations-Module (Layout, Regeln, Warengruppen).
- **Super-Admin (nur User-Vorschau):** Tutorial verhält sich wie für User/Admin der gewählten Rolle.

## Pose-Leitfaden (`fierKey`)

| Situation              | Pose          |
| ---------------------- | ------------- |
| Begrüßung              | `welcome`     |
| Kontext erklären       | `stand`       |
| Auf Element zeigen     | `point`, `pup`, `pdown`, `pright` |
| Über etwas nachdenken  | `think`       |
| Neue Idee / Tipp       | `idea`        |
| Warnung / Hinweis      | `alert`       |
| Fehler / Sackgasse     | `oops`        |
| Erfolg feiern          | `cheer`, `success` |
| Datensicht / Analyse   | `data`        |
| Übergang / Weg zurück  | `walk`        |
| Abschluss              | `goal`, `cheer` |

Keine zwei aufeinanderfolgenden Steps mit identischer Pose – sonst wirkt Fier statisch.

## Lokalisierung

Texte sind deutsch. Für zukünftige Übersetzungen:

- Satzzeichen (Typographie) bewusst setzen – deutsche Anführungszeichen (" "), Geviertstrich (–), niemals `--`.
- Platzhalter (`{n}`, `{m}`) nur dort, wo der Validator die Position prüfen kann (Statusband, Zähler).
