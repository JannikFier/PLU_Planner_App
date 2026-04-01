/**
 * Effektive Ausblendung für die Anzeige (Masterliste, PDF):
 * Ausblendungen aus hidden_items bleiben in der DB; PLUs der **zentralen** Werbekampagne
 * werden für die Anzeige vorübergehend sichtbar (nicht die manuelle Werbung in plu_offer_items).
 */

/** Zeile aus obst_offer_campaign_lines / backshop_offer_campaign_lines (nur plu relevant) */
export type CentralCampaignLinePlu = { plu: string }

/**
 * @param rawHidden – PLUs mit Eintrag in hidden_items / backshop_hidden_items
 * @param campaignLines – Zeilen der aktuell geladenen zentralen Kampagne (Hook: aktuelle/nächste KW)
 * @returns Menge der PLUs, die in Liste/PDF weiterhin ausgeblendet wirken sollen
 */
export function effectiveHiddenPluSet(
  rawHidden: Set<string>,
  campaignLines: readonly CentralCampaignLinePlu[] | null | undefined,
): Set<string> {
  const central = new Set((campaignLines ?? []).map((l) => l.plu))
  return new Set([...rawHidden].filter((plu) => !central.has(plu)))
}
