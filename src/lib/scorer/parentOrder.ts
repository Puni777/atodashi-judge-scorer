export function shuffleParentOrder<T>(order: readonly T[], random: () => number = Math.random): T[] {
  const next = [...order]
  if (next.length <= 1) return next

  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    const currentValue = next[index]
    next[index] = next[target]
    next[target] = currentValue
  }

  if (next.every((value, index) => Object.is(value, order[index]))) {
    const lastIndex = next.length - 1
    const firstValue = next[0]
    next[0] = next[lastIndex]
    next[lastIndex] = firstValue
  }

  return next
}
