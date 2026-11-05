let livedDraft=[],livedPending=new Set(),livedSession=0;
function placesLivedPending(){return livedPending.size>0}
function renderPlacesLived(entries){
 livedSession++;livedPending.clear();livedDraft=entries.map(entry=>({...entry}));$('#placesLivedRows').replaceChildren();$('#placesLivedStatus').textContent='';
 livedDraft.forEach(entry=>appendPlaceLivedRow(entry));updatePlacesLivedCurrent();
}
function appendPlaceLivedRow(entry){
 const session=livedSession,row=document.createElement('div');row.className='place-lived-row';
 row.innerHTML=`<div class="place-lived-heading"><strong>${esc(entry.location||'New place')}</strong><button type="button" aria-label="Remove place lived">×</button></div><div class="lived-google-search"></div><p class="lived-lookup-status hint" role="status"></p><div class="lived-date-note"><label>Moved here (year or date)<input class="lived-date" value="${esc(entry.date||'')}" placeholder="1980 or 1980-06-15" required pattern="[0-9]{4}(-[0-9]{2}-[0-9]{2})?"></label><label>Memory or note (optional)<textarea class="lived-note" maxlength="2000" rows="2">${esc(entry.note||'')}</textarea></label></div>`;
 row.querySelector('button').onclick=()=>{livedDraft=livedDraft.filter(item=>item!==entry);livedPending.delete(entry.id);row.remove()};
 row.querySelector('.lived-date').oninput=e=>entry.date=e.target.value.trim();row.querySelector('.lived-note').oninput=e=>entry.note=e.target.value;
 $('#placesLivedRows').append(row);
 const status=row.querySelector('.lived-lookup-status');status.textContent='Loading Google location search…';
 loadPlacesLibrary().then(({PlaceAutocompleteElement})=>{
  if(session!==livedSession||!row.isConnected)return;
  const widget=new PlaceAutocompleteElement();widget.setAttribute('aria-label','Find a city or country lived in');row.querySelector('.lived-google-search').append(widget);status.textContent=entry.location?'Search to change this place.':'Choose a city, region, or country from Google.';
  let selection=0;
  widget.addEventListener('gmp-select',async({placePrediction})=>{
   const current=++selection;livedPending.add(entry.id);status.textContent='Looking up location…';
   try{const place=placePrediction.toPlace();await place.fetchFields({fields:['formattedAddress','displayName','location']});if(session!==livedSession||!row.isConnected||current!==selection)return;Object.assign(entry,{location:place.formattedAddress||place.displayName||'',placeId:place.id,lat:place.location?.lat(),lng:place.location?.lng()});row.querySelector('strong').textContent=entry.location;status.textContent='Selected. Save person to keep this place.'}catch{status.textContent='Could not look up this place. Please select a Google suggestion again.'}finally{if(session===livedSession&&current===selection)livedPending.delete(entry.id)}
  });widget.addEventListener('gmp-error',()=>status.textContent='Google search is unavailable. Please check your API settings.');
 }).catch(()=>{if(row.isConnected)status.textContent='Google location search could not load.'});
}
function readPlacesLived(){
 for(const entry of livedDraft){
  if(!entry.location||!entry.placeId||!Number.isFinite(entry.lat)||!Number.isFinite(entry.lng)){$('#formError').textContent='Choose a Google suggestion for each place lived, or remove the unfinished entry.';return null}
  if(!/^\d{4}(-\d{2}-\d{2})?$/.test(entry.date)||entry.date<'0001'){$('#formError').textContent='Enter a year or full date for each place lived.';return null}
 }
 return livedDraft.map(entry=>({...entry})).sort((a,b)=>a.date.localeCompare(b.date));
}
$('#addPlaceLived').onclick=()=>{const entry={id:crypto.randomUUID(),date:'',note:'',location:'',placeId:'',lat:null,lng:null};livedDraft.push(entry);appendPlaceLivedRow(entry)};

let draftBirthplace=null,birthplacePending=false,birthplaceSession=0;
function renderBirthplace(place){
 draftBirthplace=place?{...place}:null;birthplaceSession++;birthplacePending=false;
 $('#birthplaceSelected').textContent=draftBirthplace?.location||'No birthplace selected.';$('#clearBirthplace').hidden=!draftBirthplace;$('#birthplaceStatus').textContent='';$('#birthplaceFinder').replaceChildren();
 if(!$('#editor').hidden)setupBirthplaceFinder();
}
async function setupBirthplaceFinder(){
 const session=++birthplaceSession;birthplacePending=false;$('#birthplaceFinder').replaceChildren();$('#birthplaceStatus').textContent='Loading Google search…';
 try{
  const {PlaceAutocompleteElement}=await loadPlacesLibrary();if(session!==birthplaceSession)return;
  const finder=new PlaceAutocompleteElement();finder.setAttribute('aria-label','Search birthplace city or country');$('#birthplaceFinder').append(finder);$('#birthplaceStatus').textContent='Select a Google suggestion. A city or country is enough.';let selection=0;
  finder.addEventListener('gmp-error',()=>$('#birthplaceStatus').textContent='Google location search is unavailable.');
  finder.addEventListener('gmp-select',async({placePrediction})=>{
   const version=++selection;birthplacePending=true;$('#birthplaceStatus').textContent='Looking up birthplace…';
   try{const place=placePrediction.toPlace();await place.fetchFields({fields:['formattedAddress','displayName','location']});if(session!==birthplaceSession||version!==selection)return;draftBirthplace={location:place.formattedAddress||place.displayName||'',placeId:place.id,lat:place.location?.lat(),lng:place.location?.lng()};$('#birthplaceSelected').textContent=draftBirthplace.location;$('#clearBirthplace').hidden=false;$('#birthplaceStatus').textContent='Selected. Save person to keep this birthplace.'}catch{if(session===birthplaceSession)$('#birthplaceStatus').textContent='Could not look up birthplace. Please choose a Google suggestion again.'}finally{if(session===birthplaceSession&&version===selection)birthplacePending=false}
  });
 }catch{if(session===birthplaceSession)$('#birthplaceStatus').textContent='Google location search could not load.'}
}
$('#clearBirthplace').onclick=()=>renderBirthplace(null);

function updatePlacesLivedCurrent(){
 const location=$('#location').value.trim(),container=$('#placesLivedCurrent');
 container.innerHTML=location?`<div class="place-lived-row"><strong>Current Location</strong><p>${esc(location)}</p><p class="hint">Shown automatically as the final migration stop. Update it in Current Location above.</p></div>`:'';
}
