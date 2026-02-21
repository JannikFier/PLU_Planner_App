# Backshop Storage-Bucket einrichten

Der Bucket für Backshop-Bilder wird **einmalig im Supabase Dashboard** angelegt (Supabase empfiehlt, Storage-Buckets nicht per SQL zu erstellen). Dauert etwa 1–2 Minuten.

---

## Schritt 1: Bucket anlegen

1. Im Browser **Supabase Dashboard** öffnen und dein **Projekt** auswählen.
2. Links in der Sidebar **Storage** anklicken.
3. Auf **„New bucket“** (oder „Create a new bucket“) klicken.
4. Einstellungen:
   - **Name:** `backshop-images` (genau so, klein geschrieben, mit Bindestrich).
   - **Public bucket:** **aus** (Private) – Zugriff nur für eingeloggte User über die App.
5. Mit **„Create bucket“** bestätigen.

---

## Schritt 2: Policies (Zugriffsregeln) setzen

Ohne Policies können eingeloggte User den Bucket nicht nutzen. Zwei Policies anlegen:

1. Im Storage-Bereich den Bucket **„backshop-images“** anklicken.
2. Oben den Tab **„Policies“** (oder „Policies“ in der Bucket-Ansicht) öffnen.
3. **„New policy“** wählen.

### Policy 1: Lesen (alle eingeloggten User)

- **Policy name:** z. B. `Backshop images lesen`
- **Allowed operation:** **SELECT** (Read).
- **Target roles:** `authenticated` (oder „alle authentifizierten User“).
- **Policy definition:** z. B. „Allow read access for authenticated users“ / vorgefertigte Option **„Allow read access for authenticated users only“** wählen, falls angeboten.
- Speichern.

### Policy 2: Hochladen, Ändern, Löschen (alle eingeloggten User)

- Nochmal **„New policy“**.
- **Policy name:** z. B. `Backshop images schreiben`
- **Allowed operation:** **INSERT**, **UPDATE**, **DELETE** (bzw. „Upload“, „Update“, „Delete“).
- **Target roles:** `authenticated`.
- **Policy definition:** z. B. „Allow upload/update/delete for authenticated users only“ / vorgefertigte Option wählen.
- Speichern.

**Hinweis:** Wenn das Dashboard nur eine kombinierte Policy anbietet (z. B. „Full access for authenticated users“), reicht diese eine Policy – dann dürfen eingeloggte User lesen und schreiben.

---

## Schritt 3: Prüfen

- Unter **Storage → backshop-images** sollte der Bucket sichtbar sein.
- Unter **Policies** sollten mindestens eine Lese- und eine Schreib-Policy (oder eine kombinierte) für `authenticated` stehen.

Damit ist der Bucket fertig. Die App speichert später die Bild-URLs in `backshop_master_plu_items.image_url` und `backshop_custom_products.image_url`.
