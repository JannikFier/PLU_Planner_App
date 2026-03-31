// Einfache Zuordnung Exit-Excel ↔ PLU (Hauptname / Teilstrings)

/** Normalisiert für Vergleich (Kleinbuchstaben, typische Präfixe abschwächen) */
export function normalizeProductLabelForMatch(name: string): string {
  let s = name.toLowerCase().replace(/\s+/g, ' ').trim()
  s = s.replace(/\b(g&g|g\.g\.|hgb|gg)\b\.?/gi, '')
  return s.replace(/\s+/g, ' ').trim()
}

export interface MasterPluCandidate {
  plu: string
  label: string
}

/**
 * Liefert bis zu `limit` PLU-Kandidaten nach einfachem String-Match (enthält / enthält sich).
 */
export function rankExitRowMatches(excelArtikel: string, masters: MasterPluCandidate[], limit = 8): MasterPluCandidate[] {
  const q = normalizeProductLabelForMatch(excelArtikel)
  if (!q) return []
  const scored: { c: MasterPluCandidate; score: number }[] = []
  for (const m of masters) {
    const lab = normalizeProductLabelForMatch(m.label)
    if (!lab) continue
    let score = 0
    if (lab === q) score = 100
    else if (lab.includes(q) || q.includes(lab)) score = 70
    else {
      const qTokens = q.split(' ').filter((t) => t.length > 2)
      const hits = qTokens.filter((t) => lab.includes(t)).length
      score = hits > 0 ? 20 + hits * 5 : 0
    }
    if (score > 0) scored.push({ c: m, score })
  }
  scored.sort((a, b) => b.score - a.score)
  const out: MasterPluCandidate[] = []
  const seen = new Set<string>()
  for (const { c } of scored) {
    if (seen.has(c.plu)) continue
    seen.add(c.plu)
    out.push(c)
    if (out.length >= limit) break
  }
  return out
}
