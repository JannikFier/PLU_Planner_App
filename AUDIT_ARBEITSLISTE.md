# PLU Planner – Audit-Arbeitsliste

Stand: 17.03.2026 | Erstellt durch umfassende Code-Analyse

---

## Wie diese Liste funktioniert

- Jeder Punkt hat eine **eindeutige ID** (K1, H1, M1, N1 etc.)
- **Status:** `[ ]` = offen, `[x]` = erledigt, `[-]` = bewusst übersprungen (mit Begründung)
- **Reihenfolge:** Von oben nach unten abarbeiten (Kritisch → Hoch → Mittel → Niedrig)
- Bei jedem Punkt steht genau, WAS zu tun ist, WO, und WARUM

### Modell-Empfehlung (Token-Sparen)

- **`[STRONG]`** = Komplex, viele Fehler möglich, Abhängigkeiten, Security/DB – **starkes KI-Modell** (z.B. Claude Opus, GPT-4).
- **`[WEAK]`** = Einfache Änderungen, Copy-Paste-Muster, klare Anleitung – **schwaches/schnelles Modell** reicht (z.B. Claude Haiku, GPT-4o-mini).

---

## KRITISCH – App funktioniert teilweise nicht korrekt

### [x] K1 **[STRONG]** – Version-Notifications: `store_id` fehlt → INSERT schlägt still fehl

**Dateien:**
- `src/lib/publish-version.ts` (Zeile 153-156)
- `src/lib/publish-backshop-version.ts` (Zeile 190-194)

**Problem:**
Beim Veröffentlichen einer Version werden Notifications erstellt OHNE `store_id`:
```ts
const notifications = allUsers.map((user) => ({
  user_id: user.id,
  version_id: versionId,
  is_read: false,
  // store_id FEHLT!
}))
```
Migration 024 setzt `store_id NOT NULL` auf `version_notifications` und `backshop_version_notifications`. Es gibt keinen DEFAULT. Der INSERT schlägt JEDES MAL fehl – der Fehler wird aber nur per `console.warn` geloggt (publish-version.ts Zeile 167) bzw. komplett verschluckt (publish-backshop-version.ts Zeile 202-204).

**Zweites Problem im selben Code:**
`profiles.select('id').neq('id', createdBy)` lädt ALLE User aller Firmen. Bei Multi-Tenancy dürfen nur User mit Zugriff auf denselben Store benachrichtigt werden.

**Fix:**
1. `store_id` als Parameter an die Publish-Funktion übergeben (aus `currentStoreId`)
2. In die Notification-Objekte aufnehmen: `{ user_id, version_id, is_read: false, store_id }`
3. Profiles-Query filtern: nur User laden, die über `user_store_access` Zugang zum aktuellen Store haben
4. In beiden Dateien fixen (Obst + Backshop)

---

### [x] K2 **[WEAK]** – Offer Items: Falscher `onConflict`-Parameter

**Dateien:**
- `src/hooks/useOfferItems.ts` (Zeile 72, 205)
- `src/hooks/useBackshopOfferItems.ts` (Zeile 72, 205)

**Problem:**
```ts
const { error } = await supabase.from('plu_offer_items').upsert(row as never, {
  onConflict: 'plu',  // FALSCH
})
```
DB-Constraint ist `UNIQUE(plu, store_id)` (Migration 030, Zeile 211).

**Fix:**
Alle 4 Stellen ändern: `onConflict: 'plu,store_id'`

---

### [x] K3 **[STRONG]** – Custom Products: Falscher Query-Key bei Rename/Reset (Testmodus)

**Datei:** `src/hooks/useCustomProducts.ts` (Zeile 249, 284)

**Problem:**
```ts
queryClient.setQueriesData<MasterPLUItem[]>(
  { queryKey: ['plu-items'] },  // FALSCH – tatsächlicher Key ist ['plu-items', versionId]
  ...
)
```

**Fix:**
Query-Key mit `versionId` ergänzen. Dafür muss `versionId` im Scope sein (z.B. aus `useActiveVersion` holen oder den Key breiter matchen mit `{ queryKey: ['plu-items'], exact: false }`). Variante 2 ist einfacher und trifft alle plu-items-Queries. Prüfe ob `setQueriesData` mit `exact: false` (Standard bei Partial-Match) schon reicht – wenn ja, ist der bestehende Code eventuell doch korrekt. Verifizieren!

---

### [x] K4 **[STRONG]** – Rename-RPCs: Keine Store-Zugriffsprüfung

**Datei:** `supabase/migrations/037_rename_allow_user_role.sql` (Zeile 19-87)

**Problem:**
Die 4 RPCs (`rename_master_plu_item`, `reset_master_plu_item_display_name`, `rename_backshop_master_plu_item`, `reset_backshop_master_plu_item_display_name`) sind `SECURITY DEFINER` und prüfen nur `is_not_viewer()`. Es wird nicht geprüft, ob das Item zu einem Store gehört, auf den der User Zugriff hat.

**Fix:**
Neue Migration (040) erstellen:
1. In jedem RPC prüfen, ob `master_plu_items`/`backshop_master_plu_items` über `version_id → versions` zum System gehören (Versionen sind global, daher reicht die bestehende Logik möglicherweise – PRÜFEN ob Versionen store-spezifisch sind)
2. Falls Versionen global sind: Prüfung nicht nötig, Priorität runterstufen
3. Falls Versionen store-spezifisch sind: `get_user_store_ids()` nutzen und prüfen

**Hinweis:** Erst prüfen ob Versionen global oder store-spezifisch sind, bevor der Fix geschrieben wird.

---

### [x] K5 **[STRONG]** – `lookup_email_by_personalnummer` für Unauthentifizierte

**Datei:** `supabase/migrations/001_initial_schema.sql` (Zeile ~272)

**Problem:**
`GRANT EXECUTE ON FUNCTION public.lookup_email_by_personalnummer TO anon;`
Unauthentifizierte können Personalnummern durchprobieren.

**Fix:**
Neue Migration: `REVOKE EXECUTE ON FUNCTION public.lookup_email_by_personalnummer FROM anon;` und `GRANT EXECUTE ... TO authenticated;`. ABER: Prüfe ob die Funktion im Login-Flow (vor Auth) gebraucht wird! Falls ja, muss der Login-Flow angepasst werden (z.B. Edge Function statt direkter RPC-Aufruf).

---

### [x] K6 **[STRONG]** – Keine 401/403-Behandlung bei abgelaufenem JWT

**Datei:** `src/lib/supabase.ts` (Zeile 135-141)

**Problem:**
`queryRest`, `mutateRest`, `invokeEdgeFunction` werfen bei `!resp.ok` generische Fehlermeldungen. Kein automatischer Redirect zu `/login` bei 401/403. Kein Token-Refresh + Retry.

**Fix:**
1. In `queryRest` und `mutateRest` nach `!resp.ok` prüfen: wenn `resp.status === 401 || resp.status === 403`:
   - Versuche `supabase.auth.refreshSession()`
   - Wenn erfolgreich: Request mit neuem Token wiederholen (1x Retry)
   - Wenn fehlgeschlagen: `supabase.auth.signOut()` aufrufen → AuthContext räumt auf → Redirect zu /login
2. In `invokeEdgeFunction` gleiche Logik
3. Optional: eigene Error-Klasse `AuthExpiredError` für saubere Unterscheidung

---

## HOCH – Beeinträchtigt Nutzererfahrung oder Sicherheit erheblich

### [x] H1 **[STRONG]** – AuthContext: `TOKEN_REFRESHED` / `INITIAL_SESSION` nicht behandelt

**Datei:** `src/contexts/AuthContext.tsx` (Zeile 274-328)

**Problem:**
`onAuthStateChange` behandelt nur `SIGNED_IN` und `SIGNED_OUT`. Events wie `TOKEN_REFRESHED` und `INITIAL_SESSION` werden ignoriert.

**Fix:**
```ts
if (event === 'TOKEN_REFRESHED' && session?.user) {
  // Session im State aktualisieren (nicht Profil neu laden, nur Session)
  setState((prev) => ({ ...prev, session }))
  // Cache aktualisieren
  sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ ... }))
}
if (event === 'INITIAL_SESSION' && session?.user) {
  // Analog zu SIGNED_IN behandeln, wenn State noch nicht gesetzt
}
```

---

### [x] H2 **[STRONG]** – Admins sehen Profile aller Firmen (Cross-Company)

**Datei:** Neue Migration erstellen

**Problem:**
RLS-Policy "Admins can read all profiles" (Migration 002, Zeile 22-24) ist nicht auf die eigene Company eingeschränkt.

**Fix:**
Neue Migration: Policy droppen und neu anlegen mit Company-Filter:
```sql
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read profiles in same company"
  ON public.profiles FOR SELECT
  USING (
    public.is_admin()
    AND id IN (
      SELECT usa.user_id FROM public.user_store_access usa
      JOIN public.stores s ON s.id = usa.store_id
      WHERE s.company_id = (
        SELECT s2.company_id FROM public.user_store_access usa2
        JOIN public.stores s2 ON s2.id = usa2.store_id
        WHERE usa2.user_id = auth.uid()
        LIMIT 1
      )
    )
  );
```
**Achtung:** Super-Admins brauchen weiterhin Zugriff auf alle Profile! Policy entsprechend anpassen (OR `is_super_admin()`).

---

### [x] H3 **[STRONG]** – Migration 039: Trigger nur auf INSERT + fehlender `search_path`

**Datei:** `supabase/migrations/039_enforce_same_company_store_access.sql`

**Fix (neue Migration):**
1. `SET search_path = public` zur Funktion hinzufügen
2. Trigger auch für UPDATE erstellen:
```sql
CREATE OR REPLACE FUNCTION public.check_same_company_user_store_access()
RETURNS TRIGGER AS $$
...
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_same_company_user_store_access ON public.user_store_access;
CREATE TRIGGER enforce_same_company_user_store_access
  BEFORE INSERT OR UPDATE ON public.user_store_access
  FOR EACH ROW
  EXECUTE FUNCTION public.check_same_company_user_store_access();
```

---

### [x] H4 **[STRONG]** – Prefetch ohne `queryFn` → funktioniert beim Cold Start nicht

**Datei:** `src/hooks/usePrefetchForNavigation.ts` (Zeile 24-46)

**Problem:**
`runMasterListPrefetch` und `runStorePrefetch` rufen `prefetchQuery` nur mit `queryKey` auf, ohne `queryFn`. Wenn die Query noch nie registriert wurde (Cold Start), passiert nichts.

**Fix:**
Für jeden Prefetch-Aufruf eine `queryFn` mitgeben, analog zu `runAdminPrefetch`:
```ts
void queryClient.prefetchQuery({
  queryKey: ['version', 'active'],
  queryFn: async () => { /* queryRest('versions', { status: 'eq.active', limit: '1' }) */ },
})
```
Für alle Keys: `version/active`, `versions`, `layout-settings`, `blocks`, `bezeichnungsregeln`, `plu-items`, `custom-products`, `hidden-items`, `offer-items`.

---

### [x] H5 **[STRONG]** – Kein Backshop-Prefetch

**Dateien:**
- `src/hooks/usePrefetchForNavigation.ts`
- `src/components/AuthPrefetch.tsx`

**Fix:**
1. `runBackshopPrefetch(queryClient)` analog zu `runMasterListPrefetch` erstellen
2. In `AuthPrefetch` aufrufen, wenn Backshop sichtbar ist
3. Backshop-Chunk (`BackshopMasterList`) in `AuthPrefetch` vorab laden

---

### [x] H6 **[WEAK]** – Context-Provider ohne `useMemo` → App-weite Re-Renders

**Dateien:**
- `src/contexts/StoreContext.tsx` (Zeile 368-370)
- `src/contexts/TestModeContext.tsx` (Zeile 97-106)
- `src/contexts/AuthContext.tsx` (Zeile 364-371)

**Fix:**
`value` mit `useMemo` wrappen:
```ts
const value = useMemo(() => ({
  ...state,
  setActiveStore,
}), [state, setActiveStore])
```
Bei AuthContext: Dependencies auf die einzelnen State-Felder und Funktionen. Bei TestModeContext analog.

---

### [x] H7 **[WEAK]** – Bezeichnungsregeln überschreiben manuell umbenannte Artikel

**Datei:** `src/lib/keyword-rules.ts` (Zeile 109-122)

**Problem:**
`applyAllRulesToItems` arbeitet immer mit `system_name`. Manuell umbenannte Artikel (`is_manually_renamed: true`) werden nicht berücksichtigt.

**Fix:**
In `applyAllRulesToItems` vor dem Anwenden einer Regel prüfen:
```ts
if (item.is_manually_renamed) continue; // Manuell umbenannte überspringen
```

---

### [x] H8 **[WEAK]** – ExportBackshopPDFDialog nicht lazy geladen

**Datei:** `src/pages/BackshopMasterList.tsx` (Zeile 15)

**Problem:**
```ts
import { ExportBackshopPDFDialog } from '@/components/plu/ExportBackshopPDFDialog'
// In MasterList.tsx ist es korrekt:
// const ExportPDFDialog = lazy(() => import(...))
```

**Fix:**
Analog zu MasterList.tsx lazy laden:
```ts
const ExportBackshopPDFDialog = lazy(() =>
  import('@/components/plu/ExportBackshopPDFDialog').then((m) => ({ default: m.ExportBackshopPDFDialog }))
)
```
Plus `<Suspense>` um die Verwendung.

---

### [x] H9 **[STRONG]** – PDF: Blob-URLs bei Fehler/Abbruch nicht freigegeben

**Dateien:**
- `src/components/plu/ExportPDFDialog.tsx` (Zeile ~119-135)
- `src/components/plu/ExportBackshopPDFDialog.tsx` (Zeile ~111-124)

**Fix:**
1. `URL.revokeObjectURL(url)` in einem `finally`-Block oder Timeout-Fallback
2. Bei Dialog-Close prüfen ob Blob-URL existiert und freigeben
3. Safety-Timeout (z.B. 60s) der die URL auf jeden Fall freigibt

---

### [x] H10 **[STRONG]** – PDF: jsPDF Helvetica → Umlaute-Probleme

**Datei:** `src/lib/pdf-generator.ts`

**Problem:**
Standard-Helvetica in jsPDF unterstützt keine deutschen Umlaute vollständig. Zeichen wie ä, ö, ü, ß können als Platzhalter erscheinen.

**Fix:**
Custom Font einbetten (z.B. Inter als Base64) oder auf eine Schrift wechseln, die Unicode unterstützt. Alternativ: prüfen ob die aktuelle Version von jsPDF Helvetica mit Umlauten korrekt darstellt (neuere Versionen können das evtl.). ZUERST TESTEN ob das Problem tatsächlich auftritt.

---

### [x] H11 **[WEAK]** – Kein Redirect zur ursprünglichen Route nach Login

**Dateien:**
- `src/components/layout/ProtectedRoute.tsx` (Zeile 66)
- `src/pages/LoginPage.tsx` (Zeile 46-54)

**Fix:**
1. In ProtectedRoute: `<Navigate to="/login" state={{ from: location }} replace />`
2. In LoginPage: `const location = useLocation(); const from = location.state?.from?.pathname || dashboardPath;` und nach Login dahin leiten

---

### [x] H12 **[STRONG]** – Kein CSP-Header

**Datei:** `vercel.json`

**Fix:**
Content-Security-Policy hinzufügen:
```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self';"
}
```
**Achtung:** Erst in Staging testen! CSP kann die App kaputt machen wenn zu restriktiv.

---

## MITTEL – Sollte geplant werden

### [x] M1 **[WEAK]** – Fehlende `staleTime` bei ~25+ Hooks

**Betroffene Hooks:**
- `src/hooks/useBlocks.ts` → `useBlockRules`
- `src/hooks/useBackshopBlocks.ts` → `useBackshopBlockRules`
- `src/hooks/useStores.ts` → `useStoresByCompany`, `useAllStores`, `useStoreById`
- `src/hooks/useCompanies.ts` → `useCompanies`
- `src/hooks/useStoreAccess.ts` → alle 3 Hooks
- `src/hooks/useStoreListVisibility.ts` → `useStoreListVisibility`, `useUserListVisibilityForUser`
- `src/hooks/useNotifications.ts` → alle Hooks
- `src/hooks/useBackshopNotifications.ts` → alle Hooks
- Inline-Queries in: HiddenItems, HiddenProductsPage, BackshopHiddenProductsPage, UserManagement, SuperAdminStoreDetailPage

**Fix:**
Sinnvolle `staleTime` setzen:
- Stores, Companies, Profiles: `staleTime: 5 * 60 * 1000` (5 Min)
- Block-Rules, Layout: `staleTime: 2 * 60 * 1000` (2 Min)
- Notifications: `staleTime: 30 * 1000` (30 Sek, da refetchInterval schon 30s ist)

---

### [x] M2 **[WEAK]** – Persist Allowlist unvollständig

**Datei:** `src/lib/query-persist-allowlist.ts`

**Fehlende Keys hinzufügen:**
- `block-rules`
- `backshop-block-rules`
- `profiles-hidden-by`
- `company-profiles`
- `active-version-change-count`, `notification-count`, `version-notification`
- `unread-notifications`, `new-products`, `changed-products`
- `backshop-active-version-change-count`, `backshop-notification-count`
- `backshop-new-products`, `backshop-changed-products`

---

### [x] M3 **[STRONG]** – N+1 Query-Patterns in Batch-Operationen

**Betroffene Stellen:**
1. `useOfferItems.ts` Zeile 195-216: Einzel-Upserts → Array-Upsert
2. `useBackshopOfferItems.ts`: identisch
3. `useHiddenItems.ts` Zeile 95-108: Einzel-Inserts → Array-Insert
4. `useBackshopHiddenItems.ts`: identisch
5. `useBlocks.ts` Zeile 111-120: Sequentielle Updates → evtl. RPC
6. `publish-version.ts` Zeile 185-188: Einzel-Deletes → `.in('id', [...])`

**Fix pro Stelle:**
- Upserts/Inserts: Array an `.upsert([...items])` / `.insert([...items])` übergeben statt Schleife
- Deletes: `.delete().in('id', ids)` statt Schleife

---

### [x] M4 **[WEAK]** – Hidden Items: `store_id` fehlt im Optimistic Update

**Dateien:** `src/hooks/useHiddenItems.ts` (Zeile 52), `src/hooks/useBackshopHiddenItems.ts` (Zeile 52)

**Fix:** `store_id: currentStoreId!` zum optimistischen Objekt hinzufügen.

---

### [x] M5 **[STRONG]** – Layout Settings: Timeout-Logik + Cache-Abhängigkeit

**Datei:** `src/hooks/useLayoutSettings.ts` (Zeile 60-76)

**Fix:**
1. `AbortController` nutzen statt `Promise.race` mit Timeout
2. Fallback wenn Cache leer: Settings direkt aus DB laden statt Fehler werfen

---

### [x] M6 **[WEAK]** – Fehlende Error-States auf 5+ Seiten

**Betroffene:** HiddenItems, HiddenProductsPage, RenamedProductsPage, SuperAdminStoreDetailPage, UserManagement

**Fix:** Auf jeder Seite `isError` der Haupt-Queries prüfen und Error-Banner anzeigen (analog zu MasterList).

---

### [x] M7 **[WEAK]** – Fehlende Loading-States auf Dashboards

**Dateien:** AdminDashboard.tsx, UserDashboard.tsx

**Fix:** Skeleton anzeigen während `useIsUserListVisible` lädt.

---

### [x] M8 **[WEAK]** – useAppMutation: Kein Default-Error-Handling

**Datei:** `src/hooks/useAppMutation.ts` (Zeile 31-32)

**Fix:**
```ts
onError: options.onError ?? ((error: Error) => {
  toast.error(`Fehler: ${error.message}`)
}),
```

---

### [x] M9 **[STRONG]** – Suchfelder ohne Debounce

**Betroffene:** FindInPageBar, HideProductsDialog, RenameProductsDialog, AddToOfferDialog, WarengruppenPanel, BackshopWarengruppenPanel, HideBackshopProductsDialog

**Fix:** `useDeferredValue` (React 18) oder eigenen `useDebounce`-Hook (300ms) für Suchtext verwenden.

---

### [x] M10 **[WEAK]** – Debounce-Cleanup fehlt in LayoutSettings

**Dateien:** `src/pages/LayoutSettingsPage.tsx` (Zeile 82-123), `src/pages/BackshopLayoutSettingsPage.tsx`

**Fix:** `useEffect`-Cleanup der `clearTimeout(debounceRef.current)` aufruft beim Unmount.

---

### [x] M11 **[WEAK]** – SuperAdmin-Detailseiten: Ungültige URL-Parameter → endloser Skeleton

**Dateien:** SuperAdminCompanyDetailPage.tsx, SuperAdminStoreDetailPage.tsx

**Fix:** Nach Laden prüfen: wenn `!isLoading && !data` → "Nicht gefunden"-Hinweis + Zurück-Button anzeigen.

---

### [x] M12 **[WEAK]** – BackshopMasterList: Kein `itemsRefetching`-Check + kein `visibilitychange`

**Datei:** `src/pages/BackshopMasterList.tsx`

**Fix:** Analog zu MasterList implementieren:
1. `isRefetching` von der Query nutzen und Error-Banner nur zeigen wenn nicht refetching
2. `visibilitychange`-Listener analog zu MasterList

---

### [x] M13 **[WEAK]** – CustomProductDialog: Submit per `onClick` statt `onSubmit`

**Betroffene:** CustomProductDialog, EditCustomProductDialog, BackshopCustomProductDialog, EditBackshopCustomProductDialog

**Fix:** `<form onSubmit={handleSubmit}>` um das Formular, Button-Typ auf `type="submit"` ändern.

---

### [x] M14 **[STRONG]** – Fehlende Zod-Validierung bei Login/User-Erstellung

**Dateien:** AuthContext.tsx, UserManagement.tsx

**Fix:** Zod-Schema für E-Mail, Personalnummer, Display-Name erstellen und vor dem API-Call validieren.

---

### [x] M15 **[WEAK]** – SuperAdmin: Switches ohne `disabled` während Mutation

**Datei:** SuperAdminStoreDetailPage.tsx (Zeile 480-517, 861-862, 900)

**Fix:** `disabled={mutation.isPending}` auf alle Switches/Checkboxen/Selects.

---

### [x] M16 **[STRONG]** – Kein Offline-Indikator

**Fix:** `navigator.onLine` + `online`/`offline` Events. Banner-Komponente anzeigen wenn offline.

---

### [x] M17 **[WEAK]** – User ohne Store sieht Dashboard-Karten die nicht funktionieren

**Dateien:** UserDashboard.tsx, AdminDashboard.tsx

**Fix:** Prüfen ob `currentStoreId` vorhanden ist. Wenn nicht, Hinweis anzeigen statt Karten.

---

### [x] M18 **[STRONG]** – Kein Version-Locking bei gleichzeitigem Publish

**Dateien:** publish-version.ts, publish-backshop-version.ts

**Fix:** Advisory Lock oder optimistisches Locking (z.B. `updated_at`-Check vor Publish). Alternativ: im RPC prüfen ob bereits eine aktive Version existiert bevor eine neue erstellt wird.

---

## NIEDRIG – Nice to have / Code-Qualität

### [x] N1 **[WEAK]** – Multi-Tab: Store nicht synchron (sessionStorage)
Akzeptables Verhalten für V1. Spätere Lösung: BroadcastChannel oder localStorage + storage-Event.

### [x] N2 **[WEAK]** – Multi-Tab: Testmodus-Inkonsistenz
`window.fetch` ist global, React-State ist lokal. Später: Testmodus in localStorage speichern + storage-Event.

### [x] N3 **[WEAK]** – Direkte Rollenvergleiche statt Auth-Helfer
BackshopMasterList (Zeile 45-46), NotFound (Zeile 15): `profile?.role === 'viewer'` statt `isViewer`. Ersetzen für Konsistenz.

### [x] N4 **[WEAK]** – HideProductsDialog: Doppelte Suchlogik (DRY)
Zeile 72-78: `isMatch` dupliziert `filterItemsBySearch` aus `plu-helpers`. Ersetzen.

### [x] N5 **[WEAK]** – PLU-Helpers: Leere Namen inkonsistent behandelt
`groupItemsByLetter` (Zeile 141-142) hat keinen Fallback für leere Buchstaben. `letterGroup` (Zeile 175) nutzt `|| '?'`. Vereinheitlichen.

### [x] N6 **[STRONG]** – PDF: Zeichenweise Kürzung → Binäre Suche wäre schneller
pdf-generator.ts Zeile 328-334 und 606-612. Performance-Optimierung für lange Namen.

### [x] N7 **[WEAK]** – MasterList: `fontSizes` ohne `useMemo`
MasterList.tsx Zeile ~119: Objekt wird bei jedem Render neu erstellt.

### [x] N8 **[WEAK]** – PDF: `onOpenChange(false)` vor Print-Dialog
ExportPDFDialog: Dialog schließt bevor iframe.onload den Druckdialog öffnet. Reihenfolge prüfen.

### [x] N9 **[STRONG]** – Version-Hooks: Race bei Fallback
useActiveVersion.ts (Zeile 21-34): Erst `status=active`, dann Fallback auf neueste. Race möglich.

### [x] N10 **[WEAK]** – AuthContext: `timeoutId`/`idleId` nicht im Cleanup
Zeile 256-260: Timeout und IdleCallback werden bei Unmount nicht gecleart. Minor – `mounted = false` verhindert Effekte.

### [x] N11 **[WEAK]** – Console.log/warn in Produktion
- `backshop-excel-images.ts`: 18 Stellen
- `publish-version.ts`: 3 Stellen
- `date-kw-utils.ts`: 1 Stelle
Nur in `import.meta.env.DEV` ausgeben oder entfernen.

### [x] N12 **[STRONG]** – Non-null Assertions (`!`) an unsicheren Stellen
~50+ Stellen, besonders: Route-Parameter in SuperAdminStoreDetailPage, `currentStoreId!` in allen Hooks, PDF-Generator.
Schrittweise durch Null-Checks ersetzen.

### [x] N13 **[STRONG]** – Viele `as never` Casts für Supabase-Typen
`supabase gen types` ausführen würde viele eliminieren.

### [x] N14 **[STRONG]** – Keine Response-Validierung für Edge Functions
Zod-Schema für Edge-Function-Responses ergänzen.

### [x] N15 **[STRONG]** – `radix-ui` Meta-Paket statt Einzel-Imports
Kann Tree-Shaking beeinträchtigen. Auf `@radix-ui/react-*` Einzel-Pakete umstellen.

### [x] N16 **[WEAK]** – `@dnd-kit` nicht als eigener Chunk in vite.config.ts
In `manualChunks` aufnehmen.

### [x] N17 **[WEAK]** – Kein `.env.example` für Entwickler-Onboarding
Erstellen mit den benötigten Variablen (ohne Werte).

### [x] N18 **[WEAK]** – NotFound-Seite nicht in ProtectedRoute
Funktional ok, aber inkonsistent. Optional wrappen.

### [x] N19 **[WEAK]** – Login: `aria-label` fehlt bei Passwort-Toggle
LoginPage: Button zum Ein-/Ausblenden des Passworts hat kein `aria-label`.

### [x] N20 **[WEAK]** – Dialog-Close-Button auf Englisch
`dialog.tsx`: `<span className="sr-only">Close</span>` → `Schließen`.

### [x] N21 **[WEAK]** – PLU-Status nur farblich (Barrierefreiheit)
Für farbenblinde Nutzer: zusätzliche Icons oder Text wie „Neu"/„Geändert" neben der Farbe.

### [x] N22 **[WEAK]** – Checkbox ohne Label in HideProductsDialog
Zeile 171: `id="select-all"` ohne `<Label htmlFor="select-all">`.

### [x] N23 **[STRONG]** – TestModeContext: Teurer JSON.stringify für Snapshot
Bei vielen Queries kann das spürbar langsam sein. Nur relevante Queries serialisieren.

### [x] N24 **[STRONG]** – Keine Error Reporting an externen Service
Nur `console.error` in ErrorBoundary. Sentry/LogRocket o.ä. für Produktion.

### [x] N25 **[STRONG]** – Kein `window.onerror` / `unhandledrejection` Handler
Unhandled Errors gehen verloren. Global Handler einrichten.

### [x] N26 **[WEAK]** – HomeRedirect hat andere Loading-UI als ProtectedRoute
Spinner vs. Skeleton – vereinheitlichen.

---

## Übersicht

| Priorität | Anzahl | Status |
|-----------|--------|--------|
| Kritisch  | 6      | 6/6 erledigt |
| Hoch      | 12     | 12/12 erledigt |
| Mittel    | 18     | 18/18 erledigt |
| Niedrig   | 26     | 26/26 erledigt |
| **Gesamt**| **62** | **62/62 erledigt** |

### Modell-Empfehlung (Zusammenfassung)

| Modell   | Anzahl | IDs (Beispiele) |
|----------|--------|------------------|
| **STRONG** (starkes Modell) | **28** | K1, K3–K6, H1–H5, H9–H10, H12, M3, M5, M9, M14, M16, M18, N6, N9, N12–N15, N23–N25 |
| **WEAK** (schnelles Modell)  | **34** | K2, H6–H8, H11, M1–M2, M4, M6–M8, M10–M13, M15, M17, N1–N5, N7–N8, N10–N11, N16–N22, N26 |

**Tipp:** Zuerst alle **[WEAK]**-Punkte mit dem günstigen Modell abarbeiten, dann **[STRONG]** mit dem starken Modell.
