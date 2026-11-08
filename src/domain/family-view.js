export const defaultFamilyView = () => ({ above: 'none', below: 'children', expandedChildren: [] });
export function familyGenerationBands(group, people, links, preferences = group?.viewOptions) {
  if (!group) return [];
  const view = { ...defaultFamilyView(), ...preferences };
  if (view.below === 'none') view.below = 'children';
  const known = new Map(people.map((p) => [p.id, p]));
  const parents = new Map(),
    children = new Map();
  for (const link of links) {
    const parent = link.type === 'parent' ? link.b : link.type === 'child' ? link.a : null;
    const child = link.type === 'parent' ? link.a : link.b;
    if (!parent || !known.has(parent) || !known.has(child)) continue;
    if (!parents.has(child)) parents.set(child, new Set());
    if (!children.has(parent)) children.set(parent, new Set());
    parents.get(child).add(parent);
    children.get(parent).add(child);
  }
  const seen = new Set([...group.parents, ...group.children]);
  const bands = [
    { level: 0, ids: group.parents.filter((id) => known.has(id)) },
    { level: 1, ids: group.children.filter((id) => known.has(id)) },
  ];
  function walk(seeds, edges, firstLevel, direction, maxDepth) {
    let current = seeds;
    for (let depth = 0; current.length && depth < maxDepth; depth++) {
      const next = [];
      for (const id of current)
        for (const relative of edges.get(id) || []) {
          if (!seen.has(relative)) {
            seen.add(relative);
            next.push(relative);
          }
        }
      if (!next.length) break;
      next.sort((a, b) => known.get(a).name.localeCompare(known.get(b).name));
      bands.push({ level: firstLevel + depth * direction, ids: next });
      current = next;
    }
  }
  walk(
    group.parents,
    parents,
    -1,
    -1,
    view.above === 'all' ? people.length : view.above === 'parents' ? 1 : 0,
  );
  walk(
    group.children,
    children,
    2,
    1,
    view.below === 'all' ? people.length : view.below === 'grandchildren' ? 1 : 0,
  );
  return bands.sort((a, b) => a.level - b.level);
}
export function familyGenerationTitle(level) {
  if (level === 0) return 'Parents';
  if (level === 1) return 'Children';
  if (level === -1) return 'Grandparents';
  if (level === -2) return 'Great-Grandparents';
  if (level === 2) return 'Grandchildren';
  if (level === 3) return 'Great-Grandchildren';
  return level < 0
    ? `Ancestors · ${-level} generations above`
    : `Descendants · ${level} generations below`;
}
