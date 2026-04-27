import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { invalidateManualSupplementQueries } from './manual-supplement-invalidate'

describe('invalidateManualSupplementQueries', () => {
  it('invalidiert Obst- und gemeinsame Keys wenn obstVersionId gesetzt', () => {
    const qc = new QueryClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')

    invalidateManualSupplementQueries(qc, { obstVersionId: 'v-obst' })

    expect(inv).toHaveBeenCalledWith({ queryKey: ['plu-items', 'v-obst'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['obst-manual-supplements', 'v-obst'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['obst-notification-neu-tab', 'v-obst'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['obst-prev-manual-plu-set'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['notification-count'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['unread-notifications'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['manual-supplement-carryover-pending'] })
    expect(inv).not.toHaveBeenCalledWith({ queryKey: ['backshop-plu-items', 'v-obst'] })
  })

  it('invalidiert Backshop-Keys wenn backshopVersionId gesetzt', () => {
    const qc = new QueryClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')

    invalidateManualSupplementQueries(qc, { backshopVersionId: 'v-bs' })

    expect(inv).toHaveBeenCalledWith({ queryKey: ['backshop-plu-items', 'v-bs'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['backshop-manual-supplements', 'v-bs'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['backshop-notification-neu-tab', 'v-bs'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['backshop-prev-manual-plu-set'] })
    expect(inv).toHaveBeenCalledWith({ queryKey: ['backshop-notification-count'] })
  })
})
