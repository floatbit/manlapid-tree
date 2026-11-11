$('#openRelationshipFinder').onclick = openRelationshipFinder;
$('#clearRelationshipPath').onclick = clearRelationshipPath;
$('#relationshipForm').onsubmit = (event) => {
  event.preventDefault();
  const from = $('#relationshipFrom').value,
    to = $('#relationshipTo').value;
  const result = findRelationship(from, to);
  lastRelationshipResult = result;
  if (!result) {
    $('#relationshipResult').innerHTML =
      '<h3>No Connection Recorded</h3><p>These people do not have a connecting path in the saved family records.</p>';
    return;
  }
  if (from === to) {
    $('#relationshipResult').innerHTML =
      '<h3>That’s the Same Person.</h3><p>Choose two different people to find a relationship.</p>';
    return;
  }
  const label = result.label.toLowerCase();
  const sentence =
    result.label === 'Extended family'
      ? `${displayName(person(from))} and ${displayName(
          person(to),
        )} are connected through extended family.`
      : `${displayName(person(to))} is ${displayName(person(from))}’s ${label}.`;
  $(
    '#relationshipResult',
  ).innerHTML = `<div class="relationship-answer"><p class="eyebrow">THEIR CONNECTION</p><h3>${esc(
    sentence,
  )}</h3></div><p class="hint">${result.edges.length} ${
    result.edges.length === 1 ? 'connection' : 'connections'
  } along the shortest recorded path</p><ol class="relationship-steps">${result.ids
    .map(
      (id, i) =>
        `<li>${i ? `<small>↓ ${esc(result.edges[i - 1].type)}</small>` : ''}<span>${avatar(
          person(id),
        )}<strong>${esc(displayName(person(id)))}</strong></span></li>`,
    )
    .join(
      '',
    )}</ol><button id="showRelationshipPath" class="primary" type="button">Show path in tree ${uiIcon('arrowRight')}</button>`;
  $('#showRelationshipPath').onclick = () => showRelationshipPath(lastRelationshipResult);
};
for (const select of ['#relationshipFrom', '#relationshipTo'])
  $(select).onchange = () => {
    $('#relationshipResult').replaceChildren();
    lastRelationshipResult = null;
  };
