import { describe, expect, it } from 'vitest'
import { shuffleParentOrder } from './parentOrder'

describe('shuffleParentOrder', () => {
  it('returns a copy without mutating the original order', () => {
    const order = ['A', 'B', 'C', 'D']
    const shuffled = shuffleParentOrder(order, () => 0)

    expect(order).toEqual(['A', 'B', 'C', 'D'])
    expect(shuffled).not.toBe(order)
  })

  it('keeps the same members after shuffling', () => {
    const shuffled = shuffleParentOrder([3, 1, 4, 1, 5], () => 0.35)

    expect([...shuffled].sort()).toEqual([1, 1, 3, 4, 5])
  })

  it('keeps empty and single-player orders stable', () => {
    expect(shuffleParentOrder([])).toEqual([])
    expect(shuffleParentOrder(['A'])).toEqual(['A'])
  })

  it('changes the order when two or more players are present', () => {
    const shuffled = shuffleParentOrder(['A', 'B', 'C'], () => 0.99)

    expect(shuffled).toEqual(['C', 'B', 'A'])
  })

  it('uses Fisher-Yates with an injected random source', () => {
    const values = [0, 0, 0]
    const shuffled = shuffleParentOrder(['A', 'B', 'C', 'D'], () => values.shift() ?? 0)

    expect(shuffled).toEqual(['B', 'C', 'D', 'A'])
  })
})
