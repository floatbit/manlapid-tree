export function overviewGenerations(people, links) {
  const children = new Map(people.map((p) => [p.id, new Set()]));
  const incoming = new Map(people.map((p) => [p.id, 0]));
  const depth = new Map(people.map((p) => [p.id, 1]));
  for (const link of links) {
    const parent = link.type === 'parent' ? link.b : link.type === 'child' ? link.a : null;
    const child = link.type === 'parent' ? link.a : link.b;
    if (!children.has(parent) || !children.has(child) || children.get(parent).has(child)) continue;
    children.get(parent).add(child);
    incoming.set(child, incoming.get(child) + 1);
  }
  const queue = people.filter((p) => incoming.get(p.id) === 0).map((p) => p.id);
  for (let i = 0; i < queue.length; i++)
    for (const child of children.get(queue[i])) {
      depth.set(child, Math.max(depth.get(child), depth.get(queue[i]) + 1));
      incoming.set(child, incoming.get(child) - 1);
      if (!incoming.get(child)) queue.push(child);
    }
  return people.length ? Math.max(...depth.values()) : 0;
}
