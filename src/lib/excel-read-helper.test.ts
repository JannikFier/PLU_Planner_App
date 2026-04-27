// Unit-Tests für die zentrale Excel-Lesehilfe (ExcelJS)

import ExcelJS from 'exceljs'
import { loadExcelSheetAsRows } from './excel-read-helper'

describe('excel-read-helper', () => {
  describe('loadExcelSheetAsRows', () => {
    it('liest erstes Sheet als Array von Zeilen (wie sheet_to_json header:1)', async () => {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Sheet1')
      sheet.addRow(['PLU', 'Name'])
      sheet.addRow(['12345', 'Testprodukt'])
      sheet.addRow(['67890', 'Zweites'])

      const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
      const file = new File([buffer], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      const rows = await loadExcelSheetAsRows(file)

      expect(Array.isArray(rows)).toBe(true)
      expect(rows.length).toBe(3)
      expect(rows[0]).toEqual(['PLU', 'Name'])
      expect(rows[1]).toEqual(['12345', 'Testprodukt'])
      expect(rows[2]).toEqual(['67890', 'Zweites'])
    })

    it('liefert leere Zellen als leeren String', async () => {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Sheet1')
      sheet.addRow(['A', '', 'C'])

      const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
      const file = new File([buffer], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      const rows = await loadExcelSheetAsRows(file)

      expect(rows.length).toBe(1)
      expect(rows[0]).toEqual(['A', '', 'C'])
    })

    it('liest Text aus gemergten Zellen auch in den „leeren“ Nachbarspalten (Master-Zelle)', async () => {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Sheet1')
      sheet.mergeCells(1, 1, 1, 2)
      sheet.getCell(1, 1).value = 'Gemergt'
      sheet.addRow(['X', 'Y'])

      const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
      const file = new File([buffer], 'merge.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      const rows = await loadExcelSheetAsRows(file)

      expect(rows[0]?.[0]).toBe('Gemergt')
      expect(rows[0]?.[1]).toBe('Gemergt')
      expect(rows[1]).toEqual(['X', 'Y'])
    })

    it('füllt horizontale Merges wie Z1:AA1 – Slave-Spalte ohne eigenes <c> erhält Master-Text', async () => {
      const workbook = new ExcelJS.Workbook()
      const sheet = workbook.addWorksheet('Sheet1')
      // Spalte 26 = Z, 27 = AA (Kassenblatt-Namenszeile)
      sheet.mergeCells(1, 26, 1, 27)
      sheet.getCell(1, 26).value = 'Kassenblatt-Name'

      const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
      const file = new File([buffer], 'z-aa.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      const rows = await loadExcelSheetAsRows(file)

      expect(rows[0]?.[25]).toBe('Kassenblatt-Name')
      expect(rows[0]?.[26]).toBe('Kassenblatt-Name')
    })

    it('wirft bei leerem Workbook', async () => {
      const workbook = new ExcelJS.Workbook()
      const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
      const file = new File([buffer], 'empty.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      await expect(loadExcelSheetAsRows(file)).rejects.toThrow('Excel-Datei enthält keine Sheets')
    })
  })
})
