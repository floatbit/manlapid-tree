const compare = (a,b) => a.localeCompare(b,undefined,{sensitivity:'base',numeric:true});
function parts(person) {
  const words=(person?.name || '').trim().split(/\s+/);
  return {last:person?.lastName?.trim() || words.at(-1) || '',first:person?.firstName?.trim() || words[0] || ''};
}
export function comparePeople(a,b) {
  const left=parts(a),right=parts(b);
  return compare(left.last,right.last) || compare(left.first,right.first) || compare(a?.name || '',b?.name || '');
}
export const sortPeople = people => [...people].sort(comparePeople);
