# Deployment: Domains, Markt-Subdomains und Kassen-QR (Vercel)

Diese Anleitung setzt das Zielbild **„jeder Markt eigene Subdomain, QR führt zur Kasse“** in der Produktion um. Die App-Logik ist bereits vorhanden ([`buildKioskEntranceUrl`](../src/lib/kiosk-entrance-url.ts)); es geht um **Vercel**, **DNS**, **Build-Variable**, **Stammdaten** und **Supabase Auth**.

## Kurzüberblick

| Schritt | Wo | Zweck |
|--------|-----|--------|
| 1 | Vercel → Environment Variables | `VITE_APP_DOMAIN` für Production-Build |
| 2 | Vercel → Domains (+ DNS) | Wildcard `*.ihre-domain.de` → dieselbe App |
| 3 | App: Super-Admin Stammdaten | Pro Markt eindeutige `subdomain` |
| 4 | Supabase Dashboard | Auth-URLs für Apex- und Markt-Hosts |
| 5 | Nach Deploy | QR testen, ggf. Token rotieren |

---

## 1. `VITE_APP_DOMAIN` in Vercel (Production) und neu deployen

**Warum:** Vite ersetzt `import.meta.env.VITE_APP_DOMAIN` beim **Build**. Ohne Wert fällt die App auf `localhost` zurück → QR/Link zeigen auf `https://markt.localhost/…` und sind auf echten Geräten nicht erreichbar.

**Schritte:**

1. Vercel → euer Projekt → **Settings** → **Environment Variables**.
2. Variable **`VITE_APP_DOMAIN`** anlegen oder bearbeiten:
   - **Wert:** nur die Basis-Domain, **ohne** `https://`, **ohne** Slash, z. B. `vierhub.de`.
   - **Environment:** mindestens **Production** (bei Preview-Deploys ggf. auch Preview setzen und dort denselben oder passenden Wert verwenden).
3. **Deployments** → letztes Production-Deployment → **Redeploy** (oder neu pushen), damit ein Build mit der Variable läuft.

**Hinweis:** `www` vs. Apex: Die Subdomain-Logik in [`extractSubdomain`](../src/lib/subdomain.ts) behandelt `www` wie ohne Markt-Präfix. `VITE_APP_DOMAIN` sollte zur **gleichen** Basis passen, die ihr für Markt-Hosts nutzt (meist Apex `example.de`, nicht `www.example.de` als `VITE_APP_DOMAIN`, wenn Markt-URLs `markt.example.de` sein sollen).

---

## 2. Wildcard-Domain `*.ihre-domain.de` in Vercel anbinden und SSL prüfen

**Warum:** Kassen- und Markt-URLs haben die Form `https://{markt-subdomain}.{VITE_APP_DOMAIN}/kasse/...`. Jeder Hostname muss auf **dieselbe** Vercel-App zeigen; `vercel.json` liefert für alle Pfade die SPA (`index.html`).

**Schritte:**

1. Vercel → Projekt → **Settings** → **Domains**.
2. **Add** → Wildcard eintragen: `*.ihre-domain.de` (ersetzt `ihre-domain.de` durch eure bei Vercel gekaufte/verknüpfte Domain).
3. Vercel zeigt ggf. DNS-Hinweise. Wenn die Domain **bei Vercel** liegt, werden Einträge oft automatisch gesetzt.
4. Warten, bis der Domain-Status **Valid** ist und **SSL Certificate** bereitsteht (sonst blockieren Browser den Aufruf).

**Ohne Wildcard** funktionieren Markt-Hosts wie `angerbogen.deine-domain.de` nicht zuverlässig – nur die Apex-URL wäre erreichbar.

---

## 3. Pro Markt eindeutige `stores.subdomain` in den Stammdaten

**Warum:** QR und kopierter Link nutzen `stores.subdomain` aus der Datenbank. Zwei aktive Märkte dürfen **nicht** dieselbe Subdomain haben.

**Schritte:**

1. Als Super-Admin: **Firmen & Märkte** → Markt öffnen.
2. Feld **Subdomain** setzen (nur Kleinbuchstaben, Zahlen, Bindestrich; muss mit Buchstabe beginnen – Validierung in der App).
3. **Keine** reservierten Namen verwenden (z. B. `admin`, `app`, `www` – siehe [`RESERVED_SUBDOMAINS`](../src/lib/subdomain.ts)).
4. **Listen-Sichtbarkeit:** Kassenmodus (`kiosk`) für den Markt muss eingeschaltet sein, sonst ist die öffentliche Kasse gesperrt (Hinweis auf der Kassenmodus-Seite).

---

## 4. Supabase Authentication: Site URL und Redirect URLs

**Warum:** Nutzer melden sich unter `https://ihre-domain.de` oder `https://markt.ihre-domain.de` an. Supabase muss diese Ursprünge für Redirects und Session erlauben.

**Schritte:**

1. Supabase → **Authentication** → **URL Configuration**.
2. **Site URL:** sinnvolle Haupt-URL (z. B. `https://ihre-domain.de` oder eure primäre App-URL).
3. **Redirect URLs:** alle tatsächlich genutzten Origins eintragen, z. B.:
   - `https://ihre-domain.de/**`
   - `https://www.ihre-domain.de/**` (falls genutzt)
   - `https://*.ihre-domain.de/**` (falls eure Supabase-Version Wildcards in Redirect URLs unterstützt; sonst wichtige Markt-Hosts **einzeln** ergänzen, z. B. `https://angerbogen.ihre-domain.de/**`).

Bei Problemen mit OAuth/Magic-Link in der Supabase-Doku zu **Redirect URL Whitelist** nachlesen.

---

## 5. Rollout testen (Handy, neuer Tab), ggf. Token rotieren

**Nach dem ersten erfolgreichen Deploy mit korrekter Domain:**

1. Im Browser die Verwaltung unter der **Produktions-URL** öffnen.
2. **Administration → Kassenmodus:** prüfen, ob der angezeigte Link mit **`https://`** und eurer echten Domain beginnt (nicht `localhost`).
3. **Vorschau (neuer Tab)** und **QR mit dem Handy** testen (gleiches WLAN oder Mobilfunk).
4. Wenn zuvor falsche QR gedruckt wurden: **Neuen Link erzeugen** (rotiert den Einstiegs-Token) und **neuen QR** ausdrucken.

**Hinweis:** Wenn die Oberfläche eine **rote Konfigurationswarnung** zum Kassen-Link zeigt, fehlt meist `VITE_APP_DOMAIN` im Production-Build oder die Domain passt nicht – erneut Schritt 1 prüfen und redeployen.

---

## Referenz im Code

- Kassen-URL: [`src/lib/kiosk-entrance-url.ts`](../src/lib/kiosk-entrance-url.ts)
- Markt aus Hostname: [`src/contexts/StoreContext.tsx`](../src/contexts/StoreContext.tsx) (`resolveBySubdomain`)
- Kassenmodus UI: [`src/pages/AdminKassenmodusPage.tsx`](../src/pages/AdminKassenmodusPage.tsx)

Weitere fachliche Details: [FEATURES.md – Kassenmodus](FEATURES.md#kassenmodus-qr-eingeschränkte-listen).
