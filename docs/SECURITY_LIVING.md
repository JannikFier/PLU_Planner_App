# PLU Planner – Sicherheit (lebendes Dokument)

**Wozu diese Datei?** Sie ist unser **Sicherheits-Notizbuch**: Branchenwissen in einfacher Sprache, **Checklisten**, **offene Entscheidungen** mit dem Inhaber – nicht jede theoretische Verbesserung wird sofort gebaut. Technische Details zum aktuellen Stand der App bleiben in [SECURITY_REVIEW.md](SECURITY_REVIEW.md).

**Was sie nicht ersetzt:** Ein professionelles Penetrationstest- oder Audit-Gutachten.

---

## 1. Kurz zum Vorlesen (30 Sekunden)

> Wir sichern die App **schichtweise** ab: Login, Rollen, Datenbankregeln und serverseitige Funktionen. Sicherheit braucht **Routine** – neue Features können neue Risiken bringen. Hier notieren wir, was wir wissen, was wir prüfen und was wir bewusst so lassen.

---

## 2. Welche Doku wofür? (Übersicht ohne Doppelungen)

| Datei | Inhalt |
|--------|--------|
| **SECURITY_LIVING.md** (hier) | Wissen, Prozess, Fragen, Checklisten, Branchenlage |
| [SECURITY_REVIEW.md](SECURITY_REVIEW.md) | Konkreter Stand: Was ist abgesichert, historische Fixes |
| [RLS_SECURITY_REVIEW_021_035.md](RLS_SECURITY_REVIEW_021_035.md) | Tiefenreview älterer Multi-Tenancy-Migrationen |
| [ROLES_AND_PERMISSIONS.md](ROLES_AND_PERMISSIONS.md) | Rechte-Matrix, fachliche Regeln |
| [DATABASE.md](DATABASE.md) | Tabellen, Schema; bei neuen Migrationen mitpflegen |

**Regel:** Nicht denselben Langtext an zwei Stellen pflegen – verlinken.

---

## 3. Grundprinzipien (für jede Web-App)

### 3.1 Verteidigung in mehreren Schichten („Defense in Depth“)

Wenn **eine** Schicht versagt (z. B. ein versteckter Menüpunkt), soll die nächste noch schützen. Bei uns typisch:

1. **Frontend:** Nur bestimmte Routen/Buttons sichtbar – **kein** alleiniger Schutz.
2. **Supabase / PostgreSQL:** **Row Level Security (RLS)** – wer darf welche **Zeilen** sehen/ändern?
3. **Edge Functions:** Aktionen mit **Service Role** nur nach **JWT + Rollenprüfung**.

### 3.2 „Niemals dem Client vertrauen“

Alles, was im Browser läuft, kann der Nutzer manipulieren (Entwicklertools, gefälschte Requests). **Autoritative** Entscheidungen gehören in die **Datenbank (RLS)** oder **serverseitige** Funktionen mit klarer Prüfung.

**Super-Admin User-Vorschau:** Die simulierte Rolle (User/Viewer/Admin) wirkt in der **UI und im Routing**, nicht als Wechsel der JWT-Identität. **RLS und Profil-Rechte** bleiben die des eingeloggten Super-Admins. Die Vorschau dient dem **Bedien-Check**, nicht dem Test „ob ein echter Mitarbeiter-Account dieselben Daten sieht“.

### 3.3 Least Privilege (minimal nötige Rechte)

Jede Rolle und jede technische Identität (Anon-Key, Service Role) bekommt nur das **Minimum**, das sie braucht. Neue Tabellen: erst **RLS an**, dann Policies – nicht umgekehrt.

### 3.4 „Secure by default“

Neue Tabellen ohne Policies sind bei RLS oft **gar nicht erreichbar** (sicherer Default) – aber nur, wenn RLS wirklich aktiviert ist. Neue Schemas/Views nicht „aus Versehen“ öffentlich exponieren.

---

## 4. Typische Risikokategorien (OWASP-Umfeld, vereinfacht)

Die **OWASP Top 10** (Liste wird alle paar Jahre angepasst) beschreibt **Muster**, keine festen Software-Namen:

| Kategorie | In einfachen Worten | Bei uns typisch |
|-----------|------------------------|-----------------|
| **Zugriffskontrolle** | Daten für falsche Person/Markt sichtbar oder änderbar | RLS + `store_id` + Rollen |
| **Kryptografie** | Schwache Verschlüsselung, Secrets im Klartext | TLS (Hosting); Passwörter bei Supabase Auth |
| **Injection** | Eingaben werden als Code ausgeführt | Parametrisierte Queries über Client-API; Vorsicht bei **RPCs** und dynamischem SQL in DB-Funktionen |
| **Unsicheres Design** | Feature ohne Bedrohungsmodell gebaut | Multi-Tenancy und Rollen von Anfang an mitdenken |
| **Fehlkonfiguration** | Debug an, alles offen, Standardpasswörter | Kein Service-Key im Frontend; Prod-Settings |
| **Verwundbare Komponenten** | Alte Bibliotheken mit bekannten Lücken | `npm audit`, Updates mit Tests |
| **Auth-Fehler** | Session-Hijacking, schwache Passwort-Reset-Flows | Supabase Auth; Edge Functions prüfen Aufrufer |
| **Integrität (Software/Daten)** | Kompromittierte Pakete oder Builds | Supply Chain (Abschnitt 7) |
| **Logging/Monitoring** | Angriffe unbemerkt | Supabase-Logs, ungewöhnliche Nutzung |
| **SSRF** | Server lädt URLs nach (bei klassischen Server-Apps) | Bei reiner SPA + BaaS weniger zentral; Edge Functions bewusst halten |

**API-Sicherheit (Stichwort):** Auch ohne „klassische REST-API“ im eigenen Server gelten ähnliche Fragen: **Wer** darf welche **Supabase-Endpunkte** mit welchem **JWT** nutzen?

### 4.2 Was bei PLU Planner zählt (Geltung & Priorität)

Die Tabelle oben erklärt die **Begriffe aus der Branche**. Diese Matrix sagt **für unsere App** kurz, worauf wir uns **konzentrieren** – und was **weniger zentral** ist (trotzdem bei großen Änderungen im Hinterkopf behalten).

| Thema | Trifft auf uns zu? | Priorität | Kurznotiz |
|--------|---------------------|-----------|-----------|
| **Zugriffskontrolle (RLS, Rollen, `store_id`)** | Ja, immer | **Hoch** | Bei **jedem** neuen Feature / jeder neuen Tabelle: Policies und Markt-Isolation prüfen. |
| **Authentifizierung & Edge Functions** | Ja | **Hoch** | Login, JWT, User-Verwaltung nur mit geprüfter Rolle; siehe [SECURITY_REVIEW.md](SECURITY_REVIEW.md). |
| **Geheimnisse (Service Role, Passwörter)** | Ja | **Hoch** | Service Role nur serverseitig; nichts Kritisches ins Frontend oder ins Repo. |
| **Injection (SQL in DB-Funktionen, RPCs)** | Teilweise | **Mittel** | Client-Queries sind parametrisiert; **eigene** SQL-Funktionen und RPCs bei Änderungen mitdenken. |
| **XSS / unsicheres HTML** | Ja, grundsätzlich | **Mittel** | React standardmäßig hilfreich; kein unsicheres Einbinden von HTML mit Nutzerdaten. |
| **Fehlkonfiguration (Prod, Keys, offene Buckets)** | Ja | **Mittel** | Vercel/Supabase-Einstellungen; Storage-Policies wie Tabellen behandeln. |
| **Verwundbare npm-Pakete (Supply Chain)** | Ja | **Mittel** | Regelmäßig `npm audit`, Updates mit Tests. |
| **Logging / Auffälligkeiten** | Ja | **Mittel** | Supabase-Dashboard, ungewöhnliche Logins oder Last. |
| **SSRF (Server ruft URLs auf)** | Eher selten in unserem Setup | **Niedrig** | Reine **Vite-SPA** ohne eigenen App-Server; **Edge Functions** nur bewusst erweitern, falls sie externe URLs abrufen. |
| **React Server Components / RSC-CVEs** | Anders einzuordnen | **Niedrig** (für dieses Risiko) | Wir nutzen **keine** RSC wie Next.js; React-Patches trotzdem im üblichen Update-Rhythmus. |
| **Informationslecks (z. B. Enumeration)** | Punktuell | **Nach Bedarf** | Z. B. Personalnummer → E-Mail: bewusste Produktentscheidung; siehe [SECURITY_REVIEW.md](SECURITY_REVIEW.md). |

*Prioritäten bei neuen Releases oder Security-Reviews von oben nach unten abarbeiten – „Niedrig“ heißt nicht „ignorieren“, sondern **seltener** der Auslöser für konkrete Arbeit.*

---

## 5. Supabase & PostgreSQL – was man wissen sollte

### 5.1 Zwei Welten: Anon-Key vs. Service Role

- **Anon-Key** liegt im Frontend (bei Vite: `VITE_*`). Er ist **öffentlich** gedacht – Sicherheit kommt durch **RLS** und **Auth (JWT)**.
- **Service Role Key** umgeht RLS – **nur** serverseitig (bei uns: **Edge Functions**), niemals in Git oder im Browser-Bundle.

### 5.2 Row Level Security (RLS)

- Jede Policy ist wie ein **Filter** auf jede Abfrage.
- **`USING`:** welche Zeilen bei SELECT/DELETE sichtbar.
- **`WITH CHECK`:** was bei INSERT/UPDATE erlaubt ist.
- **`SECURITY DEFINER`-Funktionen:** mächtig – brauchen klare Absicherung (z. B. fester `search_path`, keine SQL-Injection in dynamischem SQL). Ältere Hinweise: [RLS_SECURITY_REVIEW_021_035.md](RLS_SECURITY_REVIEW_021_035.md).

### 5.3 Tests

Policies am besten mit dem **echten Client** (eingeloggte Testuser) testen – der **SQL-Editor** in Supabase umgeht oft RLS und täuscht falsche Sicherheit vor.

### 5.4 Storage (Dateien)

Buckets brauchen **eigene Policies** (wer darf lesen/hochladen/löschen?). Gleiches Prinzip wie bei Tabellen: nicht „öffentlich“, wenn nicht nötig.

---

## 6. Authentifizierung & Sitzungen (Kurz)

- **JWT** (bei Supabase): Enthält Identität und Claims; abgelaufen = neu anmelden bzw. Refresh.
- **Frontend schützt die UX** (Login-Seite); **Backend schützt die Daten** (RLS).
- **Passwort-Policy** und **Einmalpasswörter** sind Organisations- und Produktfragen – technisch über Supabase steuerbar.

---

## 7. Supply Chain & Abhängigkeiten (npm)

- **2025** wurden mehrfach **npm-Pakete** kompromittiert (z. B. über gekaperte Maintainer-Accounts, **Postinstall-Skripte**, Diebstahl von Entwickler-Tokens). Muster: hohe Download-Zahlen + ein verwundbarer Release.
- **Maßnahmen:** `package-lock.json` committen, `npm audit` ernst nehmen, Updates in einem kontrollierten Release-Zyklus mit Tests, bei großen Major-Upgrades Changelogs lesen.

---

## 8. Frontend (React / Vite SPA)

### 8.1 XSS (Cross-Site Scripting)

Wenn fremder Text als **HTML/Script** in die Seite gerät, kann Schadcode laufen. React escaped standardmäßig; **`dangerouslySetInnerHTML`** vermeiden. Unsere Codebase nutzt im `src/` kein `dangerouslySetInnerHTML` (Stand letzter Scan).

### 8.2 React Server Components / „React2Shell“ (CVE-2025-55182 u. ä.)

Kritische Meldungen betrafen vor allem **React Server Components** und Frameworks wie **Next.js** in bestimmten 19.x-Linien. **Unsere App** ist eine **Vite-SPA** ohne RSC – das **Risikoprofil** ist anders als bei einem RSC-Server. Trotzdem: **React** und **react-router-dom** bei Sicherheits-Advisories auf **gepatchte** Versionen der Release-Linie halten.

### 8.3 React Router (CVE-2025-59057)

Betraf u. a. **Framework Mode** / bestimmte Meta-APIs mit SSR – typische **Browser-Router**-SPAs oft anders betroffen. Bei Updates trotzdem Release Notes lesen.

### 8.4 CSRF und SPAs

Klassisches CSRF betrifft Cookie-Sessions bei formularbasierten Sites. **Supabase JS** nutzt typischerweise **Authorization-Header** mit JWT – anderes Modell; trotzdem: keine Secrets in URLs loggen.

---

## 9. Multi-Tenancy (Märkte)

- Daten müssen **logisch getrennt** sein (`store_id`, Zugriffsrechte).
- **Fehlerquelle:** Hook filtert, aber RLS erlaubt noch mehr – dann wäre die DB die **ehrliche** Grenze. Neue Features: immer **RLS** mitdenken.

---

## 10. Branchenvorfälle – was man daraus lernt (ohne Panik)

- **Hardcoded Keys im Client + RLS aus:** In Post-Mortems taucht immer wieder auf: **Geheimnisse** im ausgelieferten JavaScript und **fehlende** Datenbankregeln führen zu massiven Lecks. **Bei uns:** nur Anon-Key im Client; sensible Operationen über RLS + Functions.
- **Supply-Chain:** siehe Abschnitt 7.

---

## 11. Projekt – dokumentierter Stand & neuere Migrationen

Die ausführliche Liste steht in [SECURITY_REVIEW.md](SECURITY_REVIEW.md). Ergänzend: Ab **Migration 050** u. a. Zentral-Angebote, lokale Preise, Layout-Overrides – bei Security-Reviews **Policies und Rollen** wie bei bestehenden Tabellen prüfen; Details in `supabase/migrations/` und [DATABASE.md](DATABASE.md).

---

## 12. Gute Fragen (für dich oder vor einem Release)

1. Was ist die **wertvollste** Information – und wer darf sie **wirklich** sehen?
2. Gibt es einen Weg, **ohne Login** oder **als falscher Markt** an Daten zu kommen?
3. Ist der Schutz in der **Datenbank** nachvollziehbar, nicht nur im Menü versteckt?
4. Sind neue Tabellen/RPCs mit **RLS** bzw. expliziten Rechten abgedeckt?
5. Was ist ein **bewusst akzeptiertes** Restrisiko (z. B. UX) – und bis wann gilt das?

---

## 13. Checkliste (wiederkehrend)

- [ ] `npm audit` angesehen; Kritisches eingeplant
- [ ] Supabase: auffällige Auth- oder API-Muster
- [ ] Keine Secrets im Repo; Service Role nur serverseitig
- [ ] Neue Migrationen: RLS/Policies und Rollenmatrix
- [ ] Storage-Buckets geprüft, falls neue Buckets

---

## 14. Offene Entscheidungen mit Inhaber

| Thema | Risiko (geschätzt) | Optionen | Entscheidung | Datum |
|--------|---------------------|----------|--------------|--------|
| *z. B. Personalnummer → E-Mail (anon RPC)* | niedrig–mittel | so lassen / umbauen / drosseln | *offen* | |

---

## 15. Änderungsprotokoll

| Datum | Notiz |
|--------|--------|
| 2026-03-31 | Erste Ausarbeitung: erweitertes Sicherheitswissen, Verweise, Prozess; Verlinkung aus README und Projektübersicht |
| 2026-03-31 | Abschnitt 4.2: Geltungs- und Prioritätsmatrix „Was bei PLU Planner zählt“ |

**Nächste geplante Prüfung:** *Datum eintragen*
