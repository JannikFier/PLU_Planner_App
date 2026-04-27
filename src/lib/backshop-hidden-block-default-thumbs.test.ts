import { describe, expect, it } from 'vitest'
import { resolveBackshopHiddenBlockTileImage } from './backshop-hidden-block-default-thumbs'

const BASE = '/warengruppen-vorschau'

describe('resolveBackshopHiddenBlockTileImage', () => {
  it('ordnet die bereitgestellten PNGs zu', () => {
    expect(resolveBackshopHiddenBlockTileImage('Croissants', null)).toBe(`${BASE}/croissant.png`)
    expect(resolveBackshopHiddenBlockTileImage('Baguette', null)).toBe(`${BASE}/baguette.png`)
    expect(resolveBackshopHiddenBlockTileImage('Süßes', null)).toBe(`${BASE}/berliner.png`)
    expect(resolveBackshopHiddenBlockTileImage('Laubengebäck', null)).toBe(`${BASE}/laugenstange.png`)
    expect(resolveBackshopHiddenBlockTileImage('Laugengebäck', null)).toBe(`${BASE}/laugenstange.png`)
    expect(resolveBackshopHiddenBlockTileImage('Laumgebäck', null)).toBe(`${BASE}/laugenstange.png`)
    expect(resolveBackshopHiddenBlockTileImage('Brot und Brötchen', null)).toBe(`${BASE}/brot.png`)
    expect(resolveBackshopHiddenBlockTileImage('Brötchen', null)).toBe(`${BASE}/broetchen.png`)
    expect(resolveBackshopHiddenBlockTileImage('Brot', null)).toBe(`${BASE}/brot.png`)
    expect(resolveBackshopHiddenBlockTileImage('Snacks', null)).toBe(`${BASE}/mozzarella.png`)
    expect(resolveBackshopHiddenBlockTileImage('Mozzarella', null)).toBe(`${BASE}/mozzarella.png`)
  })

  it('nutzt das erste Produktbild, wenn keine Regel passt', () => {
    expect(resolveBackshopHiddenBlockTileImage('Sonstige', 'https://x/y.jpg')).toBe('https://x/y.jpg')
    expect(resolveBackshopHiddenBlockTileImage('Neue Gruppe', null)).toBe(null)
  })

  it('Croissant-Regel vor Produktvorschau', () => {
    expect(resolveBackshopHiddenBlockTileImage('Croissant', 'https://first.jpg')).toBe(`${BASE}/croissant.png`)
  })
})
