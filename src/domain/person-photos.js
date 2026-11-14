/** Tagged photos are separate from the person's active headshot. */
export function photosOfPerson(snapshot, personId) {
  const pins=snapshot.photoPins?.[personId] || [];
  const rank=photo=>{const index=pins.indexOf(photo);return index<0?Infinity:index;};
  const headshot=(snapshot.people || []).find(p=>p.id===personId)?.photo;
  return Object.entries(snapshot.photoTags || {}).filter(([photo,ids])=>photo!==headshot && photo!==(snapshot.people || []).find(p=>p.id===personId)?.headshotOriginal && Array.isArray(ids) && ids.includes(personId) && !/\.(mp4|mov)$/i.test(photo)).map(([photo])=>photo).sort((a,b)=>rank(a)-rank(b));
}
