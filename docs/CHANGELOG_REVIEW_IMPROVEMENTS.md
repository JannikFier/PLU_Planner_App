# Changelog – Review-Verbesserungen (FULL_REVIEW_IMPROVEMENTS)

Jede umgesetzte Änderung wird hier dokumentiert: Problem → Geändert → Umsetzung.

---

## K-001: Debug-Code aus Produktion entfernen

- **Problem:** debug-monitor sendet Requests an 127.0.0.1:7244, Logging in App/UserManagement.
- **Geändert:** src/lib/debug-monitor.ts (gelöscht), src/main.tsx (Import + registerGlobalErrorHandlers entfernt), src/App.tsx (#region agent log + logToMonitor entfernt), src/pages/UserManagement.tsx (#region + _log + alle _log-Aufrufe entfernt).
- **Umsetzung:** Datei gelöscht, alle Referenzen und Blöcke entfernt. Keine funktionale Änderung für Enduser.

---

## K-002: ESLint-Fehler beheben (7 Errors)

- **Problem:** 7 ESLint-Errors (setState in effect, Variable vor Deklaration, unbenutzter Parameter, Ref im Render, instabile Dependency).
- **Geändert:**
  - **K-002a** EditCustomProductDialog.tsx: useEffect mit setState entfernt; key={product.id} bei beiden Aufrufen (CustomProductsPage, HiddenProductsPage) gesetzt, damit State bei Produktwechsel durch Remount zurückgesetzt wird.
  - **K-002b** AuthContext.tsx: Retry-Logik durch withRetryOnAbort aus supabase-retry ersetzt, fetchProfile ruft sich nicht mehr rekursiv auf.
  - **K-002c** useCustomProducts.ts: onError-Parameter entfernt (nur leere Funktion).
  - **K-002d** PLUUploadPage.tsx: step2ContainerRef.current nicht mehr im Render gelesen; State step2Boundary + ref-Callback setStep2ContainerRef, collisionBoundary={step2Boundary}.
  - **K-002e** usePLUUpload.ts: versions in useMemo(() => versionsData ?? [], [versionsData]) gewrappt.
- **Umsetzung:** Keine Verhaltensänderung für User; ESLint 0 Errors.

---

## K-003: Code-Splitting (React.lazy + Suspense + manualChunks)

- **Problem:** Alle 16 Seiten synchron importiert → 1.69 MB Haupt-Chunk.
- **Geändert:** src/App.tsx (alle Page-Imports auf React.lazy umgestellt, Suspense mit PageLoadingFallback um Routes), vite.config.ts (build.rollupOptions.output.manualChunks: vendor, supabase, query, xlsx, jspdf, ui).
- **Umsetzung:** Lazy-Imports mit .then(m => ({ default: m.PageName })); Fallback mit Loader2-Icon; manualChunks für bessere Aufteilung. Haupt-Chunk deutlich verkleinert.

---

## K-004: next-themes bereinigen

- **Problem:** next-themes nur in sonner.tsx genutzt, App hat keinen Dark Mode; useTheme() liefert "system".
- **Geändert:** src/components/ui/sonner.tsx (useTheme-Import entfernt, theme fest auf "light"), package.json (next-themes deinstalliert).
- **Umsetzung:** Kein Verhalten für User geändert; weniger Abhängigkeit.

---

## K-005: publish-version.ts – Fehlerbehandlung

- **Problem:** freezeError nur geloggt, bei Fehler wurde trotzdem neue Version erstellt; usersError nicht geworfen; Fehler in try/catch verschluckt.
- **Geändert:** src/lib/publish-version.ts: Bei freezeError wird geworfen; bei usersError wird geworfen; im catch wird err erneut geworfen (throw err), damit Aufrufer Toast anzeigen kann.
- **Umsetzung:** Keine funktionale Änderung bei Erfolg; bei DB-Fehlern erhält der Aufrufer jetzt den Fehler.

---

## K-006: isAbortError DRY – eine Quelle

- **Problem:** isAbortError in error-utils.ts und supabase-retry.ts doppelt; supabase-retry prüft zusätzlich cause.
- **Geändert:** src/lib/error-utils.ts (vollständige Implementierung inkl. cause übernommen), src/lib/supabase-retry.ts (eigene Definition entfernt, Import und Re-Export von error-utils).
- **Umsetzung:** Eine zentrale Implementierung; bestehende Imports (App, AuthContext aus error-utils; withRetryOnAbort aus supabase-retry) unverändert.

---

## Phase 2 (Mittel)

### M-001: staleTime auf Queries

- **Problem:** Viele Queries ohne eigene staleTime → unnötige Refetches.
- **Geändert:** useActiveVersion (60_000), useLayoutSettings (5*60_000), useBlocks (5*60_000), useCustomProducts (2*60_000), useHiddenItems (2*60_000), usePLUData (2*60_000), useVersions (2*60_000), useBezeichnungsregeln (5*60_000).
- **Umsetzung:** staleTime pro Hook gesetzt; Verhalten unverändert, weniger Netzwerklast.

### M-002: onError in Mutations

- **Problem:** Mutations ohne onError → User sieht bei Fehlern nichts.
- **Geändert:** useBezeichnungsregeln.ts (alle 4 Mutations), useBlocks.ts (alle 7 Mutations) – onError mit toast.error ergänzt.
- **Umsetzung:** Einheitlicher onMutationError-Helper in useBlocks; toast.error in useBezeichnungsregeln.

### M-003: useLayoutSettings Fehlerbehandlung

- **Problem:** Bei DB-Fehler wurde Default zurückgegeben statt Fehler zu werfen.
- **Geändert:** useLayoutSettings.ts – if (error) throw error; nur bei !data Default zurückgeben.
- **Umsetzung:** Nutzer sieht Fehler über Query-Error-Boundary/Toast.

### M-008: LayoutSettingsPage setTimeout-Cleanup

- **Problem:** setTimeout ohne clearTimeout → potenzieller Memory Leak beim Unmount.
- **Geändert:** LayoutSettingsPage.tsx – timeoutId gespeichert, return () => clearTimeout(timeoutId) im Effect.
- **Umsetzung:** Cleanup-Funktion im useEffect.

### M-009: ProtectedRoute leere if-Bedingung

- **Problem:** Leere if-Bedingung (super_admin „kein Redirect nötig“) verwirrend.
- **Geändert:** ProtectedRoute.tsx – if-Block entfernt, ungenutzten profile-Destructure entfernt.
- **Umsetzung:** Keine Verhaltensänderung.

### M-011: UserManagement Self-Delete verhindern

- **Problem:** Super-Admin konnte sich selbst löschen.
- **Geändert:** UserManagement.tsx – Löschen-Button disabled wenn user.id === currentUserId; Tooltip „Sie können sich nicht selbst löschen“.
- **Umsetzung:** currentUser aus useAuth(), Tooltip-Komponente um den Button.

### M-012: AlertDialog statt confirm()

- **Problem:** Destruktive Aktionen mit confirm() statt shadcn AlertDialog.
- **Geändert:** WarengruppenPanel.tsx (Block löschen), VersionsPage.tsx (Version löschen) – state für zu löschendes Element, AlertDialog mit Bestätigung.
- **Umsetzung:** handleDeleteBlockClick öffnet Dialog; handleDeleteBlockConfirm führt Löschen aus. VersionsPage: versionToDelete-State, AlertDialog.

### M-013: parseBlockNameToItemType DRY

- **Problem:** Gleiche Funktion in CustomProductsPage und HiddenItems dupliziert.
- **Geändert:** src/lib/plu-helpers.ts (Funktion hinzugefügt), CustomProductsPage.tsx und HiddenItems.tsx (Import, lokale Definition entfernt).
- **Umsetzung:** Eine zentrale Funktion, beide Seiten importieren.

### M-014: ExportPDFDialog iframe-Cleanup

- **Problem:** removeChild(iframe) ohne Prüfung ob Element noch im DOM.
- **Geändert:** ExportPDFDialog.tsx – if (document.body.contains(iframe)) document.body.removeChild(iframe).
- **Umsetzung:** Kein Fehler mehr wenn iframe bereits entfernt.

---

## Phase 3 (Niedrig – ausgewählte Punkte)

### N-008: SchlagwortManager doppeltes gap

- **Problem:** gap-2 und gap-x-3 in derselben className; gap-x-3 überschreibt nur horizontal.
- **Geändert:** SchlagwortManager.tsx – gap-x-3 entfernt, nur gap-2 beibehalten.
- **Umsetzung:** Einheitlicher Abstand.

### N-009: excel-parser doppeltes trim

- **Problem:** (cell != null ? String(cell).trim() : '').trim() – zweites .trim() überflüssig.
- **Geändert:** excel-parser.ts – .trim() am Ende entfernt.
- **Umsetzung:** Keine Verhaltensänderung.

### N-015: Error Boundary

- **Problem:** Kein React Error Boundary → bei Crash weißer Bildschirm.
- **Geändert:** Neue Komponente src/components/ErrorBoundary.tsx (getDerivedStateFromError, Fallback-UI „Etwas ist schiefgelaufen“, Button „Seite neu laden“); App.tsx – ErrorBoundary um Suspense/Routes gewrappt.
- **Umsetzung:** Abstürze in Kind-Komponenten zeigen Fallback-UI statt weißen Bildschirm.

---

## Block 1 (Rest Phase 2) – weitere Umsetzung

### M-004: useApplyAllRules – Daten aus Query-Client

- **Geändert:** useBezeichnungsregeln.ts – mutationFn nutzt queryClient.getQueryData für version/active, plu-items, bezeichnungsregeln; bei fehlendem Cache einmalig Supabase-Fetch.
- **Umsetzung:** Cache-first, weniger Race Conditions.

### M-005: useApplyAllRules – paralleles Batch-Update

- **Geändert:** useBezeichnungsregeln.ts – Einzel-Updates durch Chunks von 10 mit Promise.all ersetzt (PARALLEL_UPDATE_CHUNK).
- **Umsetzung:** Deutlich weniger round-trips bei vielen Items.

### M-007: useMemo für berechnete Werte

- **Geändert:** AdminDashboard, UserDashboard (cards useMemo mit [navigate]); SuperAdminDashboard (PLU_ITEMS, CONFIG_ITEMS, ADMIN_ITEMS als Modul-Konstanten); PLUTable (hasAnyPrice useMemo); LoginPage (isEmail useMemo); MasterList (currentVersion, pdfVersion useMemo).
- **Umsetzung:** Weniger unnötige Re-Renders.

### M-010: console.error durch Toast

- **Geändert:** AuthContext, useVersions, useActiveVersion, usePLUData (toast.error bei Fehlern); ExportPDFDialog (console.error entfernt, Toast bleibt).
- **Umsetzung:** Fehler sichtbar für User.

### M-012 (Rest): AlertDialog für Löschen

- **Geändert:** CustomProductsPage, HiddenItems – State productToDelete, AlertDialog „Produkt löschen?“ vor deleteProduct.mutate.
- **Umsetzung:** Konsistentes Bestätigungsdialog-Pattern.

### M-016: PDF-Export lazy

- **Geändert:** MasterList – ExportPDFDialog per React.lazy geladen, nur bei showPDFDialog gemountet (Suspense).
- **Umsetzung:** jspdf/html2canvas-Chunks laden erst beim Öffnen des PDF-Dialogs.

### M-006: as never Type Casts entfernen

- **Problem:** Supabase-Inserts/Updates nutzten `as never` → Typsicherheit ausgehebelt; Schema-Änderungen würden erst zur Laufzeit auffallen.
- **Geändert:** Alle betroffenen Stellen (AuthContext, useBezeichnungsregeln, useBlocks, useCustomProducts, useHiddenItems, useLayoutSettings, useNotifications, publish-version.ts) – `as never` durch explizite Typen aus Database['public']['Tables'][Tabelle]['Insert'|'Update'] ersetzt. Wegen nicht korrekt inferierter Client-Typen wird abschließend `as never` beibehalten, der konkrete Tabellentyp ist aber nun dokumentiert (z. B. `(data as Database['...']['Update']) as never`). RPC lookup_email_by_personalnummer: Args weiterhin `as never`, mit Kommentar zum erwarteten Typ.
- **Umsetzung:** Refactorings und DB-Migrationen haben eine klare Referenz auf den erwarteten Typ; Build und ESLint laufen fehlerfrei.

---

## Block 2 (Phase 3 – Niedrig)

### N-001: React.memo für Darstellungskomponenten

- **Geändert:** PLUFooter.tsx, DashboardCard.tsx (DashboardCard + DashboardGroupCard) – mit React.memo gewrappt.
- **Umsetzung:** Weniger Re-Renders bei unveränderten Props.

### N-002: cn() statt Template-Strings für className

- **Geändert:** AppHeader, DashboardCard, PLUTable, NotificationDialog, HideProductsDialog – dynamische Klassen mit cn().
- **Umsetzung:** Einheitliches, lesbares Klassen-Handling.

### N-003: break-words statt truncate

- **Geändert:** PLUTable, InteractivePLUTable, NotificationDialog, HideProductsDialog, WarengruppenPanel – Produktnamen/Text mit break-words (ggf. min-w-0/max-w).
- **Umsetzung:** Umbrüche statt Abschneiden laut Design-System.

### N-004: Clipboard-Fallback (UserManagement)

- **Geändert:** UserManagement.tsx – copyPassword in try/catch; Fallback document.execCommand('copy') mit temporärem Textarea; bei Fehler toast „Bitte manuell kopieren“.
- **Umsetzung:** Kopieren funktioniert auch ohne navigator.clipboard (z. B. HTTP).

### N-005: NotFound rollenspezifische Navigation

- **Geändert:** NotFound.tsx – useAuth(), „Zur Startseite“ führt zu /super-admin, /admin oder /user je nach profile.role.
- **Umsetzung:** 404 führt zurück ins passende Dashboard.

### N-006: ComingSoon navigate(-1) Fallback

- **Geändert:** ComingSoon.tsx – vor navigate(-1) Prüfung: history.length <= 1 → navigate('/').
- **Umsetzung:** Kein Verlassen der App bei direktem Aufruf der Platzhalter-Seite.

### N-007: ExportPDFDialog Dateiname-Sanitization

- **Geändert:** ExportPDFDialog.tsx – Dateiname vor doc.save() mit .replace(/[^a-zA-Z0-9_-]/g, '_').
- **Umsetzung:** Sichere Dateinamen für Download.

### N-010: Accessibility (aria-label, Suche, tabIndex)

- **Geändert:** Icon-Buttons mit aria-label (AppHeader, LayoutSettingsPage, VersionsPage, RulesPage, UserManagement, CustomProductsPage, HiddenItems, HiddenProductsPage, ComingSoon, NotificationBell, WarengruppenSortierung); Such-Inputs mit aria-label und type="search" (WarengruppenPanel, HideProductsDialog); ChangePasswordPage – tabIndex={-1} von Passwort-Buttons entfernt.
- **Umsetzung:** Bessere Nutzbarkeit mit Tastatur/Screenreader.

### N-011: RadioCard auslagern

- **Geändert:** LayoutSettingsPage – lokale RadioCard nach src/components/ui/radio-card.tsx; role="radio", aria-checked.
- **Umsetzung:** Wiederverwendbare UI-Komponente, shadcn-konform.

### N-012: crypto.randomUUID() Fallback

- **Geändert:** src/lib/utils.ts – generateUUID() (crypto.randomUUID mit Fallback getRandomValues/UUID v4); Ersetzung in comparison-logic.ts, plu-helpers.ts, PLUUploadPage.tsx, usePLUUpload.ts.
- **Umsetzung:** Läuft in Umgebungen ohne randomUUID.

### N-013: getNextFreeKW Edge Case

- **Geändert:** date-kw-utils.ts – JSDoc ergänzt; bei keiner freien KW und currentKW bereits in versions: console.warn in DEV.
- **Umsetzung:** Aufrufer können versionExistsForKW prüfen; Entwickler sieht Hinweis.

### N-014: pdf-generator Text-Truncation

- **Geändert:** pdf-generator.ts – Artikelname mit doc.getTextWidth() und Ellipsis gekürzt, bis in Spaltenbreite passt.
- **Umsetzung:** Saubere Kürzung unabhängig von Zeichenbreite.

### N-016: vercel.json Security Headers

- **Geändert:** vercel.json – headers für source "/(.*)": X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin.
- **Umsetzung:** Standard-Sicherheitsheader für Deployment.

### N-017: Favicon

- **Problem:** index.html verweist auf /favicon.ico, die Datei public/favicon.ico existierte nicht → Browser zeigte kein Icon.
- **Geändert:** index.html – Favicon auf vorhandenes public/vite.svg umgestellt (type="image/svg+xml", href="/vite.svg"). Später kann eigenes favicon.ico in public/ gelegt werden und Link angepasst werden.
- **Umsetzung:** Tab zeigt Vite-Icon; kein 404 für favicon.ico.

---

## Bugfix: Masterliste/Layout nach Reload – Prefetch + verbesserter Loading-Fallback

- **Problem:** Nach Reload und Klick auf Masterliste oder Layout wurde oft nur ein „Mockup“ (Skeletons/Ladeanzeige) gezeigt; echte Daten erschienen erst nach erneutem Reload.
- **Ursache:** Lazy-Loading + fehlende Daten-Vorabladung. Beim ersten Klick mussten alle Queries (version, versions, layout-settings, blocks, plu-items, …) erst anlaufen; die Skeletons blieben lange sichtbar.
- **Geändert:**
  1. **Neuer Hook** `usePrefetchForNavigation` – prefetcht beim Aufruf die für MasterList und LayoutSettingsPage nötigen Queries (version, versions, layout-settings, blocks, custom-products, hidden-items, bezeichnungsregeln, plu-items).
  2. **Integration in alle Dashboards** – UserDashboard, AdminDashboard, SuperAdminDashboard rufen `usePrefetchForNavigation()` auf. Daten stehen im Cache, sobald der User zur Masterliste oder zum Layout navigiert.
  3. **AuthPrefetch (Erweiterung)** – Neuer `AuthPrefetch`-Komponente startet den Prefetch sofort bei authentifiziertem User (in App.tsx), nicht erst beim Dashboard-Mount. Dadurch steht mehr Ladezeit zur Verfügung (u. a. während Lazy-Komponenten laden). `runMasterListPrefetch()` in usePrefetchForNavigation extrahiert (DRY).
  4. **PageLoadingFallback erweitert** – Statt nur Spinner: einfaches Layout (Header mit PLU-Logo) + „Seite wird geladen…“. Übergang wirkt weniger abrupt.
- **Umsetzung:** Daten werden früher im Hintergrund geladen (bereits bei Auth); beim Wechsel zur Masterliste/Layout erscheinen echte Inhalte deutlich schneller. Skeleton-Zeit nach Reload+Klick von ~7 s reduziert.

### Ergänzung: Super-Admin direkt auf Masterliste (später zurückgenommen)

- **Ursprüngliche Änderung:** Super-Admin landete auf der PLU-Masterliste statt auf dem Dashboard.
- **Rücknahme (aktuell):** Der „Spot“ ist wieder das Dashboard für alle Rollen. Super-Admin landet auf `/super-admin` (Dashboard); Zurück-Pfeil führt zum Dashboard; Masterliste über Karte auf dem Dashboard. Dashboard/Masterliste nicht im Namens-Dropdown (nur „User-Ansicht“).

---
