import { describe, expect, it } from 'vitest'
import { bandChain } from './band'

const c = (id: string, replayed_from: string | null = null) => ({ id, replayed_from })

describe('bandChain', () => {
  const all = [c('a'), c('b', 'a'), c('c', 'b'), c('d', 'c'), c('x')]

  it('remonte les défis précédents, du plus récent au plus ancien', () => {
    expect(bandChain(all, 'c').before.map((x) => x.id)).toEqual(['b', 'a'])
  })

  it('trouve les revanches qui suivent', () => {
    expect(bandChain(all, 'b').after.map((x) => x.id)).toEqual(['c', 'd'])
  })

  it('ignore un défi sans lien, ou un précédent que je ne vois pas', () => {
    expect(bandChain(all, 'x')).toEqual({ before: [], after: [] })
    expect(bandChain([c('b', 'cache')], 'b').before).toEqual([])
  })

  it('ne boucle pas sur une chaîne circulaire', () => {
    expect(bandChain([c('a', 'b'), c('b', 'a')], 'a').before.map((x) => x.id)).toEqual(['b'])
  })
})
