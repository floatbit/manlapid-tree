// Personalize existing kinship labels using recorded facts only, never names.
export function viewerRelationshipLabels(data, viewerId, baseLabels) {
  const people = new Map(data.people.map(p => [p.id, p]));
  if (!people.has(viewerId)) return new Map();
  const parents = new Map(data.people.map(p => [p.id, new Set()]));
  const siblings = new Map(data.people.map(p => [p.id, new Set()]));
  const graph = new Map(data.people.map(p => [p.id, new Set()]));
  for (const link of data.links) {
    if (!people.has(link.a) || !people.has(link.b)) continue;
    graph.get(link.a).add(link.b); graph.get(link.b).add(link.a);
    if (link.type === 'parent') parents.get(link.a).add(link.b);
    if (link.type === 'child') parents.get(link.b).add(link.a);
    if (link.type === 'sibling') { siblings.get(link.a).add(link.b); siblings.get(link.b).add(link.a); }
  }
  const reachable = new Set([viewerId]), queue = [viewerId];
  for (let i = 0; i < queue.length; i++) for (const id of graph.get(queue[i])) if (!reachable.has(id)) { reachable.add(id); queue.push(id); }
  const ancestors = id => {
    const found = new Set([id]), queue = [id];
    for (let i = 0; i < queue.length; i++) for (const parent of parents.get(queue[i])) if (!found.has(parent)) { found.add(parent); queue.push(parent); }
    return found;
  };
  const isSibling = (a, b) => a !== b && (siblings.get(a).has(b) || [...parents.get(a)].some(id => parents.get(b).has(id)));
  const gender = p => ['male', 'm'].includes(String(p?.gender || p?.sex || '').toLowerCase()) ? 'male' : ['female', 'f'].includes(String(p?.gender || p?.sex || '').toLowerCase()) ? 'female' : '';
  const branches = [...parents.get(viewerId)].map(id => ({ side: gender(people.get(id)) === 'male' ? 'Paternal' : gender(people.get(id)) === 'female' ? 'Maternal' : '', ancestors: ancestors(id) }));
  const labels = new Map();
  for (const [id, p] of people) {
    if (id === viewerId) { labels.set(id, 'Me'); continue; }
    if (!reachable.has(id)) { labels.set(id, 'No Recorded Connection'); continue; }
    let label = baseLabels.get(id) || 'Extended family';
    if (/^Cousin/i.test(label)) label = '1st ' + label;
    const g = gender(p), male = g === 'male', known = !!g;
    if (known) {
      label = label.replace(/grandparent/gi, male ? 'grandfather' : 'grandmother')
        .replace(/grandchild/gi, male ? 'grandson' : 'granddaughter')
        .replace(/aunt \/ uncle/gi, male ? 'uncle' : 'aunt')
        .replace(/niece \/ nephew/gi, male ? 'nephew' : 'niece')
        .replace(/parent/gi, male ? 'father' : 'mother')
        .replace(/child/gi, male ? 'son' : 'daughter')
        .replace(/sibling/gi, male ? 'brother' : 'sister');
    }
    if (/grandparent|grandfather|grandmother|aunt|uncle/i.test(label) && !/in-law|marriage/i.test(label)) {
      const sides = new Set(branches.filter(branch => [...branch.ancestors].some(ancestor => ancestor === id || isSibling(ancestor, id))).map(branch => branch.side));
      if (sides.size === 1 && !sides.has('')) label = [...sides][0] + ' ' + label;
    }
    labels.set(id, label.replace(/\b\w/g, letter => letter.toUpperCase()).replace(/-In-Law/g, '-in-law'));
  }
  return labels;
}
