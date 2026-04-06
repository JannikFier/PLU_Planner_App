import type { CampaignWithLines } from '@/lib/offer-display'

/**
 * Effektive Ausblendung für die Anzeige (Masterliste, PDF):
 * Ausblendungen aus hidden_items bleiben in der DB; PLUs der **zentralen** Werbekampagne
 * werden für die Anzeige vorübergehend sichtbar (nicht die manuelle Werbung in plu_offer_items).
 *
 * Obst: alle PLUs aus exit + ordersatz_week + ordersatz_3day (`allCentralPluUnion`), nicht nur die gemergte Zeilenliste.
 */

/**
 * @param rawHidden – PLUs mit Eintrag in hidden_items / backshop_hidden_items
 * @param campaign – aktuell geladene zentrale Kampagne (Hook: aktuelle/nächste KW); `null` = keine Werbung
 * @returns Menge der PLUs, die in Liste/PDF weiterhin ausgeblendet wirken sollen
 */
export function effectiveHiddenPluSet(
  rawHidden: Set<string>,
  campaign: CampaignWithLines | null | undefined,
): Set<string> {
  const centralPlu = new Set<string>()
  if (campaign?.allCentralPluUnion?.length) {
    for (const p of campaign.allCentralPluUnion) centralPlu.add(p)
  } else if (campaign?.lines?.length) {
    for (const l of campaign.lines) centralPlu.add(l.plu)
  }
  return new Set([...rawHidden].filter((plu) => !centralPlu.has(plu)))
}
