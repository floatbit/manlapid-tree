function setupRelationshipSearch(id, { required = true, label = null } = {}) {
  const select = $('#' + id);
  select.hidden = true;
  select.required = false;
  const prior = $('#' + id + 'Picker');
  if (prior) prior.remove();
  const wrapper = document.createElement('div');
  wrapper.className = 'relationship-person-picker';
  wrapper.id = id + 'Picker';
  wrapper.innerHTML = `<input type="search" ${required ? 'required' : ''} aria-label="${
    label || (id === 'relationshipFrom' ? 'First person' : 'Second person')
  }" placeholder="Search for a person…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}Matches"><div id="${id}Matches" role="listbox" hidden></div>`;
  select.after(wrapper);
  const input = wrapper.querySelector('input'),
    list = wrapper.querySelector('[role="listbox"]');
  input.value = person(select.value) ? displayName(person(select.value)) : '';
  let results = [],
    active = -1;
  function close() {
    list.hidden = true;
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  function choose(p) {
    select.value = p.id;
    input.value = displayName(p);
    input.setCustomValidity('');
    select.dispatchEvent(new Event('change'));
    close();
    input.focus();
  }
  function highlight() {
    list.querySelectorAll('button').forEach((button, i) => {
      button.classList.toggle('search-active', i === active);
      button.setAttribute('aria-selected', String(i === active));
    });
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', id + 'Option' + active);
      list.children[active]?.scrollIntoView({ block: 'nearest' });
    }
  }
  function search() {
    const query = input.value.trim().toLocaleLowerCase();
    active = -1;
    input.removeAttribute('aria-activedescendant');
    if (!query) {
      results = [];
      close();
      return;
    }
    results = data.people
      .filter((p) => [...select.options].some((option) => option.value === p.id))
      .filter((p) => personMatchesQuery(p, query))
      .sort((a, b) => a.name.localeCompare(b.name));
    list.innerHTML =
      results
        .map(
          (p, i) =>
            `<button type="button" role="option" aria-selected="false" id="${id}Option${i}">${esc(
              displayName(p),
            )}</button>`,
        )
        .join('') || '<p>No matching people.</p>';
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    list
      .querySelectorAll('button')
      .forEach((button, i) => (button.onclick = () => choose(results[i])));
  }
  input.oninput = () => {
    select.value = '';
    select.dispatchEvent(new Event('change'));
    input.setCustomValidity(input.value.trim() ? 'Select a person from the matches.' : '');
    search();
  };
  input.onfocus = () => {
    if (!select.value) search();
  };
  input.onkeydown = (event) => {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (list.hidden) search();
      if (results.length && !list.hidden) {
        active =
          active < 0
            ? event.key === 'ArrowDown'
              ? 0
              : results.length - 1
            : (active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
        highlight();
      }
    } else if (event.key === 'Enter' && !list.hidden) {
      event.preventDefault();
      if (results.length) choose(results[Math.max(0, active)]);
    } else if (event.key === 'Escape' && !list.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') close();
  };
  wrapper.onfocusout = (event) => {
    if (!wrapper.contains(event.relatedTarget)) close();
  };
}
