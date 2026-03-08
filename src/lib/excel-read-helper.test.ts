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

    it('wirft bei leerem Workbook', async () => {
      const workbook = new ExcelJS.Workbook()
      const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer
      const file = new File([buffer], 'empty.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

      await expect(loadExcelSheetAsRows(file)).rejects.toThrow('Excel-Datei enthält keine Sheets')
    })
  })
})
