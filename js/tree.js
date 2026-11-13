function expand(id, { fit = false } = {}) {
  if (!person(id)) return;
  const relatives = connections(id);
  relationshipTrace = relatives.length
    ? {
        from: id,
        to: id,
        immediate: true,
        ids: [id, ...relatives.map((c) => c.id)],
        edges: relatives.map((c) => ({ from: id, to: c.id, type: c.type })),
        label: 'Immediate family',
      }
    : null;
  data.selected = id;
  if (!data.visible.includes(id)) data.visible.push(id);
  for (const c of connections(id)) if (!data.visible.includes(c.id)) data.visible.push(c.id);
  if (relationshipTrace)
    for (const pathId of relationshipTrace.ids)
      if (!data.visible.includes(pathId)) data.visible.push(pathId);
  if (!data.expanded.includes(id)) data.expanded.push(id);
  save();
  render({ expanding: !fit, centerId: fit ? null : id, fit, resetPersonZoom: true });
  $('#details').scrollTop = 0;
}
function start(id) {
  ui.closeMobileMenu?.();
  $('#insightsPage').hidden = true;
  $('#insightsTab').classList.remove('active');
  $('#storiesPage').hidden = true;
  $('#storiesTab').classList.remove('active');
  $('#familiesPage').hidden = true;
  $('#familiesTab').classList.remove('active');
  $('#overviewPage').hidden = true;
  $('#overviewTab').classList.remove('active');
  $('#recipesPage').hidden = true;
  $('#recipesTab').classList.remove('active');
  $('#albumsPage').hidden = true;
  $('#albumsTab').classList.remove('active');
  if (
    ['editPerson', 'recipe', 'album'].some((key) =>
      new URLSearchParams(location.hash.slice(1)).has(key),
    )
  ) {
    const url = new URL(location.href);
    url.hash = '';
    history.replaceState(null, '', url);
  }
  $('#familyMapPage').hidden = true;
  $('#mapTab').classList.remove('active');
  rememberSection('tree');
  ui.setSection('tree');
  if (!restoringPageHistory) updatePageUrl('tree');
  if ($('#relationships').open) $('#relationships').close();
  $('#openRelationshipFinder').classList.remove('active');
  $('#timeline').hidden = true;
  $('#editor').hidden = true;
  $('#explore').hidden = false;
  $('#treeTab').classList.add('active');
  $('#peopleTab').classList.remove('active');
  $('#timelineTab').classList.remove('active');
  relationshipTrace = null;
  data.visible = [];
  data.expanded = [];
  data.root = id;
  closeSearch();
  $('#search').value = displayName(person(id));
  expand(id, { fit: true });
  if (window.matchMedia('(max-width: 760px)').matches) window.scrollTo({ top: 0, behavior: 'instant' });
}
const familyColors = {
  parent: '#d6b345',
  child: '#b58bdd',
  sibling: '#2a9ca5',
  spouse: '#e7794e',
  self: '#8b78c5',
};
const TREE_ZOOM_KEY = 'kinfolk-tree-zoom-v1';
function readSavedTreeZoom(storage) {
  try {
    const value = JSON.parse(storage.getItem(TREE_ZOOM_KEY));
    if (
      typeof value?.locked === 'boolean' &&
      Number.isFinite(value.scale) &&
      value.scale >= 0.2 &&
      value.scale <= 2
    )
      return value;
  } catch {}
  return { locked: false, scale: 1 };
}
const savedTreeZoom = readSavedTreeZoom(localStorage);
let zoomLocked = savedTreeZoom.locked;
let graphScale = zoomLocked ? savedTreeZoom.scale : 1,
  graphLayout = null,
  renderedRoot = null,
  cameraPadded = false;
function syncZoomLockControl() {
  const button = $('#lockZoom');
  $('#lockZoomLabel').textContent = zoomLocked ? 'Unlock' : 'Lock';
  button.title = zoomLocked ? 'Unlock zoom level' : 'Lock zoom level';
  button.setAttribute('aria-pressed', String(zoomLocked));
  button.setAttribute('aria-label', zoomLocked ? 'Unlock zoom level' : 'Lock zoom level');
}
function setGraphZoomLocked(locked) {
  zoomLocked = locked;
  try {
    localStorage.setItem(TREE_ZOOM_KEY, JSON.stringify({ locked, scale: graphScale }));
  } catch {}
  syncZoomLockControl();
}
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const treeAnimations = new Set();
let treeCenterRequest = 0;
async function centerAfterTreeSettles(id, request) {
  const nodeAnimations = [...treeAnimations].filter((animation) =>
    animation.effect?.target?.classList.contains('node'),
  );
  await Promise.race([
    Promise.allSettled(nodeAnimations.map((animation) => animation.finished)),
    new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? 0 : 180)),
  ]);
  if (
    zoomLocked ||
    request !== treeCenterRequest ||
    data.selected !== id ||
    !graphLayout?.positions.has(id)
  )
    return;
  centerGraphOnPerson(id, graphScale, getComputedStyle($('#scene')).transform);
}
function animateTree(element, frames, options) {
  if (reducedMotion.matches) return;
  const animation = element.animate(frames, options);
  treeAnimations.add(animation);
  animation.finished.catch(() => {}).finally(() => treeAnimations.delete(animation));
  return animation;
}
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) for (const animation of treeAnimations) animation.cancel();
});
function layoutFamily(ids, previous = null) {
  // Keep a person with two spouses between them, rather than implying a spouse chain.
  const orderSpouses = (unit) => {
    if (unit.length !== 3) return unit;
    const center = unit.find(id => connectionsDirect(id).filter(c => c.type === 'spouse' && unit.includes(c.id)).length === 2);
    if (!center) return unit;
    const others = unit.filter(id => id !== center);
    if (person(center)?.currentSpouseId === others[1]) others.reverse();
    unit.splice(0, unit.length, others[0], center, others[1]);
    return unit;
  };
  const root = ids.includes(data.root) ? data.root : ids[0],
    visible = new Set(ids),
    levels = new Map([[root, 0]]),
    branches = new Map(),
    queue = [root];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const c of connections(id)) {
      if (!visible.has(c.id) || levels.has(c.id)) continue;
      levels.set(c.id, levels.get(id) + (c.type === 'parent' ? -1 : c.type === 'child' ? 1 : 0));
      branches.set(c.id, branches.get(id) || c.type);
      queue.push(c.id);
    }
  }
  for (const id of ids) if (!levels.has(id)) levels.set(id, 0);
  if (previous?.root === root)
    for (const id of ids) if (previous.levels.has(id)) levels.set(id, previous.levels.get(id));
  const families = new Map();
  for (const child of ids) {
    const parents = connectionsDirect(child)
      .filter(
        (c) => c.type === 'parent' && visible.has(c.id) && levels.get(c.id) < levels.get(child),
      )
      .map((c) => c.id)
      .sort();
    if (!parents.length) continue;
    const key = parents.join('|');
    if (!families.has(key)) families.set(key, { parents, children: [] });
    families.get(key).children.push(child);
  }
  const rows = new Map();
  for (const id of ids) {
    const level = levels.get(id);
    if (!rows.has(level)) rows.set(level, []);
    rows.get(level).push(id);
  }
  // Group immediate family into a single row block, then keep each relationship short.
  const blocks = new Map();
  for (const [level, row] of rows) {
    const sets = row.map((id) => [id]),
      edges = new Map();
    function join(a, b, weight) {
      if (a === b || !row.includes(a) || !row.includes(b)) return;
      const key = [a, b].sort().join('|');
      const old = edges.get(key);
      if (!old || weight > old.weight) edges.set(key, { a, b, weight });
      const x = sets.find((g) => g.includes(a)),
        y = sets.find((g) => g.includes(b));
      if (x && y && x !== y) {
        x.push(...y);
        sets.splice(sets.indexOf(y), 1);
      }
    }
    for (const id of row)
      for (const c of connections(id))
        if (c.type === 'spouse' || c.type === 'sibling')
          join(id, c.id, c.type === 'sibling' ? 4 : 3);
    for (const f of families.values())
      for (let i = 1; i < f.parents.length; i++) join(f.parents[0], f.parents[i], 3);
    for (const group of sets) {
      const links = [...edges.values()].filter((e) => group.includes(e.a) && group.includes(e.b));
      const cost = (order) => {
        const index = new Map(order.map((id, i) => [id, i]));
        return links.reduce(
          (sum, e) => sum + e.weight * Math.abs(index.get(e.a) - index.get(e.b)),
          0,
        );
      };
      // Partner units are indivisible: sibling placement cannot split a couple.
      const units = group.map((id) => [id]);
      function unitePartners(a, b) {
        const x = units.find((u) => u.includes(a)),
          y = units.find((u) => u.includes(b));
        if (x && y && x !== y) {
          x.push(...y);
          units.splice(units.indexOf(y), 1);
        }
      }
      const hasSpouse = (id) =>
        connectionsDirect(id).some((c) => c.type === 'spouse' && group.includes(c.id));
      for (const id of group)
        for (const c of connectionsDirect(id)) if (c.type === 'spouse') unitePartners(id, c.id);
      // Known co-parents without recorded spouses stay paired as well.
      for (const f of families.values())
        if (f.parents.length === 2 && f.parents.every((id) => group.includes(id) && !hasSpouse(id)))
          unitePartners(f.parents[0], f.parents[1]);
      let best = cost(units.flat());
      for (let pass = 0; pass < group.length; pass++) {
        let changed = false;
        // Orient each couple so the sibling is on the side nearest their family.
        for (const unit of units) {
          unit.reverse();
          const score = cost(units.flat());
          if (score < best) {
            best = score;
            changed = true;
          } else unit.reverse();
        }
        // Move complete units, never individual spouses, when shortening connections.
        for (let i = 0; i < units.length - 1; i++)
          for (let j = i + 1; j < units.length; j++) {
            const candidate = [
              ...units.slice(0, i),
              ...units.slice(i, j + 1).reverse(),
              ...units.slice(j + 1),
            ];
            const score = cost(candidate.flat());
            if (score < best) {
              units.splice(0, units.length, ...candidate);
              best = score;
              changed = true;
            }
          }
        if (!changed) break;
      }
      group.splice(0, group.length, ...units.map(orderSpouses).flat());
    }
    blocks.set(level, sets);
  }
  const familyRows = new Map();
  for (const f of families.values()) {
    const level = levels.get(f.children[0]);
    familyRows.set(level, (familyRows.get(level) || 0) + 1);
  }
  const generationGap = 255 + Math.max(0, ...[...familyRows.values()].map((n) => n - 1)) * 16;
  const min = Math.min(...levels.values()),
    max = Math.max(...levels.values()),
    positions = new Map(),
    rowWidth = Math.max(...[...rows.values()].map((r) => r.length)) * 210 + 100;
  function placeRow(level, alignParents = false) {
    const groups = blocks.get(level);
    if (!groups) return;
    const count = groups.reduce((n, g) => n + g.length, 0);
    let x = alignParents ? 100 : (rowWidth - (count - 1) * 210) / 2;
    for (const group of groups) {
      if (alignParents) {
        const parents = [
          ...new Set(
            group.flatMap((id) =>
              connectionsDirect(id)
                .filter((c) => c.type === 'parent' && positions.has(c.id))
                .map((c) => c.id),
            ),
          ),
        ];
        if (parents.length) {
          const center = parents.reduce((sum, id) => sum + positions.get(id).x, 0) / parents.length;
          let desired = center - (group.length - 1) * 105;
          x = Math.max(desired, x);
        }
      }
      for (const id of group) {
        positions.set(id, { x, y: (level - min) * generationGap + 110 });
        x += 210;
      }
    }
  }
  for (let level = min; level <= max; level++) placeRow(level);
  // Align branches with their parents, without allowing cards to overlap.
  for (let pass = 0; pass < 4; pass++) {
    for (let level = min + 1; level <= max; level++) {
      const groups = blocks.get(level);
      if (!groups) continue;
      const score = (group) => {
        const ps = group.flatMap((id) =>
          connectionsDirect(id)
            .filter((c) => c.type === 'parent' && positions.has(c.id))
            .map((c) => positions.get(c.id).x),
        );
        return ps.length
          ? ps.reduce((n, x) => n + x, 0) / ps.length
          : group.reduce((n, id) => n + positions.get(id).x, 0) / group.length;
      };
      groups.sort((a, b) => score(a) - score(b));
      placeRow(level, true);
    }
  }
  // Remove unused leading space left behind by parent-aligned rows before fitting.
  const leftEdge = Math.min(...[...positions.values()].map((p) => p.x)) - 110;
  for (const position of positions.values()) position.x -= leftEdge;
  // Keep established rows in their visual order. New cards make room only to the right.
  if (previous?.root === root) {
    const offset = previous.positions.get(root).x - positions.get(root).x;
    const oldGap = previous.generationGap || generationGap;
    const gap = Math.max(oldGap, generationGap);
    const rootY = previous.positions.get(root).y;
    const siblingInsertions = new Map();
    for (const id of ids) {
      if (!previous.positions.has(id)) continue;
      const partner = connectionsDirect(id).find(
        (c) => c.type === 'spouse' && previous.positions.has(c.id),
      );
      if (!partner) continue;
      const anchorX = previous.positions.get(id).x;
      const direction = previous.positions.get(partner.id).x > anchorX ? -1 : 1;
      const added = connections(id).filter(
        (c) => c.type === 'sibling' && visible.has(c.id) && !previous.positions.has(c.id),
      );
      added.forEach((c, index) => {
        if (!siblingInsertions.has(c.id))
          siblingInsertions.set(c.id, anchorX + direction * 210 * (index + 1));
      });
    }
    for (const [, row] of [...rows].sort((a, b) => a[0] - b[0])) {
      const units = row.map((id) => [id]);
      const joinPartners = (a, b) => {
        const first = units.find((unit) => unit.includes(a));
        const second = units.find((unit) => unit.includes(b));
        if (first && second && first !== second) {
          first.push(...second);
          units.splice(units.indexOf(second), 1);
        }
      };
      for (const id of row)
        for (const c of connectionsDirect(id)) if (c.type === 'spouse') joinPartners(id, c.id);
      for (const family of families.values())
        if (
          family.parents.length === 2 &&
          family.parents.every((id) => row.includes(id)) &&
          family.parents.every(
            (id) => !connectionsDirect(id).some((c) => c.type === 'spouse' && row.includes(c.id)),
          )
        )
          joinPartners(...family.parents);
      const partnerUnits = units.map((unit) => [...unit]);
      // Reserve one continuous span for children of the same recorded parents.
      // Otherwise a newly revealed cousin can land in the middle of this family.
      for (const family of families.values())
        for (const child of family.children.slice(1)) joinPartners(family.children[0], child);
      const hasVisibleParents = (unit) =>
        unit.some((id) =>
          connectionsDirect(id).some(
            (c) => c.type === 'parent' && visible.has(c.id) && levels.get(c.id) < levels.get(id),
          ),
        );
      // A spouse's sibling with no visible parents belongs beside that spouse's
      // family, rather than being sorted as an unrelated floating card.
      for (const id of row)
        for (const c of connectionsDirect(id)) {
          if (c.type !== 'sibling' || !row.includes(c.id)) continue;
          const a = units.find((unit) => unit.includes(id));
          const b = units.find((unit) => unit.includes(c.id));
          if (a !== b && hasVisibleParents(a) !== hasVisibleParents(b)) joinPartners(id, c.id);
        }
      const ordered = units
        .map((unit) => {
          const anchor = (id) => previous.positions.get(id)?.x ?? positions.get(id).x + offset;
          const couples = partnerUnits.filter((pair) => pair.some((id) => unit.includes(id)));
          for (const pair of couples)
            pair.sort(
              (a, b) =>
                Number(previous.positions.has(b)) - Number(previous.positions.has(a)) ||
                anchor(a) - anchor(b),
            );
          couples.forEach(orderSpouses);
          couples.sort((a, b) => anchor(a[0]) - anchor(b[0]));
          const members = couples.flat();
          const established = members.filter((id) => previous.positions.has(id));
          const parents = [
            ...new Set(
              members.flatMap((id) =>
                connectionsDirect(id)
                  .filter(
                    (c) =>
                      c.type === 'parent' &&
                      positions.has(c.id) &&
                      levels.get(c.id) < levels.get(id),
                  )
                  .map((c) => c.id),
              ),
            ),
          ];
          const parentCenter = parents.length
            ? parents.reduce((sum, id) => sum + positions.get(id).x, 0) / parents.length
            : null;
          let desired =
            parentCenter === null
              ? established.length
                ? anchor(established[0])
                : Math.max(110, anchor(members[0]))
              : Math.max(110, parentCenter - (members.length - 1) * 105);
          const insertion = members.find((id) => siblingInsertions.has(id));
          if (!established.length && insertion) desired = siblingInsertions.get(insertion);
          return {
            members,
            x: desired,
            order: parentCenter ?? desired + (members.length - 1) * 105,
            old: established.length > 0,
          };
        })
        .sort((a, b) => a.order - b.order || Number(b.old) - Number(a.old));
      let nextX = Math.min(110, ...ordered.map((entry) => entry.x));
      for (const entry of ordered) {
        const startX = Math.max(
          entry.x,
          nextX,
          ...entry.members
            .filter((id) => previous.positions.has(id))
            .map((id) => previous.positions.get(id).x - entry.members.indexOf(id) * 210),
        );
        for (const [index, id] of entry.members.entries()) {
          const p = positions.get(id);
          p.x = startX + index * 210;
          p.y = rootY + levels.get(id) * gap;
        }
        nextX = startX + entry.members.length * 210;
      }
    }
    const topShift = Math.max(0, 110 - Math.min(...[...positions.values()].map((p) => p.y)));
    const leftShift = Math.max(0, 110 - Math.min(...[...positions.values()].map((p) => p.x)));
    for (const p of positions.values()) {
      p.y += topShift;
      p.x += leftShift;
    }
  }
  return {
    positions,
    branches,
    root,
    families: [...families.values()],
    levels,
    generationGap: Math.max(previous?.generationGap || 0, generationGap),
    width: Math.max(...[...positions.values()].map((p) => p.x + 110)),
    height: Math.max(...[...positions.values()].map((p) => p.y)) + 120,
  };
}
function familyRoutes(layout) {
  const { positions, families } = layout,
    routes = [],
    lanes = new Map(),
    paired = new Set(),
    stems = [];
  const add = (key, group, points, dashed = false) => routes.push({ key, group, points, dashed });
  for (const f of families) {
    const group = 'family-' + [...f.parents].sort().join('-'),
      ps = f.parents.map((id) => positions.get(id)),
      cs = f.children.map((id) => positions.get(id));
    const left = Math.min(...ps.map((p) => p.x)),
      right = Math.max(...ps.map((p) => p.x)),
      center = (left + right) / 2,
      rowY = Math.max(...ps.map((p) => p.y));
    const lane = lanes.get(rowY) || 0;
    lanes.set(rowY, lane + 1);
    const bus = rowY + 108 + lane * 16,
      start = ps.length === 1 ? ps[0].y + 74 : rowY + 36;
    // A parent's trunk must not lie on another family's child drop.
    const foreignDrops = families
      .filter((other) => other !== f)
      .flatMap((other) => other.children.map((id) => positions.get(id)))
      .filter((p) => p.y > rowY && p.y <= Math.min(...cs.map((c) => c.y)));
    let trunk = center;
    const blocked = (x) =>
      foreignDrops.some((p) => Math.abs(p.x - x) < 14) ||
      stems.some((stem) => stem.rowY === rowY && Math.abs(stem.x - x) < 14);
    for (let offset = 1; blocked(trunk) && offset < 40; offset++)
      trunk = center + (offset % 2 ? 1 : -1) * Math.ceil(offset / 2) * 22;
    stems.push({ x: trunk, rowY });
    if (ps.length > 1) {
      add(group + '-parents', group, [
        [left, rowY + 36],
        [right, rowY + 36],
      ]);
      for (let i = 0; i < f.parents.length; i++)
        for (let j = i + 1; j < f.parents.length; j++)
          paired.add([f.parents[i], f.parents[j]].sort().join('|'));
    }
    const stem =
      trunk === center
        ? [
            [center, start],
            [center, bus],
          ]
        : [
            [center, start],
            [center, rowY + 90],
            [trunk, rowY + 90],
            [trunk, bus],
          ];
    add(group + '-stem', group, stem);
    const xs = [trunk, ...cs.map((c) => c.x)];
    add(group + '-bus', group, [
      [Math.min(...xs), bus],
      [Math.max(...xs), bus],
    ]);
    cs.forEach((c, i) =>
      add(group + '-child-' + f.children[i], group, [
        [c.x, bus],
        [c.x, c.y - 70],
      ]),
    );
  }
  for (const id of data.visible)
    for (const c of connectionsDirect(id)) {
      if (c.type !== 'spouse' || !positions.has(c.id)) continue;
      const pair = [id, c.id].sort().join('|');
      if (paired.has(pair)) continue;
      paired.add(pair);
      const a = positions.get(id),
        b = positions.get(c.id),
        key = 'spouse-' + [id, c.id].sort().join('-');
      add(key, key, [
        [a.x, a.y + 36],
        [b.x, a.y + 36],
      ]);
    }
  const siblings = new Set();
  for (const id of data.visible)
    for (const c of connectionsDirect(id)) {
      if (c.type !== 'sibling' || !positions.has(c.id)) continue;
      const pair = [id, c.id].sort().join('|');
      if (
        siblings.has(pair) ||
        families.some((f) => f.children.includes(id) && f.children.includes(c.id))
      )
        continue;
      siblings.add(pair);
      const a = positions.get(id),
        b = positions.get(c.id),
        y = Math.min(a.y, b.y) - 88,
        key = 'sibling-' + [id, c.id].sort().join('-');
      add(
        key,
        key,
        [
          [a.x, a.y - 70],
          [a.x, y],
          [b.x, y],
          [b.x, b.y - 70],
        ],
        true,
      );
    }
  return mergeSiblingRoutes(routes);
}
function mergeSiblingRoutes(routes) {
  const solid = routes.filter((route) => !route.dashed),
    segments = new Map();
  for (const route of routes.filter((route) => route.dashed))
    for (let i = 1; i < route.points.length; i++) {
      const [ax, ay] = route.points[i - 1],
        [bx, by] = route.points[i];
      if (ax === bx && ay === by) continue;
      const horizontal = ay === by,
        fixed = horizontal ? ay : ax,
        key = (horizontal ? 'h' : 'v') + ':' + fixed;
      if (!segments.has(key)) segments.set(key, { horizontal, fixed, intervals: [] });
      segments
        .get(key)
        .intervals.push([
          Math.min(horizontal ? ax : ay, horizontal ? bx : by),
          Math.max(horizontal ? ax : ay, horizontal ? bx : by),
        ]);
    }
  // Each shared sibling rail/drop is painted once, so dash phases cannot fill gaps.
  for (const { horizontal, fixed, intervals } of segments.values()) {
    intervals.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const interval of intervals) {
      const last = merged.at(-1);
      if (last && interval[0] <= last[1]) last[1] = Math.max(last[1], interval[1]);
      else merged.push([...interval]);
    }
    for (const [from, to] of merged)
      solid.push({
        key: `siblings-${horizontal ? 'h' : 'v'}-${fixed}-${from}-${to}`,
        group: 'siblings',
        dashed: true,
        points: horizontal
          ? [
              [from, fixed],
              [to, fixed],
            ]
          : [
              [fixed, from],
              [fixed, to],
            ],
      });
  }
  return solid;
}
function connectorPath(route, routes) {
  const commands = [];
  for (let i = 1; i < route.points.length; i++) {
    const [x1, y1] = route.points[i - 1],
      [x2, y2] = route.points[i];
    if (x1 !== x2) {
      commands.push(`M ${x1} ${y1} H ${x2}`);
      continue;
    }
    const low = Math.min(y1, y2),
      high = Math.max(y1, y2),
      cuts = [];
    for (const other of routes) {
      if (other.group === route.group) continue;
      for (let j = 1; j < other.points.length; j++) {
        const [ax, ay] = other.points[j - 1],
          [bx, by] = other.points[j];
        if (ay !== by || ax === bx) continue;
        if (x1 >= Math.min(ax, bx) && x1 <= Math.max(ax, bx) && ay >= low && ay <= high)
          cuts.push([Math.max(low, ay - 7), Math.min(high, ay + 7)]);
      }
    }
    // Gaps indicate crossings, while actual family junctions remain continuous.
    cuts.sort((a, b) => a[0] - b[0]);
    let cursor = low;
    const pieces = [];
    for (const [from, to] of cuts) {
      if (from > cursor) pieces.push([cursor, from]);
      cursor = Math.max(cursor, to);
    }
    if (cursor < high) pieces.push([cursor, high]);
    if (y2 < y1) pieces.reverse();
    for (const [from, to] of pieces)
      commands.push(`M ${x1} ${y2 < y1 ? to : from} V ${y2 < y1 ? from : to}`);
  }
  return commands.join(' ');
}
function familyLines(layout) {
  const routes = familyRoutes(layout);
  return routes
    .map(
      (route) =>
        `<path data-edge="${route.key}" d="${connectorPath(
          route,
          routes,
        )}" fill="none" stroke="#8c9c8c" stroke-width="2" stroke-linejoin="round" ${
          route.dashed ? 'stroke-dasharray="5 5"' : ''
        }/>`,
    )
    .join('');
}
function spouseHearts(layout) {
  const seen = new Set(), hearts = [];
  for (const id of data.visible) {
    const a = layout.positions.get(id);
    if (!a) continue;
    for (const connection of connectionsDirect(id)) {
      const b = layout.positions.get(connection.id);
      if (connection.type !== 'spouse' || !b) continue;
      const currentA = person(id)?.currentSpouseId, currentB = person(connection.id)?.currentSpouseId;
      if ((currentA && currentA !== connection.id) || (currentB && currentB !== id)) continue;
      const key = [id, connection.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const x = (a.x + b.x) / 2, y = Math.max(a.y, b.y) + 36;
      hearts.push(`<g class="spouse-heart" transform="translate(${x} ${y})" pointer-events="none" aria-label="Spouse connection"><circle r="9" fill="#faf9f6"/><g transform="translate(-8 -8)" color="#587653">${uiIcon('heart')}</g></g>`);
    }
  }
  return hearts.join('');
}
function setGraphScale(scale, { animate = true, fromTransform = null, manual = false } = {}) {
  if (!graphLayout) return;
  const g = $('#graph'),
    scene = $('#scene');
  const before = fromTransform || getComputedStyle(scene).transform;
  for (const motion of scene.getAnimations()) motion.cancel();
  graphScale = zoomLocked && !manual ? graphScale : Math.max(0.2, Math.min(2, scale));
  if (zoomLocked && manual) setGraphZoomLocked(true);
  const w = graphLayout.width * graphScale,
    h = graphLayout.height * graphScale;
  $('#graphSpace').style.width =
    Math.max(g.clientWidth, w + (cameraPadded ? g.clientWidth : 0)) + 'px';
  $('#graphSpace').style.height =
    Math.max(g.clientHeight, h + (cameraPadded ? g.clientHeight : 0)) + 'px';
  scene.style.width = graphLayout.width + 'px';
  scene.style.height = graphLayout.height + 'px';
  const target = `translate(${
    cameraPadded ? g.clientWidth / 2 : Math.max(0, (g.clientWidth - w) / 2)
  }px,${
    cameraPadded ? g.clientHeight / 2 : Math.max(0, (g.clientHeight - h) / 2)
  }px) scale(${graphScale})`;
  scene.style.transform = target;
  $('#zoomLevel').textContent = Math.round(graphScale * 100) + '%';
  $('#zoomSlider').value = String(Math.round(graphScale * 100));
  $('#zoomSlider').setAttribute('aria-valuetext', Math.round(graphScale * 100) + '%');
  syncZoomLockControl();
  if (animate && before !== 'none')
    animateTree(scene, [{ transform: before }, { transform: target }], {
      duration: 700,
      easing: 'cubic-bezier(.22,1,.36,1)',
    });
}
function fitGraph(options = {}) {
  if (!graphLayout) return;
  const { expanding = false, ...animationOptions } = options;
  cameraPadded = false;
  const fitted = Math.max(
    0.2,
    Math.min(
      1,
      ($('#graph').clientWidth - 48) / graphLayout.width,
      ($('#graph').clientHeight - 96) / graphLayout.height,
    ),
  );
  const scale = expanding
    ? graphScale < 0.75
      ? graphScale
      : Math.max(0.75, Math.min(graphScale, fitted))
    : fitted;
  setGraphScale(scale, animationOptions);
  $('#graph').scrollTo({ left: 0, top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
}
function centerPerson(id) {
  if (!person(id) || !data.visible.includes(id)) return;
  data.selected = id;
  save();
  render({ centerId: id, resetPersonZoom: true });
}
function centerGraphOnPerson(id, scale, oldTransform) {
  const position = graphLayout?.positions.get(id);
  if (!position) return;
  const graph = $('#graph'),
    scene = $('#scene'),
    left = graph.scrollLeft,
    top = graph.scrollTop;
  cameraPadded = true;
  setGraphScale(scale, { animate: false });
  graph.scrollTo({
    left: position.x * graphScale,
    top: position.y * graphScale,
    behavior: 'instant',
  });
  // Compensate for the new scroll position so the camera has one continuous transition.
  if (oldTransform !== 'none') {
    const before = new DOMMatrixReadOnly(oldTransform);
    const start = `matrix(${before.a},${before.b},${before.c},${before.d},${
      before.e + graph.scrollLeft - left
    },${before.f + graph.scrollTop - top})`;
    animateTree(scene, [{ transform: start }, { transform: scene.style.transform }], {
      duration: 700,
      easing: 'cubic-bezier(.22,1,.36,1)',
    });
  }
}
function animateFamilyLines(previousLines) {
  if (reducedMotion.matches) return;
  const svg = $('#lines'),
    ns = 'http://www.w3.org/2000/svg';
  let index = 0;
  for (const path of [...svg.querySelectorAll('[data-edge]')]) {
    const old = previousLines.get(path.dataset.edge);
    if (old) {
      if (old !== path.getAttribute('d'))
        animateTree(path, [{ opacity: 0.2 }, { opacity: 1 }], { duration: 500 });
      continue;
    }
    // Reveal through a mask so dashed sibling lines retain their dash pattern.
    const mask = document.createElementNS(ns, 'mask'),
      reveal = document.createElementNS(ns, 'path');
    const maskId = 'connection-reveal-' + ++animateFamilyLines.serial;
    mask.id = maskId;
    mask.setAttribute('maskUnits', 'userSpaceOnUse');
    mask.setAttribute('x', '-10');
    mask.setAttribute('y', '-10');
    mask.setAttribute('width', graphLayout.width + 20);
    mask.setAttribute('height', graphLayout.height + 20);
    reveal.setAttribute('d', path.getAttribute('d'));
    reveal.setAttribute('fill', 'none');
    reveal.setAttribute('stroke', 'white');
    reveal.setAttribute('stroke-width', '8');
    reveal.setAttribute('pathLength', '1');
    mask.append(reveal);
    svg.append(mask);
    path.setAttribute('mask', `url(#${maskId})`);
    const animation = animateTree(
      reveal,
      [
        { strokeDasharray: '1', strokeDashoffset: '1' },
        { strokeDasharray: '1', strokeDashoffset: '0' },
      ],
      {
        duration: 850,
        delay: Math.min(index++ * 45, 300),
        easing: 'cubic-bezier(.4,0,.2,1)',
        fill: 'backwards',
      },
    );
    animation?.finished
      .catch(() => {})
      .finally(() => {
        path.removeAttribute('mask');
        mask.remove();
      });
  }
}
animateFamilyLines.serial = 0;
function render({ expanding = false, centerId = null, fit = false, resetPersonZoom = false } = {}) {
  const centerRequest = ++treeCenterRequest;
  if (relationshipTrace?.ids.some((id) => !person(id))) relationshipTrace = null;
  $('#canvas').classList.toggle(
    'showing-relationship',
    !!relationshipTrace && !relationshipTrace.immediate,
  );
  $('#relationshipBanner').hidden = !relationshipTrace || !!relationshipTrace.immediate;
  if (relationshipTrace) {
    $('#relationshipSummary').textContent = relationshipTrace.immediate
      ? `${displayName(person(relationshipTrace.from))} · Immediate family`
      : `${displayName(person(relationshipTrace.from))} → ${displayName(
          person(relationshipTrace.to),
        )} · ${relationshipTrace.label}`;
  }
  const oldRoot = renderedRoot,
    oldLayout = graphLayout,
    oldTransform = getComputedStyle($('#scene')).transform;
  const focusedCard = document.activeElement?.closest('.node')?.dataset.id;
  const oldNodes = new Map(
    [...document.querySelectorAll('.node')].map((node) => [node.dataset.id, node]),
  );
  const oldLines = new Map(
    [...document.querySelectorAll('#lines [data-edge]')].map((path) => [
      path.dataset.edge,
      path.getAttribute('d'),
    ]),
  );
  data.visible = data.visible.filter((id) => person(id));
  const ids = data.visible;
  $('#empty').hidden = ids.length > 0;
  $('#graph').hidden = !ids.length;
  $('#graphTools').hidden = !ids.length;
  $('#backToStart').hidden = !ids.length;
  $('#reset').hidden = !ids.length;
  $('#redrawTree').hidden = !ids.length;
  $('#count').textContent = `${ids.length} ${ids.length === 1 ? 'person' : 'people'} in view`;
  if (!ids.length) {
    graphLayout = null;
    renderedRoot = null;
    $('#nodes').replaceChildren();
    $('#lines').replaceChildren();
    for (const animation of treeAnimations) animation.cancel();
    renderDetails();
    return;
  }
  graphLayout = layoutFamily(ids, !fit && oldRoot === data.root ? oldLayout : null);
  const { positions, branches, root, width, height } = graphLayout;
  const focus = person(data.selected) ? data.selected : root;
  const labels = relationshipLabels(focus),
    sameTree = oldRoot === root && !!oldLayout;
  const fragment = document.createDocumentFragment();
  const visiblePeople = new Set(ids);
  let entering = 0;
  for (const id of ids) {
    const p = person(id),
      pos = positions.get(id),
      isRoot = id === root,
      kind = isRoot ? 'self' : branches.get(id) || 'sibling';
    const relation = labels.get(id) || 'Extended family';
    const existing = sameTree ? oldNodes.get(id) : null,
      node = existing || document.createElement('div');
    node.setAttribute('role', 'group');
    // Reuse cards to keep focus and avoid replaying entrances when selection changes.
    const currentMatrix = existing ? new DOMMatrixReadOnly(getComputedStyle(node).transform) : null;
    const before = existing
      ? {
          x: parseFloat(node.style.left) + currentMatrix.e + node.offsetWidth / 2,
          y: parseFloat(node.style.top) + currentMatrix.f + node.offsetHeight / 2,
        }
      : null;
    node.className = `node ${p.deceased ? 'is-deceased' : ''} ${
      id === data.selected ? 'selected' : ''
    } ${isRoot ? 'root-node' : ''} ${
      relationshipTrace && !relationshipTrace.immediate
        ? relationshipTrace.ids.includes(id)
          ? 'path-member'
          : 'path-muted'
        : ''
    }`;
    node.dataset.id = id;
    node.dataset.viewerName = displayName(p);
    node.dataset.viewerRelationFallback = relation;
    node.style.left = pos.x + 'px';
    node.style.top = pos.y + 'px';
    node.style.setProperty('--bubble', familyColors[kind]);
    const hiddenConnections = new Set(
      connections(id)
        .filter((relative) => !visiblePeople.has(relative.id))
        .map((relative) => relative.id),
    ).size;
    node.setAttribute(
      'aria-label',
      `${displayName(p)}, ${ui.viewerRelation(id) || relation}. ${
        hiddenConnections ? `${hiddenConnections} more immediate family members. ` : ''
      }Reveal connections`,
    );
    const contents = `<button type="button" class="node-open" aria-label="${esc(displayName(p))}, ${esc(ui.viewerRelation(id) || relation)}. Reveal connections">${avatar(p)}${
      p.deceased ? '<span class="node-deceased" aria-label="Deceased">Deceased</span>' : ''
    }${
      hiddenConnections
        ? `<span class="node-more-connections" aria-hidden="true">+${hiddenConnections}</span>`
        : ''
    }<strong>${esc(displayName(p))}</strong><small class="node-perspective">${viewerBadge(id, relation)}</small></button>${['parent','child','sibling','spouse'].map(type => `<button type="button" class="node-add-connection node-add-${type}" data-node-add="${type}" title="Add ${type} to ${esc(displayName(p))}" aria-label="Add ${type} to ${esc(displayName(p))}">＋</button>`).join('')}`;
    if (node.innerHTML !== contents) node.innerHTML = contents;
    node.onclick = (event) => {
      const add=event.target.closest('[data-node-add]');
      if(add) {event.stopPropagation();openFamilyDialog(id,add.dataset.nodeAdd);return;}
      expand(id);
      highlightViewerPath(id);
    };
    node.onpointerenter = () => highlightViewerPath(id);
    node.onpointerleave = clearViewerPath;
    node.onfocusin = () => highlightViewerPath(id);
    node.onfocusout = clearViewerPath;
    node.ondblclick = (event) => {if(!event.target.closest('[data-node-add]'))centerPerson(id);};
    node.title = hiddenConnections
      ? `Click to reveal ${hiddenConnections} more immediate family ${
          hiddenConnections === 1 ? 'member' : 'members'
        }`
      : 'Click to reveal immediate family and center';
    fragment.append(node);
    for (const animation of node.getAnimations()) animation.cancel();
    if (before && (before.x !== pos.x || before.y !== pos.y))
      animateTree(
        node,
        [
          {
            transform: `translate(calc(-50% + ${before.x - pos.x}px),calc(-50% + ${
              before.y - pos.y
            }px))`,
          },
          { transform: 'translate(-50%,-50%)' },
        ],
        { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' },
      );
    else if (!existing)
      animateTree(
        node,
        [
          { opacity: 0, transform: 'translate(-50%,calc(-50% + 20px)) scale(.86)' },
          { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' },
        ],
        {
          duration: 650,
          delay: 180 + Math.min(entering++ * 65, 390),
          easing: 'cubic-bezier(.16,1,.3,1)',
          fill: 'backwards',
        },
      );
  }
  $('#nodes').replaceChildren(fragment);
  if (focusedCard) {
    const restored = [...$('#nodes').children].find((node) => node.dataset.id === focusedCard);
    restored?.focus({ preventScroll: true });
  }
  const svg = $('#lines');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.innerHTML = familyLines(graphLayout) + relationshipPathLines(graphLayout) + spouseHearts(graphLayout);
  animateFamilyLines(sameTree ? oldLines : new Map());
  const layoutChanged =
    !sameTree ||
    width !== oldLayout.width ||
    height !== oldLayout.height ||
    ids.length !== oldNodes.size;
  const mobilePersonZoom = resetPersonZoom && window.matchMedia('(max-width: 760px)').matches;
  if (mobilePersonZoom) {
    graphScale = 1;
    setGraphZoomLocked(false);
    centerGraphOnPerson(centerId || data.selected || root, 1, oldTransform);
  } else if (fit) {
    if (zoomLocked) centerGraphOnPerson(data.selected || root, graphScale, oldTransform);
    else fitGraph({ fromTransform: oldTransform });
  } else if (expanding && sameTree) {
    const graph = $('#graph');
    const before = new DOMMatrixReadOnly(oldTransform);
    const oldLeft = graph.scrollLeft,
      oldTop = graph.scrollTop;
    setGraphScale(graphScale, { animate: false });
    const after = new DOMMatrixReadOnly(getComputedStyle($('#scene')).transform);
    graph.scrollLeft =
      oldLeft +
      (positions.get(root).x - oldLayout.positions.get(root).x) * graphScale +
      after.e -
      before.e;
    graph.scrollTop =
      oldTop +
      (positions.get(root).y - oldLayout.positions.get(root).y) * graphScale +
      after.f -
      before.f;
  } else if (centerId) {
    const fitted = Math.max(
      0.2,
      Math.min(1, ($('#graph').clientWidth - 48) / width, ($('#graph').clientHeight - 96) / height),
    );
    const scale =
      expanding && sameTree
        ? graphScale < 0.75
          ? graphScale
          : Math.max(0.75, Math.min(graphScale, fitted))
        : expanding
        ? Math.max(0.75, fitted)
        : graphScale;
    centerGraphOnPerson(centerId, scale, oldTransform);
  } else if (layoutChanged) {
    // Start a new search slightly closer, then ease out to reveal the full family.
    if (!sameTree) {
      setGraphScale(1.18, { animate: false });
      fitGraph();
    } else fitGraph({ fromTransform: oldTransform, expanding });
  }
  renderedRoot = root;
  renderDetails();
  if (expanding && sameTree && centerId && !zoomLocked && !mobilePersonZoom)
    centerAfterTreeSettles(centerId, centerRequest);
}
