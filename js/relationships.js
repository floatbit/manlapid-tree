function connections(id) {
  const out = [];
  for (const l of data.links) {
    if (l.a === id) out.push({ id: l.b, type: l.type });
    else if (l.b === id) out.push({ id: l.a, type: inverse[l.type] });
  }
  const parents = out.filter((c) => c.type === 'parent').map((c) => c.id);
  for (const par of parents) {
    for (const c of connectionsDirect(par)) {
      if (c.type === 'child' && c.id !== id && !out.some((o) => o.id === c.id))
        out.push({ id: c.id, type: 'sibling' });
    }
  }
  return out.filter((c) => person(c.id));
}
function connectionsDirect(id) {
  return data.links.flatMap((l) =>
    l.a === id
      ? [{ id: l.b, type: l.type }]
      : l.b === id
      ? [{ id: l.a, type: inverse[l.type] }]
      : [],
  );
}
function relationshipLabels(focusId) {
  const parents = new Map(data.people.map((p) => [p.id, new Set()])),
    children = new Map(data.people.map((p) => [p.id, new Set()])),
    siblings = new Map(data.people.map((p) => [p.id, new Set()])),
    partners = new Map(data.people.map((p) => [p.id, new Set()]));
  for (const l of data.links) {
    if (!parents.has(l.a) || !parents.has(l.b)) continue;
    if (l.type === 'parent' || l.type === 'child') {
      const child = l.type === 'parent' ? l.a : l.b,
        parent = l.type === 'parent' ? l.b : l.a;
      parents.get(child).add(parent);
      children.get(parent).add(child);
    } else if (l.type === 'sibling') {
      siblings.get(l.a).add(l.b);
      siblings.get(l.b).add(l.a);
    } else if (l.type === 'spouse') {
      partners.get(l.a).add(l.b);
      partners.get(l.b).add(l.a);
    }
  }
  const siblingCache = new Map(),
    ancestorCache = new Map();
  function siblingIds(id) {
    if (!siblingCache.has(id)) {
      const ids = new Set(siblings.get(id));
      for (const parent of parents.get(id) || [])
        for (const child of children.get(parent) || []) if (child !== id) ids.add(child);
      siblingCache.set(id, ids);
    }
    return siblingCache.get(id);
  }
  function ancestors(id) {
    if (!ancestorCache.has(id)) {
      const found = new Map([[id, 0]]),
        queue = [id];
      for (let i = 0; i < queue.length; i++) {
        const child = queue[i],
          depth = found.get(child);
        if (depth >= 12) continue;
        for (const parent of parents.get(child) || [])
          if (!found.has(parent)) {
            found.set(parent, depth + 1);
            queue.push(parent);
          }
      }
      ancestorCache.set(id, found);
    }
    return ancestorCache.get(id);
  }
  function kinship(a, b) {
    if (a === b) return 'Selected person';
    const aa = ancestors(a),
      bb = ancestors(b);
    if (aa.has(b)) {
      const n = aa.get(b);
      return n === 1 ? 'Parent' : n === 2 ? 'Grandparent' : `${'Great-'.repeat(n - 2)}grandparent`;
    }
    if (bb.has(a)) {
      const n = bb.get(a);
      return n === 1 ? 'Child' : n === 2 ? 'Grandchild' : `${'Great-'.repeat(n - 2)}grandchild`;
    }
    let best = null;
    const consider = (up, down) => {
      if (!best || up + down < best[0] + best[1]) best = [up, down];
    };
    for (const [ancestor, up] of aa) {
      if (bb.has(ancestor)) consider(up, bb.get(ancestor));
      for (const sibling of siblingIds(ancestor))
        if (bb.has(sibling)) consider(up + 1, bb.get(sibling) + 1);
    }
    if (!best) return null;
    const [up, down] = best;
    if (up === 1 && down === 1) return 'Sibling';
    if (down === 1) return up === 2 ? 'Aunt / uncle' : `${'Great-'.repeat(up - 2)}aunt / uncle`;
    if (up === 1)
      return down === 2 ? 'Niece / nephew' : `${'Great-'.repeat(down - 2)}niece / nephew`;
    const degree = Math.min(up, down) - 1,
      removed = Math.abs(up - down),
      ordinal = degree === 1 ? '' : degree === 2 ? '2nd ' : degree === 3 ? '3rd ' : `${degree}th `;
    return `${ordinal}Cousin${
      removed === 0
        ? ''
        : removed === 1
        ? ' once removed'
        : removed === 2
        ? ' twice removed'
        : ` ${removed}× removed`
    }`;
  }
  const labels = new Map();
  for (const p of data.people) {
    let label = partners.get(focusId)?.has(p.id) ? 'Spouse' : kinship(focusId, p.id);
    if (!label) {
      for (const partner of partners.get(focusId) || []) {
        const related = kinship(partner, p.id);
        if (related) {
          label = ['Parent', 'Sibling', 'Child', 'Grandparent', 'Grandchild'].includes(related)
            ? related + '-in-law'
            : related + ' by marriage';
          break;
        }
      }
    }
    if (!label) {
      for (const partner of partners.get(p.id) || []) {
        const related = kinship(focusId, partner);
        if (related) {
          label = ['Parent', 'Sibling', 'Child', 'Grandparent', 'Grandchild'].includes(related)
            ? related + '-in-law'
            : related + ' by marriage';
          break;
        }
      }
    }
    labels.set(p.id, label || 'Extended family');
  }
  return labels;
}
let relationshipTrace = null,
  lastRelationshipResult = null;
function findRelationship(from, to) {
  if (!person(from) || !person(to)) return null;
  if (from === to) return { from, to, ids: [from], edges: [], label: 'Same person' };
  const label = relationshipLabels(from).get(to),
    bloodOnly = !/Spouse|in-law|marriage|Extended/.test(label);
  const previous = new Map([[from, null]]),
    queue = [from];
  for (let i = 0; i < queue.length && !previous.has(to); i++)
    for (const edge of connections(queue[i])) {
      if (previous.has(edge.id) || (bloodOnly && edge.type === 'spouse')) continue;
      previous.set(edge.id, { from: queue[i], type: edge.type });
      queue.push(edge.id);
      if (edge.id === to) break;
    }
  if (!previous.has(to)) return null;
  const ids = [to],
    edges = [];
  let current = to;
  while (current !== from) {
    const step = previous.get(current);
    edges.push({ from: step.from, to: current, type: step.type });
    ids.push(step.from);
    current = step.from;
  }
  return { from, to, ids: ids.reverse(), edges: edges.reverse(), label };
}
function relationshipPathLines(layout) {
  if (!relationshipTrace) return '';
  const { positions, families } = layout,
    normal = familyRoutes(layout),
    highlights = [];
  for (const edge of relationshipTrace.edges) {
    const a = positions.get(edge.from),
      b = positions.get(edge.to);
    if (!a || !b) continue;
    let points,
      group = 'relationship-trace';
    if (edge.type === 'parent' || edge.type === 'child') {
      const parent = edge.type === 'parent' ? edge.to : edge.from,
        child = edge.type === 'parent' ? edge.from : edge.to;
      const family = families.find((f) => f.parents.includes(parent) && f.children.includes(child));
      if (!family) continue;
      group = 'family-' + [...family.parents].sort().join('-');
      const stem = normal.find((r) => r.key === group + '-stem'),
        drop = normal.find((r) => r.key === group + '-child-' + child);
      if (!stem || !drop) continue;
      const par = positions.get(parent);
      points = family.parents.length > 1 ? [[par.x, par.y + 36], ...stem.points] : [...stem.points];
      points.push(...drop.points);
    } else if (edge.type === 'sibling') {
      const family = families.find(
        (f) => f.children.includes(edge.from) && f.children.includes(edge.to),
      );
      if (family) {
        group = 'family-' + [...family.parents].sort().join('-');
        const bus = normal.find((r) => r.key === group + '-bus');
        const y = bus.points[0][1];
        points = [
          [a.x, a.y - 70],
          [a.x, y],
          [b.x, y],
          [b.x, b.y - 70],
        ];
      } else {
        group = 'siblings';
        const y = Math.min(a.y, b.y) - 88;
        points = [
          [a.x, a.y - 70],
          [a.x, y],
          [b.x, y],
          [b.x, b.y - 70],
        ];
      }
    } else
      points = [
        [a.x, a.y + 36],
        [b.x, b.y + 36],
      ];
    const route = { group, points };
    highlights.push(
      `<path class="relationship-highlight" d="${connectorPath(
        route,
        normal,
      )}" fill="none" stroke="#b47528" stroke-width="4" stroke-linejoin="round" ${
        edge.type === 'sibling' ? 'stroke-dasharray="5 5"' : ''
      }/>`,
    );
  }
  return highlights.join('');
}
function showSelectedPersonPath(id) {
  const result = findRelationship(data.root, id);
  if (!result) {
    notify('No connecting path is recorded for these people.');
    return;
  }
  relationshipTrace = result;
  data.visible = [...new Set([...data.visible, ...result.ids])];
  data.selected = id;
  save();
  render();
  fitGraph();
}
function clearRelationshipPath() {
  relationshipTrace = null;
  $('#relationshipBanner').hidden = true;
  render();
}
function showRelationshipPath(result) {
  if (!result) return;
  relationshipTrace = result;
  data.root = result.from;
  data.visible = [...result.ids];
  data.expanded = [];
  $('#search').value = person(result.from).name;
  data.selected = result.from;
  save();
  tab(false);
  render();
  fitGraph();
}
function populateRelationshipFinder() {
  if (!sharedReady) {
    notify('Wait for the family database to load.');
    return;
  }
  const people = [...data.people].sort((a, b) => a.name.localeCompare(b.name));
  const options =
    '<option value="">Choose a person…</option>' +
    people.map((p) => `<option value="${p.id}">${esc(displayName(p))}</option>`).join('');
  const previousFrom = $('#relationshipFrom').value,
    previousTo = $('#relationshipTo').value;
  $('#relationshipFrom').innerHTML = options;
  $('#relationshipTo').innerHTML = options;
  $('#relationshipFrom').value = person(previousFrom)
    ? previousFrom
    : data.selected || data.root || '';
  $('#relationshipTo').value = person(previousTo)
    ? previousTo
    : data.root && data.root !== data.selected
    ? data.root
    : '';
  setupRelationshipSearch('relationshipFrom');
  setupRelationshipSearch('relationshipTo');
  $('#relationshipResult').replaceChildren();
}
function visibleFromExpanded(root, expanded) {
  const visible = new Set();
  if (!person(root)) return [];
  const open = new Set(expanded),
    queue = [root];
  visible.add(root);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (!open.has(id)) continue;
    for (const c of connections(id))
      if (!visible.has(c.id)) {
        visible.add(c.id);
        queue.push(c.id);
      }
  }
  return [...visible];
}
function collapseBranch(id) {
  relationshipTrace = null;
  if (!data.expanded.includes(id)) return;
  data.expanded = data.expanded.filter((personId) => personId !== id);
  data.visible = visibleFromExpanded(data.root, data.expanded);
  data.expanded = data.expanded.filter((personId) => data.visible.includes(personId));
  if (!data.visible.includes(data.selected)) data.selected = data.root;
  save();
  render();
  notify('Branch collapsed. Shared connections stay visible.');
}
