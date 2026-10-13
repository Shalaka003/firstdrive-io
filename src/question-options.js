export function shuffledOptionIndices(count, previous = [], random = Math.random) {
  const indices = Array.from({ length: count }, (_, index) => index);
  for (let index = count - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [indices[index], indices[other]] = [indices[other], indices[index]];
  }
  // A repeat of the same order looks unshuffled, especially after restarting.
  if (count > 1 && previous.length === count && indices.every((choice, index) => choice === previous[index])) {
    [indices[0], indices[1]] = [indices[1], indices[0]];
  }
  return indices;
}
