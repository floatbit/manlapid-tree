export function ageAtPassing(birth, death) {
  const pattern = /^(About )?(\d{4})(?:-(\d{2})-(\d{2}))?$/;
  const born = pattern.exec(birth || ''), died = pattern.exec(death || '');
  if (!born || !died) return '';
  const exact = !born[1] && !died[1] && born[3] && died[3];
  if (exact && death < birth) return '';
  let age = Number(died[2]) - Number(born[2]);
  if (exact && died[0].slice(5) < born[0].slice(5)) age--;
  if (age < 0) return '';
  if (exact && age === 0) return 'Under 1 year old';
  return `${exact ? '' : 'About '}${age} ${age === 1 ? 'year' : 'years'} old`;
}
