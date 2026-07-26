/**
 * Fisher–Yates shuffle returning a new array. The random source is
 * injectable so tests can pass a deterministic function.
 */
export const shuffle = <T>(
  items: T[],
  random: () => number = Math.random
): T[] => {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    const held = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = held
  }
  return result
}
