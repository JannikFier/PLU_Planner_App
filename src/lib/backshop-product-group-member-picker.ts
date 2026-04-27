/**
 * Reine Logik für Super-Admin: Produktgruppen-Mitglieder aus der aktiven Masterliste wählen.
 * Keine DB; nur Status, Ranking, Gründe und Text-Highlights für die UI.
 */

import { normalizeBackshopGroupName } from '@/lib/backshop-sources'
import type { BackshopMasterPLUItem, BackshopSource } from '@/types/database'

export const MEMBER_PICKER_SOURCES = ['edeka', 'harry', 'aryzta'] as const
export type MemberPickerSource = (typeof MEMBER_PICKER_SOURCES)[number]

export type MemberPickerRowStatus = 'free' | 'in_target' | 'in_other_group'

/** Festes Vokabular für die Spalte „Grund“ (UI mappt auf deutsche Labels). */
export type MemberPickerReasonCode =
  | 'shared_tokens'
  | 'contains'
  | 'fuzzy_near'
  | 'search_match'
  | 'contains_filter'

export interface MemberPickerGroupLite {
  id: string
  display_name: string
  members: Array<{ plu: string; source: string }>
}

export interface MemberGroupLookup {
  groupId: string
  displayName: string
}

export interface MemberPickerRow {
  item: BackshopMasterPLUItem
  status: MemberPickerRowStatus
  score: number
  reasonCode: MemberPickerReasonCode | null
  /** UTF-16 Indizes in `pickDisplayName(item)` für <mark>; leer = kein Highlight. */
  highlightRanges: Array<{ start: number; end: number }>
}

export function memberPickerKey(plu: string, source: string): string {
  return `${plu}|${source}`
}

export function isMemberPickerSelectableSource(source: BackshopSource | null | undefined): source is MemberPickerSource {
  return source === 'edeka' || source === 'harry' || source === 'aryzta'
}

export function pickDisplayName(item: BackshopMasterPLUItem): string {
  const d = item.display_name?.trim()
  if (d) return d
  return item.system_name?.trim() ?? ''
}

export function pickCompareName(item: BackshopMasterPLUItem): string {
  const s = item.system_name?.trim()
  if (s) return s
  return item.display_name?.trim() ?? ''
}

/** (plu|source) → Gruppe, in der das Mitglied liegt (max. eine laut DB-Unique). */
export function buildMemberToGroupMap(groups: MemberPickerGroupLite[]): Map<string, MemberGroupLookup> {
  const m = new Map<string, MemberGroupLookup>()
  for (const g of groups) {
    for (const mem of g.members) {
      m.set(memberPickerKey(mem.plu, mem.source), { groupId: g.id, displayName: g.display_name })
    }
  }
  return m
}

export function getMemberPickerRowStatus(
  targetGroupId: string,
  plu: string,
  source: string,
  memberToGroup: Map<string, MemberGroupLookup>,
): MemberPickerRowStatus {
  const hit = memberToGroup.get(memberPickerKey(plu, source))
  if (!hit) return 'free'
  if (hit.groupId === targetGroupId) return 'in_target'
  return 'in_other_group'
}

function mergeRanges(ranges: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  if (ranges.length === 0) return []
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const out: Array<{ start: number; end: number }> = []
  let cur = { ...sorted[0] }
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]
    if (n.start <= cur.end) cur.end = Math.max(cur.end, n.end)
    else {
      out.push(cur)
      cur = { ...n }
    }
  }
  out.push(cur)
  return out
}

/** Erste Vorkommen von `needle` in `haystack` (case-insensitive), UTF-16-Indizes. */
function highlightFirstInsensitive(haystack: string, needle: string): Array<{ start: number; end: number }> {
  if (!needle.trim()) return []
  const lowerH = haystack.toLowerCase()
  const lowerN = needle.toLowerCase()
  const idx = lowerH.indexOf(lowerN)
  if (idx < 0) return []
  return [{ start: idx, end: idx + needle.length }]
}

function tokenSet(norm: string): Set<string> {
  const parts = norm.split(' ').filter(Boolean)
  return new Set(parts)
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const row = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) row[j] = j
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  return row[b.length]
}

/** Längstes Anker-Token, das in `candidateLower` vorkommt (Substring). */
function highlightLongestAnchorToken(anchorNorm: string, candidateDisplay: string): Array<{ start: number; end: number }> {
  const tokens = anchorNorm.split(' ').filter((t) => t.length >= 2)
  let best: { token: string; len: number } | null = null
  for (const t of tokens) {
    if (t.length >= (best?.len ?? 0)) best = { token: t, len: t.length }
  }
  if (!best) return []
  const candLower = candidateDisplay.toLowerCase()
  const idx = candLower.indexOf(best.token)
  if (idx < 0) return []
  return [{ start: idx, end: idx + best.token.length }]
}

export interface SimilarRankInput {
  masterItems: BackshopMasterPLUItem[]
  memberToGroup: Map<string, MemberGroupLookup>
  targetGroupId: string
  anchorText: string
  /** Max. Zeilen nach Ranking (Performance). */
  limit?: number
}

/**
 * Ähnlichkeits-Modus: nur wählbare Quellen; sortiert nach erklärbarem Score.
 * `in_target` werden ausgeschlossen; `in_other_group` nur mit niedrigerem Score eingeordnet (gleiche Logik, UI sperrt ohne „Verschieben“).
 */
export function rankSimilarPickerRows(input: SimilarRankInput): MemberPickerRow[] {
  const { masterItems, memberToGroup, targetGroupId, anchorText, limit = 250 } = input
  const anchorNorm = normalizeBackshopGroupName(anchorText)
  if (!anchorNorm) return []

  const anchorTokens = tokenSet(anchorNorm)
  const rows: MemberPickerRow[] = []

  for (const item of masterItems) {
    const src = item.source ?? 'edeka'
    if (!isMemberPickerSelectableSource(src)) continue

    const status = getMemberPickerRowStatus(targetGroupId, item.plu, src, memberToGroup)
    if (status === 'in_target') continue

    const display = pickDisplayName(item)
    const compare = pickCompareName(item)
    const candNorm = normalizeBackshopGroupName(compare)

    let reasonCode: MemberPickerReasonCode | null = null
    let score = 0
    let highlights: Array<{ start: number; end: number }> = []

    if (candNorm === anchorNorm) {
      reasonCode = 'contains'
      score = 100
      highlights = highlightFirstInsensitive(display, anchorText.trim() || compare)
    } else if (candNorm.includes(anchorNorm) || anchorNorm.includes(candNorm)) {
      reasonCode = 'contains'
      const shorter = candNorm.length <= anchorNorm.length ? candNorm : anchorNorm
      const longer = candNorm.length > anchorNorm.length ? candNorm : anchorNorm
      const contained = shorter.length >= 2 && longer.includes(shorter)
      score = contained ? 92 : 88
      highlights = highlightFirstInsensitive(display, shorter.length >= 2 ? shorter : anchorNorm)
    } else {
      const candTokens = tokenSet(candNorm)
      let inter = 0
      for (const t of anchorTokens) {
        if (candTokens.has(t)) inter++
      }
      const union = new Set([...anchorTokens, ...candTokens])
      const jaccard = union.size > 0 ? inter / union.size : 0
      if (inter > 0 && jaccard >= 0.15) {
        reasonCode = 'shared_tokens'
        score = Math.round(jaccard * 100)
        highlights = mergeRanges(highlightLongestAnchorToken(anchorNorm, display))
      } else if (candNorm.length >= 3 && candNorm.length <= 80 && anchorNorm.length >= 3) {
        const dist = levenshtein(candNorm, anchorNorm)
        const maxDist = candNorm.length <= 12 ? 2 : 3
        if (dist <= maxDist) {
          reasonCode = 'fuzzy_near'
          score = Math.max(1, 75 - dist * 18)
          highlights = highlightLongestAnchorToken(anchorNorm, display)
        }
      }
    }

    if (!reasonCode || score <= 0) continue

    rows.push({
      item,
      status,
      score,
      reasonCode,
      highlightRanges: highlights,
    })
  }

  rows.sort((a, b) => {
    const prio = (r: MemberPickerReasonCode) =>
      r === 'contains' ? 3 : r === 'shared_tokens' ? 2 : r === 'fuzzy_near' ? 1 : 0
    const dp = prio(b.reasonCode!) - prio(a.reasonCode!)
    if (dp !== 0) return dp
    return b.score - a.score
  })

  return rows.slice(0, limit)
}

export interface SearchFilterInput {
  masterItems: BackshopMasterPLUItem[]
  memberToGroup: Map<string, MemberGroupLookup>
  targetGroupId: string
  query: string
  limit?: number
}

export function filterSearchPickerRows(input: SearchFilterInput): MemberPickerRow[] {
  const q = input.query.trim().toLowerCase()
  if (!q) return []
  const limit = input.limit ?? 300
  const out: MemberPickerRow[] = []
  for (const item of input.masterItems) {
    const src = item.source ?? 'edeka'
    if (!isMemberPickerSelectableSource(src)) continue
    const status = getMemberPickerRowStatus(input.targetGroupId, item.plu, src, input.memberToGroup)
    if (status === 'in_target') continue

    const display = pickDisplayName(item)
    const compare = pickCompareName(item)
    const pluOk = item.plu.includes(q)
    const nameOk =
      display.toLowerCase().includes(q) || compare.toLowerCase().includes(q) || normalizeBackshopGroupName(compare).includes(q)
    if (!pluOk && !nameOk) continue

    const highlights = mergeRanges([
      ...highlightFirstInsensitive(display, q),
      ...highlightFirstInsensitive(compare, q),
      ...highlightFirstInsensitive(item.plu, q),
    ])

    out.push({
      item,
      status,
      score: 100,
      reasonCode: 'search_match',
      highlightRanges: highlights,
    })
    if (out.length >= limit) break
  }
  return out
}

export interface ContainsFilterInput {
  masterItems: BackshopMasterPLUItem[]
  memberToGroup: Map<string, MemberGroupLookup>
  targetGroupId: string
  needle: string
  ignoreCase: boolean
  limit?: number
}

export function filterContainsPickerRows(input: ContainsFilterInput): MemberPickerRow[] {
  const raw = input.needle.trim()
  if (!raw) return []
  const limit = input.limit ?? 300
  const needleLc = raw.toLowerCase()
  const out: MemberPickerRow[] = []

  for (const item of input.masterItems) {
    const src = item.source ?? 'edeka'
    if (!isMemberPickerSelectableSource(src)) continue
    const status = getMemberPickerRowStatus(input.targetGroupId, item.plu, src, input.memberToGroup)
    if (status === 'in_target') continue

    const display = pickDisplayName(item)
    const compare = pickCompareName(item)
    const matches = input.ignoreCase
      ? display.toLowerCase().includes(needleLc) || compare.toLowerCase().includes(needleLc)
      : display.includes(raw) || compare.includes(raw)
    if (!matches) continue

    const highlights = input.ignoreCase
      ? mergeRanges([...highlightFirstInsensitive(display, raw), ...highlightFirstInsensitive(compare, raw)])
      : mergeRanges([
          ...(display.includes(raw) ? highlightFirstInsensitive(display, raw) : []),
          ...(compare.includes(raw) ? highlightFirstInsensitive(compare, raw) : []),
        ])

    out.push({
      item,
      status,
      score: 90,
      reasonCode: 'contains_filter',
      highlightRanges: highlights,
    })
    if (out.length >= limit) break
  }
  return out
}

export interface ClassifiedMemberKey {
  key: string
  plu: string
  source: MemberPickerSource
  kind: 'new' | 'move'
  fromGroupId?: string
  fromGroupDisplayName?: string
}

export function classifyMemberKeysForApply(
  keys: string[],
  targetGroupId: string,
  memberToGroup: Map<string, MemberGroupLookup>,
): { toApply: ClassifiedMemberKey[]; skippedInTarget: string[] } {
  const toApply: ClassifiedMemberKey[] = []
  const skippedInTarget: string[] = []
  for (const key of keys) {
    const pipe = key.indexOf('|')
    if (pipe < 0) continue
    const plu = key.slice(0, pipe)
    const source = key.slice(pipe + 1) as MemberPickerSource
    if (!isMemberPickerSelectableSource(source)) continue

    const hit = memberToGroup.get(key)
    if (!hit) {
      toApply.push({ key, plu, source, kind: 'new' })
      continue
    }
    if (hit.groupId === targetGroupId) {
      skippedInTarget.push(key)
      continue
    }
    toApply.push({
      key,
      plu,
      source,
      kind: 'move',
      fromGroupId: hit.groupId,
      fromGroupDisplayName: hit.displayName,
    })
  }
  return { toApply, skippedInTarget }
}

export function reasonCodeLabelDe(code: MemberPickerReasonCode | null): string {
  switch (code) {
    case 'shared_tokens':
      return 'Gemeinsame Wörter'
    case 'contains':
      return 'Name enthält Kern / gleich'
    case 'fuzzy_near':
      return 'Zeichenkette nah'
    case 'search_match':
      return 'Treffer Suche'
    case 'contains_filter':
      return 'Filter „enthält“'
    default:
      return '—'
  }
}
