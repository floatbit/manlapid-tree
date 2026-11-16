export function personStory(person, { formatDate = value => value, people = [], relatives = [], milestones = [] } = {}) {
  if (person.bio?.trim()) return person.bio.trim();
  const familiar = p => p?.nicknames?.find(n => typeof n === 'string' && n.trim())?.trim() || p?.firstName?.trim() || p?.name?.trim().split(/\s+/)[0] || 'This family member';
  const name = familiar(person), sentences = [];
  const join = values => values.length > 1 ? values.slice(0,-1).join(', ')+' and '+values.at(-1) : values[0];
  const birth = person.dateDetails?.birth || person.birthday;
  const birthplace = typeof person.birthplace === 'string' ? person.birthplace : person.birthplace?.location;
  const dated = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'on ' + formatDate(value) : 'in ' + formatDate(value).replace(/^About /,'about ');
  const city = value => value?.split(',')[0]?.trim();
  if (birth || birthplace) sentences.push(`${name} was born${birth ? ' '+dated(birth) : ''}${birthplace ? ' in '+city(birthplace) : ''}.`);
  const related = type => [...new Set(relatives.filter(r => r.type === type).map(r => r.id))].map(id => people.find(p => p.id === id)).filter(Boolean);
  const parents = related('parent'), spouses = related('spouse'), children = related('child');
  if (parents.length) sentences.push(`${name} is ${join(parents.map(familiar))}’s child.`);
  let sharedHome = false;
  for (const spouse of spouses) {
    const weddings = milestones.filter(e => e.type === 'marriage' && e.participants?.includes(person.id) && e.participants.includes(spouse.id));
    const wedding = weddings.find(e => /^(?:About )?\d{4}/.test(e.date || ''));
    const year = /^(About )?(\d{4})/.exec(wedding?.date || '');
    let sentence = year ? `${name} married ${familiar(spouse)} in ${year[1]?'about ':''}${year[2]}` : `${name} married ${familiar(spouse)}`;
    if (!person.deceased && !spouse.deceased && spouses.length === 1 && person.location?.trim() && person.location.trim().toLowerCase() === spouse.location?.trim().toLowerCase()) {
      sentence += `, and they currently live in ${city(person.location)}`;
      sharedHome = true;
    }
    sentences.push(sentence+'.');
  }
  if (children.length) sentences.push(`${name} ${person.deceased?'was':'is'} a parent to ${join(children.map(familiar))}.`);
  if (person.deceased && person.dateDetails?.death) sentences.push(`${name} passed away ${dated(person.dateDetails.death)}.`);
  else if (!person.deceased && person.location && !sharedHome) sentences.push(`${name} currently lives in ${city(person.location)}.`);
  return sentences.join(' ') || `Help tell ${name}’s story by adding a few memories.`;
}
