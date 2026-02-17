# PLU Planner – Offene Verbesserungen (nach Review 2026-02)

**Stand:** Nach Durchführung der meisten Punkte aus dem ursprünglichen Review.  
**Offen:** 2 Punkte (M-006, N-017)  
**Zweck:** Klare, ausführliche Anleitung für einen Bot/Agent zum Abarbeiten der restlichen Aufgaben.

Erledigte Punkte sind in [docs/CHANGELOG_REVIEW_IMPROVEMENTS.md](docs/CHANGELOG_REVIEW_IMPROVEMENTS.md) dokumentiert.

---

## Übersicht

| Punkt | Priorität | Beschreibung |
|-------|-----------|--------------|
| **M-006** | Mittel | `as never` Type Casts entfernen – Typsicherheit bei Supabase |
| **N-017** | Niedrig | Favicon hinzufügen |

---

## M-006: `as never` Type Casts entfernen

### 2.1 Problemerklärung

`as never` ist ein TypeScript-Type-Assertion, das jeden Typ zu `never` umdeutet. Es wird im Projekt verwendet, um TypeScript bei Supabase-Inserts und -Updates „ruhigzustellen“ – wenn die generierten Supabase-Typen nicht exakt mit dem übergebenen Objekt übereinstimmen, würde TypeScript einen Fehler werfen. Mit `as never` wird diese Prüfung umgangen.

**Warum das problematisch ist:** Die Typsicherheit geht verloren. Wenn sich das Datenbank-Schema ändert (z.B. neue Pflichtfelder, umbenannte Spalten), merkt TypeScript das nicht mehr. Fehler tauchen erst zur Laufzeit auf. Bei Refactorings oder DB-Migrationen ist das riskant.

**Wichtig:** Das Projekt hat bereits [src/types/database.ts](src/types/database.ts) mit vollständigen Typen für alle Tabellen (Row, Insert, Update). Der Supabase-Client ist mit `createClient<Database>(...)` typisiert. Statt `as never` können die korrekten Types aus dieser Datei verwendet werden.

---

### 2.2 Betroffene Stellen – vollständige Liste

| Datei | Zeile | Aktueller Code | Tabelle | Typ |
|-------|-------|----------------|---------|-----|
| AuthContext.tsx | 322 | `'lookup_email_by_personalnummer' as never` | RPC | siehe Hinweis unten |
| AuthContext.tsx | 323 | `{ p_nummer: personalnummer } as never` | RPC | siehe Hinweis unten |
| AuthContext.tsx | 350 | `{ must_change_password: false } as never` | profiles | Update |
| useBezeichnungsregeln.ts | 42 | `regel as never` | bezeichnungsregeln | Insert |
| useBezeichnungsregeln.ts | 71 | `updates as never` | bezeichnungsregeln | Update |
| useBezeichnungsregeln.ts | 166 | `{ display_name: update.display_name } as never` | master_plu_items | Update |
| useBlocks.ts | 55 | `{ name, order_index: ... } as never` | blocks | Insert |
| useBlocks.ts | 77 | `{ name } as never` | blocks | Update |
| useBlocks.ts | 117 | `{ order_index: block.order_index } as never` | blocks | Update |
| useBlocks.ts | 138 | `{ block_id: blockId } as never` | master_plu_items | Update |
| useBlocks.ts | 165 | `rule as never` | block_rules | Insert |
| useCustomProducts.ts | 50 | `} as never)` (Insert-Objekt) | custom_products | Insert |
| useCustomProducts.ts | 96 | `rows as never` | custom_products | Insert |
| useCustomProducts.ts | 130 | `updates as never` | custom_products | Update |
| useCustomProducts.ts | 179 | `} as never)` (is_manually_renamed: true) | master_plu_items | Update |
| useCustomProducts.ts | 205 | `} as never)` (is_manually_renamed: false) | master_plu_items | Update |
| useHiddenItems.ts | 37 | `{ plu, hidden_by: user.id } as never` | hidden_items | Insert |
| useHiddenItems.ts | 74 | `{ plu, hidden_by: user.id } as never` | hidden_items | Insert |
| useLayoutSettings.ts | 73 | `updates as never` | layout_settings | Update |
| useNotifications.ts | 70 | `} as never)` (is_read, read_at) | version_notifications | Update |
| publish-version.ts | 43 | `} as never)` (versions freeze) | versions | Update |
| publish-version.ts | 58 | `} as never)` (versions insert) | versions | Insert |
| publish-version.ts | 87 | `batch as never` | master_plu_items | Insert (Array) |
| publish-version.ts | 100 | `} as never)` (versions activate) | versions | Update |
| publish-version.ts | 132 | `batch as never` | version_notifications | Insert (Array) |

**RPC-Hinweis:** Bei `lookup_email_by_personalnummer` wird der Funktionsname und die Args mit `as never` übergeben. In database.ts ist die Signatur definiert: `Args: { p_nummer: string }`, `Returns: string | null`. Der Name-Cast kann oft entfallen; für Args reicht ggf. `as { p_nummer: string }` falls TypeScript meckert.

---

### 2.3 Schritt-für-Schritt-Anleitung

#### Schritt 1 – Import prüfen

In jeder betroffenen Datei muss `import type { Database } from '@/types/database'` existieren. Wenn nicht, am Dateianfang hinzufügen.

#### Schritt 2 – Ersetzungsregel

- Bei `.insert(data)`: `data as never` → `data as Database['public']['Tables']['TABELLENNAME']['Insert']`
- Bei `.insert(batch)` mit Array: `batch as never` → `batch as Database['public']['Tables']['TABELLENNAME']['Insert'][]`
- Bei `.update(data)`: `data as never` → `data as Database['public']['Tables']['TABELLENNAME']['Update']`

---

### 2.4 Konkrete Vorher/Nachher-Beispiele pro Datei

#### AuthContext.tsx

```ts
// Zeile 322-324 – Vorher
const { data: email, error: lookupError } = await supabase.rpc(
  'lookup_email_by_personalnummer' as never,
  { p_nummer: personalnummer } as never
) as { data: string | null; error: { message: string } | null }

// Zeile 322-324 – Nachher (RPC: Name-Cast entfällt oft; Args mit Typ)
const { data: email, error: lookupError } = await supabase.rpc(
  'lookup_email_by_personalnummer',
  { p_nummer: personalnummer } as { p_nummer: string }
) as { data: string | null; error: { message: string } | null }
```

```ts
// Zeile 350 – Vorher
.update({ must_change_password: false } as never)

// Zeile 350 – Nachher
.update({ must_change_password: false } as Database['public']['Tables']['profiles']['Update'])
```

#### useBezeichnungsregeln.ts

```ts
// Zeile 42 – Vorher
.insert(regel as never)

// Zeile 42 – Nachher
.insert(regel as Database['public']['Tables']['bezeichnungsregeln']['Insert'])
```

```ts
// Zeile 71 – Vorher
.update(updates as never)

// Zeile 71 – Nachher
.update(updates as Database['public']['Tables']['bezeichnungsregeln']['Update'])
```

```ts
// Zeile 166 – Vorher
.update({ display_name: update.display_name } as never)

// Zeile 166 – Nachher
.update({ display_name: update.display_name } as Database['public']['Tables']['master_plu_items']['Update'])
```

#### useBlocks.ts

```ts
// Zeile 55 – Vorher
.insert({ name, order_index: order_index ?? 0 } as never)

// Zeile 55 – Nachher
.insert({ name, order_index: order_index ?? 0 } as Database['public']['Tables']['blocks']['Insert'])
```

```ts
// Zeile 77 – Vorher
.update({ name } as never)

// Zeile 77 – Nachher
.update({ name } as Database['public']['Tables']['blocks']['Update'])
```

```ts
// Zeile 117 – Vorher
.update({ order_index: block.order_index } as never)

// Zeile 117 – Nachher
.update({ order_index: block.order_index } as Database['public']['Tables']['blocks']['Update'])
```

```ts
// Zeile 138 – Vorher
.update({ block_id: blockId } as never)

// Zeile 138 – Nachher
.update({ block_id: blockId } as Database['public']['Tables']['master_plu_items']['Update'])
```

```ts
// Zeile 165 – Vorher
.insert(rule as never)

// Zeile 165 – Nachher
.insert(rule as Database['public']['Tables']['block_rules']['Insert'])
```

#### useCustomProducts.ts

```ts
// Zeile 43-50 – Vorher
.insert({
  plu: product.plu,
  name: product.name,
  item_type: product.item_type,
  preis: product.preis ?? null,
  block_id: product.block_id ?? null,
  created_by: user.id,
} as never)

// Zeile 43-50 – Nachher
.insert({
  plu: product.plu,
  name: product.name,
  item_type: product.item_type,
  preis: product.preis ?? null,
  block_id: product.block_id ?? null,
  created_by: user.id,
} as Database['public']['Tables']['custom_products']['Insert'])
```

```ts
// Zeile 96 – Vorher
.insert(rows as never)

// Zeile 96 – Nachher
.insert(rows as Database['public']['Tables']['custom_products']['Insert'][])
```

```ts
// Zeile 130 – Vorher
.update(updates as never)

// Zeile 130 – Nachher
.update(updates as Database['public']['Tables']['custom_products']['Update'])
```

```ts
// Zeile 175-179 – Vorher
.update({
  display_name: displayName,
  is_manually_renamed: true,
} as never)

// Zeile 175-179 – Nachher
.update({
  display_name: displayName,
  is_manually_renamed: true,
} as Database['public']['Tables']['master_plu_items']['Update'])
```

```ts
// Zeile 201-205 – Vorher
.update({
  display_name: systemName,
  is_manually_renamed: false,
} as never)

// Zeile 201-205 – Nachher
.update({
  display_name: systemName,
  is_manually_renamed: false,
} as Database['public']['Tables']['master_plu_items']['Update'])
```

#### useHiddenItems.ts

```ts
// Zeile 37 – Vorher
.insert({ plu, hidden_by: user.id } as never)

// Zeile 37 – Nachher
.insert({ plu, hidden_by: user.id } as Database['public']['Tables']['hidden_items']['Insert'])
```

```ts
// Zeile 74 – Vorher
.insert({ plu, hidden_by: user.id } as never)

// Zeile 74 – Nachher
.insert({ plu, hidden_by: user.id } as Database['public']['Tables']['hidden_items']['Insert'])
```

#### useLayoutSettings.ts

```ts
// Zeile 73 – Vorher
.update(updates as never)

// Zeile 73 – Nachher
.update(updates as Database['public']['Tables']['layout_settings']['Update'])
```

#### useNotifications.ts

```ts
// Zeile 67-70 – Vorher
.update({
  is_read: true,
  read_at: new Date().toISOString(),
} as never)

// Zeile 67-70 – Nachher
.update({
  is_read: true,
  read_at: new Date().toISOString(),
} as Database['public']['Tables']['version_notifications']['Update'])
```

#### publish-version.ts

```ts
// Zeile 39-43 – Vorher
.update({
  status: 'frozen',
  frozen_at: new Date().toISOString(),
  delete_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
} as never)

// Zeile 39-43 – Nachher
.update({
  status: 'frozen',
  frozen_at: new Date().toISOString(),
  delete_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
} as Database['public']['Tables']['versions']['Update'])
```

```ts
// Zeile 52-58 – Vorher
.insert({
  kw_nummer: kwNummer,
  jahr,
  status: 'draft',
  created_by: createdBy,
} as never)

// Zeile 52-58 – Nachher
.insert({
  kw_nummer: kwNummer,
  jahr,
  status: 'draft',
  created_by: createdBy,
} as Database['public']['Tables']['versions']['Insert'])
```

```ts
// Zeile 87 – Vorher (Array-Insert)
.insert(batch as never)

// Zeile 87 – Nachher
.insert(batch as Database['public']['Tables']['master_plu_items']['Insert'][])
```

```ts
// Zeile 96-100 – Vorher
.update({
  status: 'active',
  published_at: new Date().toISOString(),
} as never)

// Zeile 96-100 – Nachher
.update({
  status: 'active',
  published_at: new Date().toISOString(),
} as Database['public']['Tables']['versions']['Update'])
```

```ts
// Zeile 132 – Vorher (Array-Insert)
.insert(batch as never)

// Zeile 132 – Nachher
.insert(batch as Database['public']['Tables']['version_notifications']['Insert'][])
```

---

### 2.5 Typ-Alias (optional, zur Lesbarkeit)

Statt des langen Pfads können am Dateianfang Aliase definiert werden:

```ts
type ProfilesUpdate = Database['public']['Tables']['profiles']['Update']
type VersionsInsert = Database['public']['Tables']['versions']['Insert']
// ...
```

Dann: `as ProfilesUpdate` statt `as Database['public']['Tables']['profiles']['Update']`.

---

### 2.6 Verifikation

- Nach jeder Datei (oder am Ende): `npm run build` – muss durchlaufen
- Am Ende: `npx eslint src/` – Ziel 0 Errors
- Falls TypeScript nach dem Entfernen von `as never` Fehler meldet: Das Objekt an den erwarteten Typ anpassen oder den passenden `Database['public']['Tables']['...']`-Typ verwenden

---

### 2.7 Alternative: Supabase Types neu generieren

Falls frische Types aus der Datenbank gewünscht sind:

```bash
npx supabase login
npx supabase gen types typescript --project-id <PROJECT_ID> > src/types/database.ts
```

**Hinweis:** Das überschreibt [src/types/database.ts](src/types/database.ts). Prüfen, ob alle Tabellen enthalten sind: custom_products, hidden_items, version_notifications, blocks, block_rules, bezeichnungsregeln, layout_settings, master_plu_items, versions, profiles. Die manuellen Types im Projekt sind aktuell vollständig – Neugenerierung ist optional.

---

## N-017: Favicon hinzufügen

### 3.1 Problemerklärung

In [index.html](index.html) Zeile 5 steht:

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

Die Datei `public/favicon.ico` existiert jedoch nicht. Ohne diese Datei zeigt der Browser ein Standard-Icon oder gar keins. Für eine professionelle App sollte ein eigenes Favicon sichtbar sein.

---

### 3.2 Lösung – drei Optionen

#### Option A: Eigenes Icon erstellen

1. Icon in passender Größe erstellen (z.B. 32×32 oder 48×48 px)
2. Als ICO-Format exportieren (z.B. mit GIMP, oder einem Online-Konverter)
3. Datei `favicon.ico` nennen
4. In `public/favicon.ico` ablegen
5. Keine Änderung an [index.html](index.html) nötig – der Link zeigt bereits auf `/favicon.ico`

#### Option B: Favicon-Generator nutzen

1. Logo oder Bild auf [favicon.io](https://favicon.io) oder [realfavicongenerator.net](https://realfavicongenerator.net) hochladen
2. Generierte `favicon.ico` herunterladen
3. In `public/favicon.ico` speichern
4. Keine Änderung an [index.html](index.html) nötig

#### Option C: Vite-Icon temporär nutzen

Falls aktuell kein eigenes Icon vorhanden ist:

1. In [index.html](index.html) Zeile 5 ersetzen:
   - **Von:** `<link rel="icon" type="image/x-icon" href="/favicon.ico" />`
   - **Zu:** `<link rel="icon" type="image/svg+xml" href="/vite.svg" />`
2. `public/vite.svg` existiert bereits – kein weiterer Schritt nötig

---

### 3.3 Dateistruktur prüfen

```
public/
  favicon.ico   <-- muss hier liegen (bei Option A oder B)
  vite.svg      <-- bereits vorhanden
```

Vite kopiert den Inhalt von `public/` 1:1 nach `dist/` – die URL `/favicon.ico` bzw. `/vite.svg` funktioniert dann im Build.

---

### 3.4 Verifikation

- `npm run build` ausführen
- Prüfen: `dist/favicon.ico` existiert (bei Option A/B) bzw. `dist/vite.svg` (bei Option C)
- Im Browser die App öffnen – Tab sollte das Icon anzeigen

---

## Abarbeitungs-Reihenfolge

1. **M-006** zuerst – größerer Aufwand, wichtig für Code-Qualität und Typsicherheit
2. **N-017** danach – schnell erledigt, sichtbarer Nutzen

---

## Hinweise für den abarbeitenden Agent

- Jeden Punkt einzeln umsetzen
- Nach M-006: `npm run build` und `npx eslint src/` ausführen
- Falls TypeScript nach Entfernen von `as never` Fehler meldet: Objekt an den erwarteten Typ anpassen oder gezielt den passenden `Database['public']['Tables']['...']`-Typ verwenden
- Projekt-Regeln in `.cursor/rules/` beachten
- Änderungen in [docs/CHANGELOG_REVIEW_IMPROVEMENTS.md](docs/CHANGELOG_REVIEW_IMPROVEMENTS.md) dokumentieren (analog zu den bestehenden Einträgen)
