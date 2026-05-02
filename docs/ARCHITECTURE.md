# Architektur

## System-Übersicht

```
┌─────────────────────────────────────────────┐
│                  VERCEL                       │
│  ┌─────────────────────────────────────────┐ │
│  │   React 18 + Vite + TypeScript          │ │
│  │   Tailwind CSS v4 + shadcn/ui           │ │
│  │   TanStack Query v5 (Data Fetching)     │ │
│  │   React Router v6 (Navigation)          │ │
│  └──────────────────┬──────────────────────┘ │
│                     │ @supabase/supabase-js   │
│                     ▼                         │
│  ┌─────────────────────────────────────────┐ │
│  │      SUPABASE (Backend-as-a-Service)    │ │
│  │                                         │ │
│  │  PostgreSQL  │  Auth  │  Storage        │ │
│  │  (Datenbank) │ (JWT)  │ (Excel-Backups) │ │
│  │                                         │ │
│  │  Edge Functions  │  Realtime            │ │
│  │  (User-Verwaltung)│ (Notifications)     │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## Datenfluss

### Excel-Upload bis PDF-Export

```
1. ZENTRALE liefert Excel-Dateien (Stück + Gewicht)
        ↓
2. SUPER-ADMIN lädt hoch → Excel Parser liest Daten
        ↓
3. VERGLEICH mit aktueller KW-Version
   → Neu (gelb), PLU geändert (rot), Unverändert, Entfernt
        ↓
4. MASTERLISTE wird in der Datenbank gespeichert
        ↓
5. BENACHRICHTIGUNGEN an alle User (neue Produkte)
        ↓
6. USER sieht personalisierte Liste
   (eigene Produkte, ausgeblendete entfernt, Regeln angewandt)
        ↓
7. PDF-EXPORT der personalisierten Ansicht
```

### Multi-Tenancy-Architektur

```
Browser-URL: angerbogen.domain.de
    │
    ├── StoreProvider extrahiert Subdomain "angerbogen"
    │   └── Laedt Store + Company aus DB
    │       └── Stellt currentStoreId, storeName, companyName bereit
    │
    ├── Alle marktspezifischen Hooks (useCustomProducts, useHiddenItems, ...)
    │   └── Filtern per .eq('store_id', currentStoreId)
    │   └── QueryKeys enthalten currentStoreId fuer Cache-Isolation
    │
    └── Login-Seite zeigt Markt-Branding (Logo, Name)

Sonderfaelle:
  admin.domain.de    → isAdminDomain = true (Superadmin-Modus)
  ?store=angerbogen  → Dev-Override (nur im DEV-Modus)
  Kein Subdomain     → Root-Domain, kein Store geladen

Auth-Persistenz (Supabase JWT):
  localhost          → sessionStorage (Tab schliessen = Session weg)
  Produktion         → HTTP-Cookies mit Domain=.<VITE_APP_DOMAIN> (www + Markt-Hosts teilen Session)
                       siehe src/lib/supabase-auth-cookie-storage.ts
  Nach Login         → kanonischer Host (www fuer super_admin, Markt-Host fuer Personal)
                       siehe src/lib/canonical-host-redirect.ts, LoginPage, AppHeader Marktwechsel
```

### Testmodus

```
TestModeProvider (innerhalb PersistQueryClientProvider)
    │
    ├── enableTestMode() → Cache-Snapshot erstellen
    ├── Mutationen werden abgefangen (kein API-Call)
    ├── Gelbe Hinweisleiste + gelber Rahmen
    └── disableTestMode() → Cache auf Snapshot zuruecksetzen
```

### Auth-Flow

```
Login-Seite (ein Eingabefeld fuer E-Mail ODER Personalnummer)
    ├── Markt-Branding aus StoreContext (Logo, Name)
    │
    ├── E-Mail erkannt → direkt signInWithPassword()
    │
    └── Personalnummer erkannt → lookup_email_by_personalnummer()
        └── dann signInWithPassword()
                │
                ▼
        must_change_password?
        ├── JA → /change-password (neues Passwort setzen)
        └── NEIN → Dashboard (je nach Rolle)
```

### MasterList-Datenfluss (Runde 2)

```
MasterList-Seite
    ├── useActiveVersion()       → aktive KW laden
    ├── useVersions()            → alle KWs für Dropdown
    ├── usePLUData(versionId)    → Master-PLU-Items
    ├── useCustomProducts()      → Globale eigene Produkte
    ├── useHiddenItems()         → Ausgeblendete PLUs
    ├── useBezeichnungsregeln()  → Keyword-Regeln
    ├── useLayoutSettings()      → Sortierung, Anzeige-Modus
    ├── useBlocks()              → Warengruppen
    │
    ├── buildDisplayList()       → Layout-Engine (finale Liste)
    │   ├── Master-Items als Basis
    │   ├── + Custom Products (nur wenn PLU nicht in Master)
    │   ├── - Hidden Items (herausfiltern)
    │   ├── Bezeichnungsregeln auf effektiven display_name (inkl. marktspezifischer Umbenennung), wenn Keyword als ganzes Wort vorkommt
    │   ├── Block-Namen zuweisen
    │   └── Sortieren + Statistiken
    │
    ├── Toolbar: [+ Eigenes Produkt] [Ausblenden] [PDF] [Ausgeblendete: X]
    ├── PLUTable(DisplayItem[])  → Zwei-Spalten-Tabelle mit Checkbox-Modus
    │   ├── Custom-Product-Indikator (Stern-Icon)
    │   ├── Auswahl-Modus (Checkboxen für Ausblenden)
    │   └── StatusBadge + Zebra-Striping
    └── PLUFooter                → Erweiterte Stats (Gesamt, Neu, Geändert, Eigene, Ausgeblendet)
```

### Masterlisten – Orchestrierung (Stufe 3a)

Die Seiten [`MasterList`](../src/pages/MasterList.tsx) und [`BackshopMasterList`](../src/pages/BackshopMasterList.tsx) halten weiterhin Queries und Routing; aufbereitete Listen und PDF-Zweige liegen in Domain-Hooks, Alerts/Karten in Props-only-Komponenten:

| Bereich | Obst | Backshop |
|---------|------|----------|
| Display-Liste + Stats (aus `buildDisplayList` / `buildBackshopDisplayList`) | `useMasterListDisplayList` | `useBackshopMasterListDisplayList` |
| PDF-Export-Liste / KW-Kontext | `useMasterListPdfDisplayList`, `useMasterListPdfExportVersionSync` | `useBackshopMasterListPdfExportList` |
| Werbungs-KW-Vorschau (Toolbar) | — | `useBackshopOfferPreviewUi` |
| Archiv-/Fehler-/Leer-Zustände | `MasterListPageStates.tsx` | `BackshopMasterListPageStates.tsx` |

**Virtualisierung** der großen Tabelle ist bewusst **nicht** Teil dieser Strukturierung; siehe [VIRTUALISIERUNG_SPIKE.md](VIRTUALISIERUNG_SPIKE.md).

Über die **weiteren Refactor-Stufen** (Stufe 4: übrige große Seiten, Stufe 5: Virtualisierung umsetzen) siehe [REFACTOR_ROADMAP_STUFEN.md](REFACTOR_ROADMAP_STUFEN.md). **Agent-Pläne:** Stufe 4 – [REFACTOR_STUFE_4_AGENT_PLAN.md](REFACTOR_STUFE_4_AGENT_PLAN.md); Stufe 5 – [REFACTOR_STUFE_5_AGENT_PLAN.md](REFACTOR_STUFE_5_AGENT_PLAN.md).

## State Management

**Grundregel: KEIN globaler Context fuer Daten.** Stattdessen TanStack Query fuer alles.

**Ausnahmen – Contexts:**
- `AuthProvider` – Auth-State (Session, Profil, Rolle)
- `StoreProvider` – Markt-Kontext (currentStoreId, storeName, isAdminDomain)
- `TestModeProvider` – Testmodus-State (isTestMode, enableTestMode, disableTestMode)

```
Server State (Supabase DB)
    ↓  useQuery()
TanStack Query Cache (persistiert in sessionStorage beim Reload → sofortige Anzeige letzter Daten)
    ↓
React Components (UI)
    ↓  useMutation()
Supabase DB → invalidateQueries() → automatischer Refetch
```

Jede Datendomäne hat ihren eigenen Custom Hook:

| Hook | Daten | Status |
|------|-------|--------|
| `useAuth()` | Auth State, Login, Logout, Profil (via AuthProvider) | Implementiert |
| `useActiveVersion()` | Aktive KW-Version | Implementiert |
| `usePLUData()` | PLU-Items einer Version | Implementiert |
| `useBlocks()` | Warengruppen (+ CRUD, Reorder, Assign) | Implementiert |
| `useLayoutSettings()` | Layout-Konfiguration (Singleton) | Implementiert |
| `useUpdateLayoutSettings()` | Layout-Einstellungen speichern | Implementiert |
| `useVersions()` | Alle KW-Versionen | Implementiert |
| `useCustomProducts()` | Globale eigene Produkte (CRUD) | Implementiert (Runde 2) |
| `useHiddenItems()` | Ausgeblendete PLUs (hide/unhide/unhideAll) | Implementiert (Runde 2) |
| `useNotifications()` | Version-Notifications (read/unread count) | Implementiert (Runde 2) |
| `useRenameMasterProduct()` | Master-Produkt umbenennen (Super-Admin) | Implementiert (Runde 2) |
| `useBezeichnungsregeln()` | Keyword-Regeln (CRUD + Apply) | Implementiert |
| `useApplyAllRules()` | Regeln anwenden: nur marktspezifische `renamed_items`-Updates, keine zentralen Master-Schreibzugriffe | Implementiert |
| `usePLUUpload()` | 4-Schritt Excel-Upload (Dateien, Vergleich, Konflikte, Publish) | Implementiert |
| `useBackshopHiddenProductsPageModel()` | Orchestrierung der Ableitungen für „Ausgeblendete Produkte“ (Backshop); Page nur noch Layout/Dialoge | Implementiert (Stufe 4.3) |

## Lib-Module (`src/lib/`)

| Modul | Beschreibung |
|-------|-------------|
| `excel-parser.ts` | Excel-Parsing (xlsx), Typ/KW-Erkennung (Dateiname + Header-Zeile: Stück/Gewicht), PLU-Validierung |
| `backshop-sources.ts` | Backshop Multi-Source-Konstanten (`edeka | harry | aryzta`), Labels, Badge-Farben, Gruppen-Namens-Normalisierung |
| `comparison-logic.ts` | KW-Vergleich (UNCHANGED, NEW, CHANGED, CONFLICT) |
| `publish-version.ts` | Version veröffentlichen (freeze, insert, activate, version_notifications erstellen) |
| `layout-engine.ts` | DisplayItem-Liste (Master + Custom − Hidden + Regeln); berücksichtigt **Markt-Overrides** (`nameBlockOverrides`, `storeBlockOrder`) |
| `plu-table-rows.ts` | Reine Hilfen für die PLUTable-Zeilengeometrie (FlatRow, Buchstaben-/Block-Gruppen → Tabellenzeilen; kein React) |
| `backshop-hidden-products-page-utils.ts` | Konstanten und `orderBlockKeys` für die Seite „Backshop ausgeblendete Produkte“ (ohne React) |
| `block-override-utils.ts` | Normalisierung `system_name`, effektive `block_id`, Sortierung Blöcke mit optionaler Markt-Reihenfolge |
| `pdf-generator.ts` | **NEU (Runde 2)**: PDF-Export mit jsPDF (A4, Zwei-Spalten, Farben, Footer) |
| `plu-helpers.ts` | PLU-spezifische Helper (Gruppierung, Block-Gruppierung, Statistiken) – jetzt generisch mit PLUItemBase |
| `keyword-rules.ts` | Bezeichnungsregeln: Keyword-Normalisierung, Position, Batch-Apply |
| `supabase.ts` | Supabase Client Instanz |
| `utils.ts` | Allgemeine Utilities (cn, etc.) |

## Helper-Funktionen (`src/lib/plu-helpers.ts`)

| Funktion | Beschreibung |
|----------|-------------|
| `formatKWLabel(kw, jahr)` | KW-Label formatieren → "KW07/2026" |
| `groupItemsByLetter(items)` | Items nach Anfangsbuchstabe gruppieren |
| `groupItemsByBlock(items, blocks, options?)` | Items nach Warengruppe gruppieren; optional `resolveBlockId` / `sortedBlocks` für Markt-Overrides |
| `groupItemsForDialogAlignedWithList(...)` | Dialog-Gruppierung wie Masterliste (alphabetisch oder nach Block) |
| `splitLetterGroupsIntoColumns(groups)` | Buchstabengruppen auf 2 Spalten (COLUMN_FIRST) |
| `splitItemsRowByRow(items)` | Items abwechselnd links/rechts (ROW_BY_ROW) |
| `calculatePLUStats(items)` | Statistiken berechnen (gesamt, neu, geändert) |
| `getStatusColorClass(status)` | CSS-Klasse für PLU-Status-Farbe |

## PLU-Komponenten (`src/components/plu/`)

| Komponente | Beschreibung |
|-----------|-------------|
| `StatusBadge` | PLU-Zelle mit farbigem Hintergrund je nach Status |
| `KWSelector` | Dropdown zur KW-Auswahl (shadcn Select) |
| `PLUTable` | Zwei-Spalten-Tabelle mit DisplayItem[], Checkboxen, Custom-Indikator (aufgeteilt: Shell in `PLUTable.tsx`, Geometrie in `src/lib/plu-table-rows.ts`, Spalten/Mobile/Layouts in `PluTable*.tsx`, Badges in `plu-table-inline-badges.tsx`; Details in [.cursor/rules/component-size-and-agents.mdc](../.cursor/rules/component-size-and-agents.mdc)) |
| `MasterListPageHeader` / `MasterListToolbar` | Kopfzeile und Aktionsleiste der Obst-Masterliste (nur Präsentation + Callbacks) |
| `MasterListPageStates` | Archiv-/Snapshot-/WG-Hinweis-/Lade-/Fehler-/Leer-Zustände der Obst-Masterliste (Props-only) |
| `BackshopMasterListPageHeader` / `BackshopMasterListToolbar` | Entsprechend für die Backshop-Masterliste |
| `BackshopMasterListPageStates` | Entsprechende Zustandsbausteine für die Backshop-Masterliste (Props-only) |
| `PLUFooter` | Erweiterte Stats (Gesamt, Neu, Geändert, Eigene, Ausgeblendet) |
| `CustomProductDialog` | **NEU**: Dialog zum Hinzufügen eigener Produkte (Zod-Validierung) |
| `ExportPDFDialog` | **NEU**: Dialog mit Vorschau-Infos vor PDF-Download |
| `UnifiedNotificationBell` | Eine Glocke im Header: Badge = ungelesene Obst- + Backshop-Notifications; Dialog `UnifiedNotificationDialog` |
| `NotificationDialog` | **NEU**: Neue Produkte einer Version prüfen + ausblenden |
| `RenameDialog` | **NEU**: Dialog zum Umbenennen (Custom + Master Products) |
| `LayoutPreview` | Live-Vorschau für Layout-Einstellungen (reaktiv auf Form-State) |
| `SchlagwortManager` | Dialog: Bezeichnungsregeln (CRUD, Live-Vorschau, Vorher/Nachher) |
| `WarengruppenPanel` | Split-Panel: Links Gruppen, Rechts Produkte + Checkboxen (derzeit keine Obst-Route; Markt-UX über `ObstWarengruppenPanel`) |
| `WarengruppenSortierung` | Legacy-Komponente (nicht mehr eingebunden); Markt-Reihenfolge über `ObstWarengruppenPanel` / `store_obst_block_order` |

## Seiten (`src/pages/`)

| Seite | Route | Beschreibung |
|-------|-------|-------------|
| `LoginPage` | `/login` | Login (E-Mail oder Personalnummer) |
| `ChangePasswordPage` | `/change-password` | Einmalpasswort ändern |
| `UserDashboard` | `/user` | User-Dashboard |
| `AdminDashboard` | `/admin` | Admin-Dashboard |
| `SuperAdminDashboard` | `/super-admin` | Super-Admin-Dashboard |
| `PLUUploadPage` | `/super-admin/plu-upload` | 4-Schritt Excel-Upload (Vollbild: Dateien, Vergleich, Konflikte, Fertig) |
| `MasterList` | `*/masterlist` | PLU Obst und Gemüse (User/Admin-Modus), Button „Neuer Upload“ → PLU-Upload-Seite |
| `LayoutSettingsPage` | `/super-admin/layout` | Layout-Konfiguration |
| `RulesPage` | `/super-admin/rules` | Bezeichnungsregeln (Obst/Gemüse); Warengruppen nur unter `*/obst-warengruppen` |
| `VersionsPage` | `/super-admin/versions` | Versionen-Manager |
| `UserManagement` | `*/users` | Benutzerverwaltung |
| `HiddenItems` | `*/hidden-items` | Ausgeblendete Produkte (alle Rollen) |

## Ordnerstruktur-Konzept

| Ordner | Zweck |
|--------|-------|
| `src/pages/` | Seiten-Komponenten (1 Datei pro Route) |
| `src/components/ui/` | shadcn/ui Basis-Komponenten (generiert, nicht manuell ändern) |
| `src/components/layout/` | Layout-Wrapper (Header, Dashboard, ProtectedRoute) |
| `src/components/plu/` | PLU-spezifische Komponenten (Tabelle, Dialoge, Upload); große Tabelle und Masterlisten-Toolbars sind in mehrere Dateien zerlegt (siehe [.cursor/rules/component-size-and-agents.mdc](../.cursor/rules/component-size-and-agents.mdc) Abschnitt „PLU-Tabelle und Masterlisten-Chrome“) |
| `src/hooks/` | Custom Hooks (TanStack Query Wrapper) |
| `src/contexts/` | AuthProvider – gemeinsamer Auth-State für die App |
| `src/lib/` | Business-Logik, Helper-Funktionen, Konstanten |
| `src/types/` | TypeScript Type-Definitionen |

## Konventionen zu Dateigröße und neuen Features

Damit die Codebasis wartbar bleibt und Agenten nicht wieder nur „alles in eine Datei“ packen: Leitplanken zu **Seitengröße**, **keinen Monolithen** und **zentrale Thumbnail-Komponenten** für Listen – siehe [.cursor/rules/component-size-and-agents.mdc](../.cursor/rules/component-size-and-agents.mdc). Kurz: Seiten nur verdrahten; Logik nach `src/lib/`; große Seiten in Hooks/Komponenten teilen; Backshop-Listenbilder über `BackshopThumbnail` / `PluTableBackshopThumbnail`.

## Reload und Ladeverhalten

Damit Reloads (Command-R) schnell und flüssig wirken, gibt es einen eigenen Plan für Auth-Cache, Query-Persistenz, Prefetch und App-Shell: [RELOAD_UND_LAADEVERHALTEN.md](RELOAD_UND_LAADEVERHALTEN.md).

## Deployment

Das Projekt wird auf **Vercel** gehostet:

- `vercel.json` konfiguriert SPA-Routing (alle Pfade → index.html)
- Environment Variables werden in Vercel Settings gesetzt
- Build-Befehl: `npm run build` → Output: `dist/`
- Supabase Edge Functions werden separat über Supabase CLI deployed
- **Markt-Subdomains, Wildcard-DNS, Kassen-QR und Supabase Redirect-URLs:** [DEPLOYMENT_DOMAINEN_UND_KASSE.md](DEPLOYMENT_DOMAINEN_UND_KASSE.md)
