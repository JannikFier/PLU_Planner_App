# Deployment: Domains, Markt-Subdomains und Kassen-QR (Vercel)

Diese Anleitung setzt das Zielbild **„jeder Markt eigene Subdomain, QR führt zur Kasse“** in der Produktion um. Die App-Logik ist bereits vorhanden ([`buildKioskEntranceUrl`](../src/lib/kiosk-entrance-url.ts)); es geht um **Vercel**, **DNS**, **Build-Variable**, **Stammdaten** und **Supabase Auth**.

---

## Vercel: Schritt für Schritt (wirklich jeden Klick)

Ersetze in den Beispielen **`deine-domain.de`** durch deine echte Domain (z. B. die du bei Vercel gekauft hast, ohne `www`, wenn deine Markt-URLs so aussehen sollen: `angerbogen.deine-domain.de`).

### Teil A – Variable setzen, damit der QR nicht mehr `localhost` zeigt

1. Im Browser **`https://vercel.com`** öffnen und **einloggen** (gleiches Konto wie für das Projekt).
2. Oben auf **„Dashboard“** (falls du nicht schon dort bist).
3. **Falls du mehrere Teams hast:** Oben links oder in der Leiste das **Team** auswählen, in dem das Projekt liegt.
4. In der Liste **auf die Kachel deines Projekts** klicken (der Name eurer PLU-Planner-App / wie das Repo in Vercel heißt).
5. Oben in der **Projekt-Leiste** den Reiter **„Settings“** anklicken (nicht „Overview“ oder „Deployments“).
6. **Links** in der Unternavigation runterscrollen und **„Environment Variables“** anklicken.
7. Button **„Add Environment Variable“** (oder **„Add“** / **„Create“**) klicken.
8. **Name (Key):** exakt so eintragen: `VITE_APP_DOMAIN`  
   **Value:** nur deine Basis-Domain, z. B. `deine-domain.de`  
   - **Kein** `https://` davor.  
   - **Kein** `/` am Ende.  
   - **Kein** `www.` – außer deine gesamte Strategie baut wirklich auf `www.deine-domain.de` als Basis (dann müsstest du das mit den Markt-Hosts abstimmen; Standard ist Apex ohne `www`).
9. Unten bei **„Environments“** / **„Environment“** sicherstellen: **Production** ist angehakt (mindestens das). Preview nur anhaken, wenn du auch Preview-Deployments mit derselben Logik testen willst.
10. **Save** / **Speichern** klicken.

**Wichtig:** Die Variable steckt erst im **nächsten** Build. Ohne neuen Build ändert sich der QR-Link in der live App nicht.

11. Oben wieder den Reiter **„Deployments“** anklicken.
12. Den **obersten** Eintrag in der Liste nehmen, der **„Production“** ist (nicht „Preview“, falls mehrere da stehen).
13. Rechts bei dieser Zeile auf die **drei Punkte** **„⋯“** klicken.
14. **„Redeploy“** wählen.
15. Im Dialog **bestätigen** (ggf. Häkchen „Use existing Build Cache“ **aus** lassen, damit wirklich frisch mit den neuen Variablen gebaut wird – bei Vercel heißt die Option sinngemäß „bestehenden Build-Cache verwenden“; für sicher lieber **ohne** Cache einmal neu bauen).
16. Warten, bis der Deploy **grün / „Ready“** ist (ein bis zwei Minuten).

**Kontrolle:** App im Browser unter eurer normalen Adresse öffnen → als Admin **„Administration → Kassenmodus“** → der angezeigte Link sollte mit **`https://`** und **`deine-domain.de`** (bzw. Markt-Subdomain davor) beginnen – **nicht** `localhost`.

---

### Teil B – Wildcard-Domain, damit `angerbogen.deine-domain.de` überhaupt erreichbar ist

Ohne diesen Schritt zeigt der QR zwar die richtige Adresse, aber der Browser findet den Server für `markt.deine-domain.de` nicht.

1. Wieder in **demselben Projekt** in Vercel.
2. Reiter **„Settings“**.
3. Links **„Domains“** anklicken.
4. Im Eingabefeld für eine neue Domain **`*.deine-domain.de`** eintippen (Stern, Punkt, genau deine Basis-Domain).
5. **„Add“** / **Hinzufügen** klicken.
6. Vercel zeigt dir jetzt entweder **„Valid Configuration“** / grün – oder **DNS-Anweisungen** (Nameserver oder Records).

**Wenn die Domain bei Vercel gekauft ist:** Oft richtet sich DNS weitgehend selbst ein. Dann nur warten, bis der Eintrag **valid** ist und ein **SSL-Zertifikat** aktiv ist (in der Domains-Liste steht meist etwas zu Certificate / HTTPS).

**Wenn Vercel nach einem DNS-Record fragt:** Die angezeigte Anleitung **genau** befolgen (bei externem DNS-Anbieter den Record setzen; bei Vercel-Domains in den Vercel-Domain-Einstellungen nachsehen). Ohne korrekten DNS-Eintrag bleibt die Wildcard ungültig.

7. Wiederholen für die **„nackte“** Domain **`deine-domain.de`** (ohne Stern), falls noch nicht drin – damit ihr die Hauptseite weiterhabt.
8. Optional **`www.deine-domain.de`** als Redirect auf Apex, falls ihr `www` nutzt (Vercel bietet oft „Redirect“ an).

**Kontrolle:** Im Browser testen: `https://test123.deine-domain.de` (irgendein erfundener Name) – es sollte **eure** App laden (ggf. Fehlerseite der App, aber **nicht** „Server nicht gefunden“ / DNS-Fehler).

---

### Teil C – Kurz: was du in der App und in Supabase noch tun musst (ohne Vercel)

- **In der PLU-Planner-App** (als Super-Admin): Pro Markt unter Firmen & Märkte eine **Subdomain** eintragen (z. B. `angerbogen`). In den **Markt-Einstellungen** den Button **„Kopieren“** nutzen, um den **Markt-Login-Link** `https://{subdomain}.{VITE_APP_DOMAIN}/login` ans Personal zu geben. Kassenmodus in den Markt-Einstellungen **freischalten**.
- **Auth auf Produktion:** Die App speichert Supabase-JWT in **Cookies** mit `Domain=.<VITE_APP_DOMAIN>` (nicht `localhost`), damit **`www`** und **Markt-Subdomains** dieselbe Session nutzen. Nach dem Login: **Super-Admin** wird auf **`https://www.{DOMAIN}/super-admin`** geleitet (bzw. sichere `from`-Route); **Personal** auf den **Markt-Host** mit Rolle (`/user`, `/admin`, `/viewer`). **Marktwechsel** im Header: Markt wird gespeichert und bei anderer Subdomain folgt ein **voller Seitenwechsel** zum Dashboard auf dem neuen Host – außer **Super-Admin** bleibt ohne User-Vorschau auf Routen unter **`/super-admin/...`** (nur Kontextwechsel, kein Host-Sprung). Logik: [`canonical-host-redirect.ts`](src/lib/canonical-host-redirect.ts).
- **In Supabase** (Browser: `supabase.com` → dein Projekt): **Authentication** → **URL Configuration** → **Redirect URLs** so ergänzen, dass `https://deine-domain.de` und eure Markt-Hosts erlaubt sind (siehe Abschnitt 4 weiter unten).

---

### Wenn etwas hakt

- **Roter Hinweis** auf der Kassenmodus-Seite in der App: meist fehlt `VITE_APP_DOMAIN` im **Production**-Build → Teil A wiederholen, **Redeploy ohne Cache**.
- **„Nicht sicher“ / Zertifikat:** Teil B abwarten oder DNS korrigieren.
- **Fragen zu Vercel-Oberfläche:** Vercel ändert ab und zu Bezeichnungen; gesucht sind immer **Projekt → Settings → Environment Variables** bzw. **Settings → Domains**.

---

## Kurzüberblick (zum Abhaken)

| Schritt | Wo | Zweck |
|--------|-----|--------|
| 1 | Vercel → Environment Variables + Redeploy | `VITE_APP_DOMAIN` für Production-Build (siehe **Teil A** oben) |
| 2 | Vercel → Domains | Wildcard `*.deine-domain.de` (siehe **Teil B** oben) |
| 3 | App: Super-Admin Stammdaten | Pro Markt eindeutige `subdomain` |
| 4 | Supabase Dashboard | Auth-URLs (siehe **Schritt für Schritt in Supabase** unten) |
| 5 | Nach Deploy | QR testen, ggf. Token rotieren |

**Hinweis `www`:** Die Subdomain-Logik in [`extractSubdomain`](../src/lib/subdomain.ts) behandelt `www` wie ohne Markt-Präfix. `VITE_APP_DOMAIN` sollte zur **gleichen** Basis passen wie eure Markt-Hosts (meist Apex `deine-domain.de`, nicht `www.deine-domain.de`, wenn Markt-URLs `markt.deine-domain.de` sein sollen).

---

## 3. Pro Markt eindeutige `stores.subdomain` in den Stammdaten

**Warum:** QR und kopierter Link nutzen `stores.subdomain` aus der Datenbank. Zwei aktive Märkte dürfen **nicht** dieselbe Subdomain haben.

**Schritte in der App:**

1. Unter eurer **Produktions-URL** einloggen (Rolle **Super-Admin**).
2. Im Menü **„Firmen & Märkte“** (bzw. den Eintrag, der zur Firmen-/Marktverwaltung führt) öffnen.
3. Die **Firma** wählen → den **Markt** (die Filiale) anklicken, für den der QR gelten soll.
4. Feld **„Subdomain“** (oder Bearbeiten-Dialog dafür) finden und ausfüllen, z. B. `angerbogen` (nur Kleinbuchstaben, Zahlen, Bindestrich; mit Buchstabe beginnen – die App zeigt sonst eine Fehlermeldung).
5. **Speichern**.
6. **Listen-Sichtbarkeit** des Markts öffnen (Einstellungen des Markts): **Kassenmodus** / **`kiosk`** für diesen Markt **einschalten**, sonst blockiert die App die öffentliche Kasse (Hinweis auch auf **Administration → Kassenmodus**).

**Nicht verwenden** als Subdomain: `admin`, `app`, `www` und andere reservierte Namen (siehe [`RESERVED_SUBDOMAINS`](../src/lib/subdomain.ts)).

---

## 4. Supabase Authentication: Site URL und Redirect URLs

**Warum:** Nutzer melden sich unter `https://ihre-domain.de` oder `https://markt.ihre-domain.de` an. Supabase muss diese Ursprünge für Redirects und Session erlauben.

### Schritt für Schritt in Supabase

1. Browser: **`https://supabase.com`** → **einloggen**.
2. **„Your projects“** / Dashboard → **auf dein Projekt** klicken (das zur App gehört).
3. **Links** die Leiste: **„Authentication“** (Symbol oft ein Schloss) anklicken.
4. Im Untermenü **„URL Configuration“** (oder unter Configuration **„URL Configuration“**) öffnen.
5. **„Site URL“:** deine Haupt-Adresse der App eintragen, z. B. `https://deine-domain.de` (mit `https://`, ohne Pfad am Ende nötig).
6. **„Redirect URLs“:** auf **„Add URL“** klicken und nacheinander (oder in einer Zeile, je nach Oberfläche) Einträge wie:
   - `https://deine-domain.de/**`
   - `https://www.deine-domain.de/**` (nur wenn du `www` wirklich nutzt)
   - `https://*.deine-domain.de/**` (nur wenn Supabase Wildcards akzeptiert – sonst pro Markt eine Zeile, z. B. `https://angerbogen.deine-domain.de/**`)
7. **Speichern** (falls ein Save-Button angezeigt wird).

Bei Problemen mit OAuth/Magic-Link in der Supabase-Doku zu **Redirect URL Whitelist** nachlesen.

---

## 5. Rollout testen (Handy, neuer Tab), ggf. Token rotieren

**Wenn Teil A und B erledigt sind und der Markt eine Subdomain hat:**

1. Browser: **Produktions-URL** der App öffnen (z. B. `https://deine-domain.de`) und als Admin einloggen.
2. Menü **„Administration“** → **„Kassenmodus“** öffnen.
3. Prüfen: Der lange Link unter dem QR darf **nicht** `localhost` enthalten; er sollte mit `https://` und deiner Domain beginnen (z. B. `https://angerbogen.deine-domain.de/kasse/...`).
4. Button **„Vorschau (neuer Tab)“** klicken – es muss die Kassen-Anmeldung erscheinen (nicht „Seite nicht erreichbar“).
5. **Handy:** Kamera-App oder QR-Scanner – den **gedruckten oder Bildschirm-QR** scannen; gleicher Test wie Vorschau.
6. Wenn noch ein alter QR im Umlauf ist: In der App **„Neuen Link erzeugen“** → **neuen QR** drucken oder PDF speichern (alter Token ist dann ungültig).

**Hinweis:** Wenn die Oberfläche eine **rote Konfigurationswarnung** zum Kassen-Link zeigt, fehlt meist `VITE_APP_DOMAIN` im Production-Build oder der Redeploy war ohne die Variable – **Teil A** wiederholen, Redeploy **ohne** Build-Cache.

---

## Fehlersuche: Link sieht richtig aus, aber nicht erreichbar / 403

| Symptom | Typische Ursache | Was tun |
|--------|------------------|--------|
| Im Kassenmodus steht z. B. `https://markt.fier-hub.de/kasse/…`, Browser: **nicht erreichbar** / DNS | **`*.fier-hub.de`** (Wildcard) fehlt in **Vercel → Settings → Domains** oder DNS zeigt nicht auf Vercel | Wildcard anlegen; Test: `https://test12345.fier-hub.de` muss dieselbe App laden (nicht DNS-Fehler). |
| **403 Forbidden** (Vercel-Seite mit Fehler-ID) | **Deployment Protection** auf Preview-URLs; oder Domain gehört **einem anderen** Projekt | Kasse über **Production-Domain** (`https://www.fier-hub.de` …) testen. In Vercel prüfen: `www` und `*.fier-hub.de` diesem Projekt zugeordnet. |
| Apex (`www.fier-hub.de`) geht, **Subdomain** nicht | Nur Apex angelegt, **kein** Wildcard | **`*.fier-hub.de`** ergänzen (Teil B). |
| **Konsole:** 401 zu `site.webmanifest` | Geschütztes Preview-Deployment | Für den Login meist egal; Manifest wird nur eingebunden, wenn die Datei erreichbar ist ([`src/main.tsx`](../src/main.tsx)). |
| Seite **„backt“** / hängt kurz | DNS-Propagation oder Zertifikat wird noch ausgestellt | Minuten warten; in Vercel **Domains** auf **Valid** / SSL warten. |

**Hinweis:** Die App erzeugt nur die URL; **ob der Hostname im Internet existiert**, steuern **DNS und Vercel-Domains**.

---

## Referenz im Code

- Kassen-URL: [`src/lib/kiosk-entrance-url.ts`](../src/lib/kiosk-entrance-url.ts)
- Markt-Login-URL (`/login`): [`src/lib/subdomain.ts`](../src/lib/subdomain.ts) (`buildMarketLoginUrl`), UI: [`src/pages/SuperAdminStoreDetailPage.tsx`](../src/pages/SuperAdminStoreDetailPage.tsx)
- Auth-Cookies (Produktion): [`src/lib/supabase-auth-cookie-storage.ts`](../src/lib/supabase-auth-cookie-storage.ts), Client: [`src/lib/supabase.ts`](../src/lib/supabase.ts)
- Kanonische Hosts nach Login / Marktwechsel: [`src/lib/canonical-host-redirect.ts`](../src/lib/canonical-host-redirect.ts), [`src/pages/LoginPage.tsx`](../src/pages/LoginPage.tsx), [`src/components/layout/AppHeader.tsx`](../src/components/layout/AppHeader.tsx)
- Markt aus Hostname: [`src/contexts/StoreContext.tsx`](../src/contexts/StoreContext.tsx) (`resolveBySubdomain`)
- Kassenmodus UI: [`src/pages/AdminKassenmodusPage.tsx`](../src/pages/AdminKassenmodusPage.tsx)

Weitere fachliche Details: [FEATURES.md – Kassenmodus](FEATURES.md#kassenmodus-qr-eingeschränkte-listen).
