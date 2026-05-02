import { describe, expect, it } from 'vitest'
import { orderBlockKeys, UNGEORDNET_BLOCK } from '@/lib/backshop-hidden-products-page-utils'

describe('backshop-hidden-products-page-utils', () => {
  it('orderBlockKeys sortiert nach Markt-Reihenfolge und UNGEORDNET_BLOCK ans Ende', () => {
    const order = [
      { block_id: 'b', order_index: 0 },
      { block_id: 'a', order_index: 1 },
    ]
    const keys = ['a', UNGEORDNET_BLOCK, 'b']
    expect(orderBlockKeys(keys, order)).toEqual(['b', 'a', UNGEORDNET_BLOCK])
  })
})
