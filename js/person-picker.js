function setupRelationshipSearch(id, { required = true, label = null } = {}) {
  ui.mountPersonPicker(document.querySelector('#' + id), {
    required,
    label: label || (id === 'relationshipFrom' ? 'First person' : 'Second person'),
    people: () => data.people,
    display: displayName,
    matches: personMatchesQuery,
  });
}
