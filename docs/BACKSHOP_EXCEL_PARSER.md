# Backshop Excel-Parser – Verhalten & Fehlerbehebung

Diese Doku beschreibt, wie der Backshop-Excel-Parser funktioniert, welche Anpassungen vorgenommen wurden und worauf bei verschiedenen Excel-Formaten zu achten ist. Damit können andere Entwickler oder Agents das Verhalten nachvollziehen und Fehler vermeiden.

**Implementierung:** [src/lib/backshop-excel-parser.ts](../src/lib/backshop-excel-parser.ts)

---

## Unterstützte Dateiformate

- **.xlsx und .xls** werden im Backshop-Upload akzeptiert und verarbeitet (Parser nutzt SheetJS, der beide Formate lesen kann).
- **Bilder** werden nur aus **.xlsx**-Dateien extrahiert (ExcelJS unterstützt kein .xls). Bei .xls-Dateien werden PLU und Name übernommen; in der UI erscheint der Hinweis „Ohne Bilder (.xls – nur PLU/Name)“.
- **Mehrere Dateien:** Beim Zusammenführen (PLU-Deduplizierung) hat eine Zeile **mit** Bild-URL Vorrang vor einer ohne; so gehen Bilder aus .xlsx nicht verloren, wenn dieselbe PLU auch aus einer .xls-Datei kommt.

---

## 1. Was der Parser liefert

- **PLU** (5-stellig)
- **Name** (Warentext, nur Teil bis erstes Komma)
- **Bildspalte** (ob eine Spalte „Abbildung“/„Bild“ erkannt wurde)
- **Bild-Zellposition** (`imageSheetRow0`, `imageSheetCol0`, 0-basiert) pro Zeile, damit eingebettete Bilder dem richtigen Produkt zugeordnet werden können

Pro Datei: `BackshopParseResult` mit `rows`, `fileName`, `totalRows`, `skippedRows`, `hasImageColumn` usw.

**Bild-Extraktion:** Die eigentlichen Bilddaten liefert der Parser nicht (xlsx liefert nur Zellwerte). Stattdessen wird nach dem Parsen das Modul [src/lib/backshop-excel-images.ts](../src/lib/backshop-excel-images.ts) genutzt: **ExcelJS** liest die gleiche Datei, extrahiert eingebettete Bilder inkl. Zeile/Spalte, lädt sie in Supabase Storage (Bucket `backshop-images`) und setzt die URLs in den geparsten Zeilen (`imageUrl`). So erscheinen die Bilder in der PLU-Liste Backshop ohne manuelles Nachpflegen.

---

## 2. Spalten-Erkennung (ohne feste Spaltenbuchstaben)

### PLU-Spalte

- **Priorität 1:** Header enthält **„ZWS“ und „PLU“** (z. B. „ZWS PLU“, „*ZWS-PLU“). Diese Spalte wird zuerst gesucht, damit nicht die 4-stellige SAP-/Host-Artikelnummer (z. B. 8304) als PLU genutzt wird.
- **Priorität 2:** Header enthält „PLU“ und ist kurz (≤ 10 Zeichen).
- **Fallback:** Erste Spalte, in der in den ersten Datenzeilen (nach Normalisierung) nur 5-stellige PLUs vorkommen.

### Name/Warentext

- Header „WARENTEXT“ oder „ETIKETTENTEXT“.
- Fallback: „name“, „text“, „bezeichnung“ im Header.
- Fallback: Spalte mit der längsten durchschnittlichen Zelllänge (typisch für Produktnamen).

### Bildspalte (Abbildung)

- Header enthält **„ABBILDUNG“** oder **„BILD“**. Damit werden auch Varianten wie „Bild“ oder „Abbildung“ in verschiedenen Excel-Dateien erkannt (vorher nur „ABBILDUNG“ → eine Datei zeigte „Mit Bildspalte“ nicht an).

---

## 3. PLU-Normalisierung (wichtig für „0 Zeilen“-Problem)

Excel speichert Zahlen oft **ohne führende Nullen**. Eine Zelle mit `08304` oder `8304` wird beim Lesen zu `"8304"` (4 Zeichen) und würde die Prüfung „genau 5 Ziffern“ verfehlen → Zeile wurde übersprungen.

**Lösung:** Vor der Prüfung wird die PLU normalisiert:

- Alle Sternchen entfernen (z. B. „*8304“, „*81597*“), danach trimmen.
- Ist der verbleibende Wert **1–5 Ziffern**, wird er mit führenden Nullen auf **5 Stellen** ergänzt (`normalizePLU`).
- Danach gilt weiterhin: Nur Werte, die nach Normalisierung genau 5 Ziffern haben, werden als gültige PLU akzeptiert.

Damit werden sowohl `8304` als auch `08304` und `"08304"` korrekt als PLU `08304` verarbeitet.

---

## 4. Namens-Bereinigung

- **Nur Teil bis zum ersten Komma** wird als Name übernommen (z. B. „Hotdog Deluxe, 123g, A-R-Y-Z-T-A“ → „Hotdog Deluxe“).
- Leerer Name nach Bereinigung → Zeile wird übersprungen.

---

## 5. Übersprungene Zeilen – was und warum

Eine Zeile wird übersprungen, wenn:

- die (normalisierte) **PLU nicht genau 5 Ziffern** hat (z. B. 4-stellig ohne Auffüllung, oder Text),
- der **Name nach Bereinigung leer** ist oder nur Platzhalter wie „**“,
- die **PLU in derselben Datei bereits vorkommt** (Duplikat; nur die erste Zeile pro PLU wird übernommen).

**Für dich:** In der Regel ist das gewollt (Duplikate raus, ungültige Einträge raus). Wenn dir später ein Produkt fehlt, in der Excel prüfen: PLU genau 5-stellig? Name eingetragen? Kommt die PLU in der Datei doppelt vor (dann nur eine Zeile im Ergebnis)? Pro doppelte PLU wird im Upload-UI angezeigt: **welche PLU** doppelt ist sowie Positionen im Format **Buchstabe + Zeile** (z. B. „PLU 82167: C7 (erstes Mal), AR22 (doppelt)“). Zusätzlich erkennt das System **Gleiche Bezeichnung, verschiedene PLU**: gleicher Produktname, aber unterschiedliche PLU-Nummern – diese werden gesondert aufgelistet (Name + jede PLU mit Position, z. B. „Weizenmischbrot: PLU 81593 in C7; PLU 81594 in AR22“), damit du in der Excel genau siehst, wo das Problem liegt.

`skippedRows` und `totalRows` werden im Upload-UI angezeigt. Pro Datei wird bei übersprungenen Zeilen eine **Aufschlüsselung inkl. Zeile/Spalte** angezeigt, z. B. „Übersprungen: 2× ungültige PLU (Zeile 12, Spalte D; Zeile 15, Spalte D), 1× leerer Name/Platzhalter (Zeile 8, Spalte C)“. Zeile und Spalte sind **1-basiert** wie in Excel (Zeile 1 = erste Zeile, Spalte A, B, …), damit du die Stelle in der Original-Excel nachschlagen kannst.

---

## 6. Typische Fehlerquellen (gegengecheckt)

| Problem | Ursache | Maßnahme im Parser |
|--------|---------|--------------------|
| 0 Zeilen, alle übersprungen | PLU als Zahl ohne führende Nullen (z. B. 8304) | `normalizePLU`: 1–5 Ziffern auf 5 Stellen auffüllen |
| 0 Zeilen | Falsche PLU-Spalte (4-stellig) statt ZWS-PLU | Zuerst Spalte mit „ZWS“+„PLU“ im Header wählen |
| „Mit Bildspalte“ fehlt bei einer Datei | Anderer Header (z. B. „Bild“ statt „Abbildung“) | Bildspalte auch bei Header „BILD“ setzen |
| Doppelte PLUs | Mehrere Zeilen mit gleicher PLU | Erste behalten, weitere überspringen, in `skippedRows` zählen |
| Alle Zeilen übersprungen, keine Bilder | Anderes Layout: ein Produkt **pro Spalte**, keine Header-Zeile | Spalten-Layout erkennen (`detectColumnBasedLayout`), dann `parseColumnBasedLayout` (Name Zeile 0, PLU Zeile 1/2, Bild Zeile 3, Blöcke à 5 Zeilen) |
| 0 Zeilen, viele „ungültige PLU“ in **einer** Spalte (z. B. AS) | Kassenblatt: **pro Spalte** ein Produkt, Zeile N = Namen, Zeile N+1 = PLUs; eine Namenszeile wurde als Header erkannt | **Kassenblatt-Fallback:** Wenn Zeilen-Layout 0 Zeilen und ≥5 invalidPlu liefert, wird `parseKassenblattColumnLayout` versucht (sucht zwei aufeinanderfolgende Zeilen mit Namen/PLU pro Spalte) |

---

## 7. Zweites Layout: ein Produkt pro Spalte (Spalten-Layout)

Manche Backshop-Excels haben **kein** klassisches Tabellen-Header (PLU, WARENText, Abbildung), sondern:

- **Ein Produkt pro Spalte:** Spalte A = Produkt 1, Spalte B = Produkt 2, …
- **Zeile 0:** Produktnamen
- **Zeile 1:** PLU (5-stellig)
- **Zeile 2:** oft \*PLU\* (wird ebenfalls als PLU genutzt, falls Zeile 1 leer)
- **Zeile 3:** Bild
- **Zeile 4:** leer (Trenner)
- Danach wieder Block (Zeilen 5–8 = nächste Produktreihe), usw.

**Erkennung:** Wenn in der ersten Zeile **kein** Header-Text (PLU, WARENTEXT, …) vorkommt und in Zeile 1/2 **mindestens zwei** Spalten eine gültige 5-stellige PLU haben, wird das Blatt als Spalten-Layout geparst.

**Parsing:** Pro Block (Startzeile 0, 5, 10, …) werden alle Spalten durchlaufen; Name aus Zeile start, PLU aus Zeile start+1 oder start+2, Bild-Zeile start+3. Leere Blöcke und Platzhalter „\*\*“ im Namen werden übersprungen. Es wird `hasImageColumn: true` gesetzt, da in diesem Layout pro Block eine Bildzeile vorkommt.

---

## 7a. Kassenblatt-Layout (Fallback: zwei Zeilen pro Spalte)

Dateien wie **„Kassenblatt ZWS-PLU …“** haben: **pro Spalte ein Produkt** (viele Spalten), **Zeile N** = Produktnamen, **Zeile N+1** = PLUs, optional **Zeile N+2** = Bild. Weil „ZWS“/„PLU“ vorkommt, wird Zeilen-Layout gewählt; die Namenszeile wird als Header genutzt und eine einzelne PLU-Spalte für alle Zeilen gelesen (oft leer) → 0 Zeilen, viele „ungültige PLU“.

**Lösung:** Wenn Zeilen-Layout **0 Zeilen** und **≥5 ungültige PLU** liefert, wird **Kassenblatt-Spalten-Layout** versucht. Es werden **alle Bänder** erkannt (nicht nur das erste): Alle Startzeilen N mit mind. 3 PLUs und 3 Namen in (N, N+1), mind. 3 Zeilen Abstand zwischen Bändern; pro Band Zeile N+2 = Bild. So werden auch große Kassenblätter (z. B. Zeilen bis 24, Spalten bis AR) vollständig eingelesen – deutlich mehr als 42 Produkte.

---

## 8. Abgrenzung zu Obst/Gemüse

- **Obst/Gemüse:** Eigenes Excel-Format, eigener Parser ([src/lib/excel-parser.ts](../src/lib/excel-parser.ts)), Stück/Gewicht, keine Bilder im Backshop-Sinne.
- **Backshop:** Eigener Parser ([backshop-excel-parser.ts](../src/lib/backshop-excel-parser.ts)), nur PLU + Name + Bildspalte, keine Stück/Gewicht-Typen.

Gemeinsam: Beide nutzen xlsx, gleiche Projekt-Regeln (z. B. keine Hardcodings), getrennte Daten und Versionen.

---

## 9. Build & Regression

Nach Änderungen am Parser:

- `npm run build` muss durchlaufen.
- Obst/Gemüse-Upload und -Liste bleiben unverändert (keine Änderung an excel-parser.ts oder PLUUploadPage für Obst/Gemüse).

---

## 10. Bild-Extraktion aus Excel (ExcelJS, nur .xlsx)

- **Nur .xlsx:** Die Bild-Extraktion nutzt ExcelJS und wird ausschließlich für .xlsx-Dateien ausgeführt; .xls enthält keine eingebetteten Bilder in diesem Kontext.
- **Parser** (SheetJS) setzt pro Zeile die **Zellposition des Bildes**: `imageSheetRow0`, `imageSheetCol0` (0-basiert). Zeilen-Layout: Bild in derselben Zeile, Spalte `imageCol`. Spalten-Layout: Bild in Zeile `start + 3`, Spalte `c` pro Produkt.
- **Nach dem Parsen** (im Upload-Hook) wird für jede Datei mit Bildpositionen [src/lib/backshop-excel-images.ts](../src/lib/backshop-excel-images.ts) aufgerufen: ExcelJS liest die Datei, `getImages()` liefert Bilder inkl. Zeile/Spalte, Abgleich mit den geparsten Zeilen, Upload in Supabase Storage (Bucket `backshop-images`), signierte oder öffentliche URL wird in `row.imageUrl` gesetzt.
- **Speicherpfad:** `{uploadId}/{fileIndex}/{plu}.{png|jpg}` (bei mehreren Dateien pro Batch bleibt die erste PLU-URL beim Mergen erhalten).
- **Beide Layouts** (Zeilen- und Spalten-Layout) werden unterstützt, da der Parser in beiden Fällen die Bildzelle pro Produkt ausgibt.
- **Bild-Zuordnung:** Zuerst wird ein Bild an der erwarteten Position (row0, col0) gesucht; danach mit **Toleranz ±2** Zeilen/Spalten (Abweichungen zwischen SheetJS und ExcelJS). Findet sich kein Bild, wird ein **Fallback** genutzt: nächstes noch nicht vergebenes Bild in **derselben Spalte** innerhalb ±3 Zeilen (nach Zeilenabstand sortiert). So werden kleine Layout-Unterschiede abgefangen; jedes Bild wird nur einmal vergeben.
- **Diagnose nach Upload:** Wenn Zeilen ohne Bild-URL oder Bilder ohne Zuordnung übrig bleiben, erscheint ein **Hinweis-Toast** (z. B. „4 Zeile(n) ohne Bild; 2 Bild(er) keiner Zeile zugeordnet“). In der Browser-Konsole (Entwicklermodus) stehen zusätzlich die betroffenen PLUs bzw. Bild-Positionen.
- **0 Bilder aus manchen Excel-Dateien:** ExcelJS liefert bei manchen .xlsx-Dateien (z. B. aus Microsoft Excel) **keine** Bilder. Dafür gibt es einen **Fallback**: Die App öffnet die .xlsx als ZIP, liest die Bilder aus `xl/media/` und die Zellpositionen aus dem Drawing-XML (`xl/drawings/drawing1.xml`, oneCellAnchor/twoCellAnchor mit row/col und Blip-Referenz). So werden auch Arytza-/Ensec-Dateien mit Bildern versehen. Nur wenn auch der Fallback 0 Bilder findet, erscheint der Warn-Toast; PLU und Name werden in jedem Fall übernommen.
- **Vertauschte Bilder (z. B. Schokobrötchen/Heidelbeeren):** Wenn ExcelJS 0 Bilder liefert, nutzt der Code einen **Reihenfolge-Fallback**: Die extrahierten Bilder werden **nach Index** den Parser-Zeilen (mit Bildposition) zugeordnet – erstes Bild → erste Zeile, zweites → zweite Zeile usw. Stimmt die Reihenfolge der Bilder in der Datei nicht mit der Reihenfolge der Produktzeilen überein, können Bilder falsch zugeordnet werden. **Abhilfe:** In „Umbenannte (Backshop)“ nur das Bild ersetzen (Name unverändert lassen). Mit Migration 015 erscheinen reine Bildänderungen **nicht** in der Liste „Umbenannte Produkte“ – das Produkt wird also nicht als „umbenannt“ geführt.

---

## 11. Fallback: Zeilen-Layout bei vielen Überspringungen (Spalten-Layout)

Wenn das Blatt als **Spalten-Layout** erkannt wird, aber **sehr viele** Zellen übersprungen werden (z. B. `skippedRows` > 10 × `totalRows`), wird zusätzlich ein **Zeilen-Layout-Parse** durchgeführt. Liefert das Zeilen-Layout **mehr** gültige Zeilen, wird dessen Ergebnis verwendet. So werden Exporte, die eigentlich eine Zeile pro Produkt mit Header haben, nicht fälschlich als Spalten-Layout mit fast allen Überspringungen verarbeitet (z. B. Lagerordersatz-Exporte).

Stand der Doku: Parser (PLU-Normalisierung, ZWS-PLU-Priorität, Bildspalte „BILD“, Bild-Zellposition), Bild-Extraktion (ExcelJS, Storage), Hinweis bei 0 Bildern und Zeilen-Layout-Fallback sind dokumentiert.
