// Unit-Tests für den Backshop-Excel-Parser (Header-Erkennung, Block-Layout-Fallback)

import ExcelJS from 'exceljs'
import {
  isHeaderLike,
  backshopNameCleanup,
  parseBackshopExcelFile,
} from './backshop-excel-parser'

describe('backshop-excel-parser', () => {
  describe('isHeaderLike – Wortgrenzen statt Substring (Plunder-Fix)', () => {
    // Echte Produktnamen aus "Kassenblatt ZWS-PLU 16.02.2026.xlsx" dürfen NICHT als Header gelten
    it('erkennt "Plunder"-Produktnamen NICHT als Header', () => {
      expect(isHeaderLike('Bienenstich Plunder')).toBe(false)
      expect(isHeaderLike('Pudding Plunder')).toBe(false)
      expect(isHeaderLike('Erdbeer- Vanille Plunder')).toBe(false)
    })

    it('erkennt andere Produktnamen mit Header-ähnlichen Teil-Buchstaben NICHT als Header', () => {
      expect(isHeaderLike('Bildschnitten')).toBe(false)
      expect(isHeaderLike('Kunststück')).toBe(false)
      expect(isHeaderLike('Artischocken')).toBe(false)
      expect(isHeaderLike('Artverwandt')).toBe(false)
      expect(isHeaderLike('Sapporo')).toBe(false)
    })

    it('erkennt echte Header weiter als Header', () => {
      expect(isHeaderLike('PLU')).toBe(true)
      expect(isHeaderLike('ZWS-PLU')).toBe(true)
      expect(isHeaderLike('ZWS PLU')).toBe(true)
      expect(isHeaderLike('PLU Nr.')).toBe(true)
      expect(isHeaderLike('Warentext')).toBe(true)
      expect(isHeaderLike('Etikettentext')).toBe(true)
      expect(isHeaderLike('Abbildung')).toBe(true)
      expect(isHeaderLike('Bild')).toBe(true)
      expect(isHeaderLike('Bezeichnung')).toBe(true)
      expect(isHeaderLike('Artikelbezeichnung')).toBe(true)
      expect(isHeaderLike('SAP')).toBe(true)
      expect(isHeaderLike('Lieferant')).toBe(true)
    })

    it('erkennt Kombi-Header "Artikel-Nr." / "Art. Nr."', () => {
      expect(isHeaderLike('Artikel-Nr.')).toBe(true)
      expect(isHeaderLike('Artikel Nr.')).toBe(true)
      expect(isHeaderLike('Art.-Nr.')).toBe(true)
      expect(isHeaderLike('Art. Nr')).toBe(true)
    })

    it('leere Zellen sind keine Header', () => {
      expect(isHeaderLike('')).toBe(false)
      expect(isHeaderLike('   ')).toBe(false)
    })
  })

  describe('backshopNameCleanup', () => {
    it('nimmt nur Teil bis zum ersten Komma', () => {
      expect(backshopNameCleanup('Weizenmischbrot, 500g')).toBe('Weizenmischbrot')
    })
    it('reduziert Mehrfach-Leerzeichen', () => {
      expect(backshopNameCleanup('Berliner    Eierlikör')).toBe('Berliner Eierlikör')
    })
  })

  describe('parseBackshopExcelFile – Block-Layout mit Plunder-Produkt (Edeka-Regression)', () => {
    /**
     * Simuliert die Edeka-Kassenblatt-Struktur: Block pro Spalte, 5 Zeilen pro Block.
     * Namen-Zeile enthält "Plunder"-Produkte, die früher die Block-Layout-Detection kippen ließen.
     */
    async function buildKassenblattFile(names: string[], plus: string[]): Promise<File> {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Kassenblatt')
      // Block 1: Zeile 1 Namen, Zeile 2 PLUs (numerisch), Zeile 3 *PLU* (Strichcode-Formel-Cache)
      sheet.getRow(1).values = [undefined, ...names]
      sheet.getRow(2).values = [undefined, ...plus.map((p) => Number(p))]
      sheet.getRow(3).values = [undefined, ...plus.map((p) => `*${p}*`)]
      // Zeile 4: „Bildzeile“ (im Original: Grafiken). Damit die Zeile existiert, einen Dummy setzen.
      sheet.getRow(4).getCell(1).value = ''
      sheet.getRow(5).getCell(1).value = ''

      const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
      return new File([buffer], 'kassenblatt-test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    }

    it('parst Block-Layout trotz "Plunder"-Produktname (Edeka-Regression-Test)', async () => {
      const file = await buildKassenblattFile(
        ['Weizenmischbrot', 'Bienenstich Plunder', 'Krustenbrot'],
        ['81593', '81955', '81594'],
      )

      const result = await parseBackshopExcelFile(file)

      expect(result.detectedLayout).toBe('kassenblatt_blocks')
      expect(result.totalRows).toBe(3)
      const plus = result.rows.map((r) => r.plu).sort()
      expect(plus).toEqual(['81593', '81594', '81955'])
      const plunder = result.rows.find((r) => r.systemName.includes('Plunder'))
      expect(plunder).toBeDefined()
      expect(plunder?.plu).toBe('81955')
    })

    it('parst Block-Layout mit 5 Spalten (keine Header-Zelle, mindestens 3 PLUs)', async () => {
      const file = await buildKassenblattFile(
        ['Apfelecke', 'Pudding Plunder', 'Amerikaner', 'Muffin', 'Quarktasche'],
        ['81042', '82950', '87980', '81729', '86440'],
      )

      const result = await parseBackshopExcelFile(file)

      expect(result.detectedLayout).toBe('kassenblatt_blocks')
      expect(result.totalRows).toBe(5)
    })
  })
})
