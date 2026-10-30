type Linked = { id: string; replayed_from: string | null }

// Les défis d'une même bande sont reliés par « rejouer » (replayed_from).
// before : les défis précédents, du plus récent au plus ancien ; after : les revanches qui suivent.
export function bandChain<T extends Linked>(all: T[], id: string): { before: T[]; after: T[] } {
  const byId = new Map(all.map((c) => [c.id, c]))
  const seen = new Set([id])

  const before: T[] = []
  let parent = byId.get(id)?.replayed_from
  while (parent && !seen.has(parent) && byId.has(parent)) {
    seen.add(parent)
    before.push(byId.get(parent)!)
    parent = byId.get(parent)!.replayed_from
  }

  const after: T[] = []
  const queue = [id]
  while (queue.length) {
    const current = queue.shift()!
    for (const c of all) {
      if (c.replayed_from === current && !seen.has(c.id)) {
        seen.add(c.id)
        after.push(c)
        queue.push(c.id)
      }
    }
  }
  return { before, after }
}
