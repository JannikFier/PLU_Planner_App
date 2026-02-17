# PLU Planner

Webbasierte Verwaltung von wöchentlichen **Preis-Look-Up (PLU) Listen** für Obst- und Gemüseabteilungen im Einzelhandel. Jede Kalenderwoche liefert die Zentrale neue Excel-Dateien. Der Super-Admin lädt diese hoch, das System vergleicht automatisch mit der Vorwoche, und alle User sehen ihre personalisierte Liste.

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **UI** | Tailwind CSS v4 + shadcn/ui |
| **State** | TanStack Query v5 (kein Redux/Context) |
| **Routing** | React Router v6 |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **PDF** | jsPDF (client-seitig) |
| **Excel** | xlsx (SheetJS) |
| **Hosting** | Vercel |

## Features

- **Excel-Upload & KW-Vergleich** – Automatischer Abgleich neuer PLU-Daten mit der Vorwoche
- **Drei-Rollen-System** – Super-Admin (Inhaber), Admin (Abteilungsleiter), User (Personal)
- **Farbmarkierungen** – Gelb = neues Produkt, Rot = PLU geändert
- **Personalisierte Listen** – Eigene Produkte hinzufügen, Produkte ausblenden
- **PDF-Export** – Zweispaltiges Layout, direkt druckfertig
- **Einmalpasswort-System** – Sicheres Onboarding für neue Mitarbeiter
- **Automatischer KW-Wechsel** – Per Cron Job jeden Samstag um 23:59

## Schnellstart

### Voraussetzungen

- Node.js 18+
- Ein [Supabase](https://supabase.com) Projekt
- Git

### Installation

```bash
# Repository klonen
git clone <repo-url>
cd PLU_Planner_App

# Dependencies installieren
npm install

# Environment Variables einrichten
cp .env.local.example .env.local
# → VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY eintragen

# Dev-Server starten
npm run dev
```

### Supabase einrichten

1. Neues Projekt auf supabase.com erstellen (Region: eu-central-1)
2. SQL-Scripts der Reihe nach im SQL Editor ausführen:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_three_roles.sql`
3. Ersten User im Dashboard anlegen (Authentication → Users → Add User)
4. In `profiles` Tabelle: `role` auf `super_admin` setzen
5. **Edge Functions deployen** (für Benutzerverwaltung):
   ```bash
   supabase login
   supabase link --project-ref DEIN_PROJECT_REF
   supabase functions deploy create-user
   supabase functions deploy reset-password
   supabase functions deploy delete-user
   ```
   Den Project Ref findest du in Supabase unter Project Settings → General (z.B. `zjyolnnjlxyktdnfbzzs`).

### Verfügbare Scripts

| Script | Beschreibung |
|--------|-------------|
| `npm run dev` | Startet den Entwicklungsserver (http://localhost:5173) |
| `npm run build` | Erstellt den Production Build in `dist/` |
| `npm run preview` | Zeigt den Production Build lokal an |
| `npm run lint` | Prüft den Code mit ESLint |
| `npm run test` | Startet Tests im Watch-Modus |
| `npm run test:run` | Führt Tests einmal aus (z.B. vor Push) – Details: [docs/TESTING.md](docs/TESTING.md) |

## Projektstruktur

```
src/
├── main.tsx                    # Entry Point
├── App.tsx                     # Router + Providers
├── index.css                   # Tailwind + Design Tokens
├── lib/
│   ├── supabase.ts             # Supabase Client
│   └── utils.ts                # cn() Helper
├── hooks/
│   └── useAuth.ts              # Auth State + Login/Logout
├── types/
│   ├── database.ts             # Supabase DB Types
│   └── plu.ts                  # PLU Business Types
├── components/
│   ├── ui/                     # shadcn/ui Basis-Komponenten
│   ├── layout/
│   │   ├── AppHeader.tsx       # Header mit Navigation
│   │   ├── DashboardLayout.tsx # Seiten-Wrapper
│   │   └── ProtectedRoute.tsx  # Auth Guard (3 Rollen)
│   └── plu/                    # PLU-spezifische Komponenten
├── pages/
│   ├── LoginPage.tsx           # Login (Email + Personalnummer)
│   ├── ChangePasswordPage.tsx  # Einmalpasswort ändern
│   ├── UserDashboard.tsx       # User Startseite
│   ├── AdminDashboard.tsx      # Admin Startseite
│   ├── SuperAdminDashboard.tsx # Super-Admin Startseite
│   ├── MasterList.tsx          # PLU-Haupttabelle
│   ├── UserManagement.tsx      # Benutzerverwaltung
│   ├── HiddenItems.tsx         # Ausgeblendete Produkte
│   └── NotFound.tsx            # 404
supabase/
├── migrations/                 # SQL-Scripts für Datenbank
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   └── 003_three_roles.sql
└── functions/                  # Supabase Edge Functions
    ├── create-user/            # User erstellen (Admin API)
    └── reset-password/         # Passwort zurücksetzen
```

## Dokumentation

Ausführliche Dokumentation findest du im `docs/` Ordner:

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** – System-Architektur, Datenfluss, State Management
- **[ROLES_AND_PERMISSIONS.md](docs/ROLES_AND_PERMISSIONS.md)** – Drei-Rollen-System, Login-Flows, Passwort-Management
- **[DATABASE.md](docs/DATABASE.md)** – Alle Tabellen, ER-Diagramm, RLS-Regeln
- **[FEATURES.md](docs/FEATURES.md)** – Alle Features, Business-Regeln, Farbcodes
- **[TESTING.md](docs/TESTING.md)** – Unit-Tests (Vitest), Konvention, Erweiterung

## Lizenz

Privates Projekt. Alle Rechte vorbehalten.
