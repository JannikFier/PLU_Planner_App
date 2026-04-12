import { useQuery } from '@tanstack/react-query'
import { fetchProfilesForCompany } from '@/lib/fetchProfilesForCompany'

/**
 * Profile aller Nutzer mit Marktzugriff in dieser Firma.
 * Query-Key deckungsgleich mit SuperAdminStoreDetailPage (Cache-Treffer beim Navigieren).
 */
export function useCompanyProfiles(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ['company-profiles', companyId],
    queryFn: async () => {
      if (!companyId) throw new Error('Keine Firma angegeben.')
      return fetchProfilesForCompany(companyId)
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  })
}
