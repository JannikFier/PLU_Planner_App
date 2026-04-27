/** Historie-Einträge für die Warengruppen-Workbench (Backshop + Obst). */

export type WarengruppeRecentLine = {
  id: string
  /** effBlock(item) unmittelbar vor der Mutation – für „Zurücknehmen“. */
  beforeEffectiveBlockId: string | null
  itemId: string
  plu: string
  name: string
  fromLabel: string
  toLabel: string
}

export type WarengruppeRecentBatch = {
  id: string
  at: number
  lines: WarengruppeRecentLine[]
}
