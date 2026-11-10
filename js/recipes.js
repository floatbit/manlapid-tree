const recipeCategories = {
  main: 'Main dishes',
  side: 'Sides',
  soup: 'Soups and stews',
  dessert: 'Desserts',
  baking: 'Baking',
  breakfast: 'Breakfast',
  snack: 'Snacks',
  drink: 'Drinks',
  other: 'Other',
};
let selectedRecipeId = null,
  recipeDraftPhotos = [],
  recipePhotoSession = 0,
  recipePhotoProcessing = false;
function recipeMatches(recipes, query, category, personId) {
  const q = query.trim().toLocaleLowerCase();
  return recipes
    .filter(
      (r) =>
        (!category || r.category === category) &&
        (!personId || r.personId === personId) &&
        (!q || [r.title, r.ingredients, r.story].join(' ').toLocaleLowerCase().includes(q)),
    )
    .sort((a, b) => a.title.localeCompare(b.title));
}
function recipePersonOptions() {
  return [...data.people]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => `<option value="${esc(p.id)}">${esc(displayName(p))}</option>`)
    .join('');
}
function renderRecipes() {
  if (collectionRevisions.get('recipes') !== sharedRevision)
    return withCollection('recipes', () => renderRecipes());
  const category = $('#recipeCategoryFilter').value,
    from = $('#recipePersonFilter').value;
  $('#recipeCategoryFilter').innerHTML =
    '<option value="">All categories</option>' +
    Object.entries(recipeCategories)
      .map(([id, label]) => `<option value="${id}">${label}</option>`)
      .join('');
  $('#recipeCategoryFilter').value = category || '';
  $('#recipePersonFilter').innerHTML = '<option value="">Everyone</option>' + recipePersonOptions();
  $('#recipePersonFilter').value = person(from) ? from : '';
  const recipes = recipeMatches(data.recipes || [], $('#recipeSearch').value, category, from);
  $('#recipesCount').textContent = `${recipes.length} ${
    recipes.length === 1 ? 'recipe' : 'recipes'
  }`;
  ui.sync(data);
  ui.setRecipes(recipes);
  if (selectedRecipeId) {
    if ((data.recipes || []).some((r) => r.id === selectedRecipeId))
      openRecipe(selectedRecipeId, { updateUrl: false });
    else closeRecipe();
  }
}
function openRecipe(id, { updateUrl = true } = {}) {
  if (collectionRevisions.get('recipes') !== sharedRevision)
    return withCollection('recipes', () => openRecipe(id, { updateUrl }));
  const r = (data.recipes || []).find((r) => r.id === id);
  if (!r) {
    notify('This recipe is no longer available.');
    return;
  }
  selectedRecipeId = id;
  $('#recipeDirectory').hidden = true;
  const detail = $('#recipeDetail');
  detail.hidden = false;
  ui.setRecipeDetail(r);
  if (updateUrl) {
    const url = new URL(location.href);
    url.hash = new URLSearchParams({ recipe: id }).toString();
    history.replaceState(null, '', url);
  }
}
function closeRecipe() {
  selectedRecipeId = null;
  ui.setRecipeDetail(null);
  $('#recipeDetail').hidden = true;
  $('#recipeDirectory').hidden = false;
  if (new URLSearchParams(location.hash.slice(1)).has('recipe')) {
    const url = new URL(location.href);
    url.hash = '';
    history.replaceState(null, '', url);
  }
}
function editRecipe(id) {
  if (!document.body.classList.contains('is-editor')) return;
  if (collectionRevisions.get('recipes') !== sharedRevision)
    return withCollection('recipes', () => editRecipe(id));
  const r = (data.recipes || []).find((r) => r.id === id);
  recipePhotoSession++;
  recipePhotoProcessing = false;
  $('#recipeForm').reset();
  $('#recipeId').value = r?.id || '';
  $('#recipeHeading').textContent = r ? 'Edit Recipe' : 'Add Recipe';
  $('#recipeTitle').value = r?.title || '';
  $('#recipePerson').innerHTML =
    '<option value="">Search for a person…</option>' + recipePersonOptions();
  $('#recipePerson').value = r?.personId || '';
  setupRelationshipSearch('recipePerson', { required: true, label: 'From Whom' });
  $('#recipeCategory').innerHTML = Object.entries(recipeCategories)
    .map(([key, label]) => `<option value="${key}">${label}</option>`)
    .join('');
  $('#recipeCategory').value = r?.category || 'main';
  for (const [field, key] of [
    ['recipeServings', 'servings'],
    ['recipePrep', 'prepMinutes'],
    ['recipeCook', 'cookMinutes'],
    ['recipeIngredients', 'ingredients'],
    ['recipeInstructions', 'instructions'],
    ['recipeStory', 'story'],
  ])
    $('#' + field).value = r?.[key] ?? '';
  recipeDraftPhotos = [...(r?.photos || [])];
  renderRecipePhotos();
  $('#recipeError').textContent = '';
  $('#recipePhotoStatus').textContent = '';
  $('#recipeDelete').hidden = !r;
  $('#recipeSave').disabled = false;
  $('#recipeDialog').showModal();
  $('#recipeTitle').focus();
}
async function recipeRequest(body) {
  if (!sharedReady || savingShared) {
    notify('Wait for the current save to finish.');
    return false;
  }
  savingShared = true;
  $('#recipeForm').inert = true;
  $('#albumForm').inert = true;
  $('#milestoneForm').inert = true;
  $('#editor').inert = true;
  try {
    const result = await requestDatabase({ ...body, revision: sharedRevision });
    applyShared(result);
    $('#databaseNotice').hidden = true;
    renderRecipes();
    return true;
  } catch (error) {
    $('#recipeError').textContent = error.message;
    notify('Recipe was not saved. ' + error.message);
    return false;
  } finally {
    savingShared = false;
    $('#recipeForm').inert = false;
    $('#albumForm').inert = false;
    $('#milestoneForm').inert = false;
    $('#editor').inert = false;
  }
}
$('#recipeForm').onsubmit = async (event) => {
  event.preventDefault();
  if (recipePhotoProcessing || savingShared) return;
  const recipe = {
    id: $('#recipeId').value || crypto.randomUUID(),
    title: $('#recipeTitle').value.trim(),
    personId: $('#recipePerson').value,
    category: $('#recipeCategory').value,
    servings: $('#recipeServings').value.trim(),
    prepMinutes: $('#recipePrep').value === '' ? null : Number($('#recipePrep').value),
    cookMinutes: $('#recipeCook').value === '' ? null : Number($('#recipeCook').value),
    ingredients: $('#recipeIngredients').value.trim(),
    instructions: $('#recipeInstructions').value.trim(),
    story: $('#recipeStory').value.trim(),
    photos: [...recipeDraftPhotos],
  };
  if (await recipeRequest({ action: 'save_recipe', recipe })) {
    $('#recipeDialog').close();
    openRecipe(recipe.id);
    notify('Recipe saved');
  }
};
async function setRecipeCover(index) {
  if (recipePhotoProcessing || savingShared) return;
  const before = [...recipeDraftPhotos],
    cover = recipeDraftPhotos[index];
  recipeDraftPhotos.splice(index, 1);
  recipeDraftPhotos.unshift(cover);
  renderRecipePhotos();
  const r = (data.recipes || []).find((r) => r.id === $('#recipeId').value);
  if (!r) {
    if ($('#recipeForm').reportValidity()) $('#recipeForm').requestSubmit();
    return;
  }
  const photos = [...r.photos],
    old = photos.indexOf(cover);
  if (old >= 0) photos.splice(old, 1);
  photos.unshift(cover);
  if (await recipeRequest({ action: 'save_recipe', recipe: { ...r, photos } })) {
    recipeDraftPhotos[0] = data.recipes.find((item) => item.id === r.id).photos[0];
    $('#recipePhotoStatus').textContent = 'Cover saved';
    renderRecipePhotos();
  } else {
    recipeDraftPhotos = before;
    renderRecipePhotos();
  }
}
function renderRecipePhotos() {
  $('#recipePhotoPreview').innerHTML = recipeDraftPhotos
    .map(
      (photo, i) =>
        `<div class="milestone-photo"><button type="button" class="open-gallery-photo" data-recipe-preview="${i}" aria-label="View recipe photo ${
          i + 1
        }"><img src="${esc(photo)}" alt="Recipe photo ${
          i + 1
        }"></button><button type="button" data-recipe-remove="${i}" aria-label="Remove photo ${
          i + 1
        }">×</button>${
          i === 0
            ? '<span class="cover-badge">Cover</span>'
            : `<button type="button" class="set-photo-cover" data-recipe-cover="${i}">Set as cover</button>`
        }</div>`,
    )
    .join('');
  $('#recipePhotoPreview')
    .querySelectorAll('[data-recipe-preview]')
    .forEach(
      (b) =>
        (b.onclick = () =>
          openPhotoLightbox(
            recipeDraftPhotos,
            Number(b.dataset.recipePreview),
            $('#recipeTitle').value || 'Recipe photos',
          )),
    );
  $('#recipePhotoPreview')
    .querySelectorAll('[data-recipe-remove]')
    .forEach(
      (b) =>
        (b.onclick = () => {
          recipeDraftPhotos.splice(Number(b.dataset.recipeRemove), 1);
          renderRecipePhotos();
        }),
    );
  $('#recipePhotoPreview')
    .querySelectorAll('[data-recipe-cover]')
    .forEach((b) => (b.onclick = () => setRecipeCover(Number(b.dataset.recipeCover))));
}
async function addRecipePhotos(files) {
  if (recipePhotoProcessing || savingShared) return;
  const session = recipePhotoSession;
  recipePhotoProcessing = true;
  $('#recipeSave').disabled = true;
  $('#recipeError').textContent = '';
  try {
    for (const file of files) {
      if (!file.type.startsWith('image/') || file.size > 20000000)
        throw new Error('Choose images under 20 MB.');
      const photo = await resizePhoto(file, 1600);
      if (session !== recipePhotoSession) return;
      recipeDraftPhotos.push(photo);
      renderRecipePhotos();
      $(
        '#recipePhotoStatus',
      ).textContent = `${recipeDraftPhotos.length} photos ready. Save recipe to keep them.`;
    }
  } catch (error) {
    if (session === recipePhotoSession) $('#recipeError').textContent = error.message;
  } finally {
    if (session === recipePhotoSession) {
      recipePhotoProcessing = false;
      $('#recipeSave').disabled = false;
      $('#recipePhotos').value = '';
    }
  }
}
$('#newRecipe').onclick = () => editRecipe();
for (const id of ['recipeSearch', 'recipeCategoryFilter', 'recipePersonFilter'])
  $('#' + id).addEventListener(id === 'recipeSearch' ? 'input' : 'change', () => {
    selectedRecipeId = null;
    ui.setRecipeDetail(null);
    $('#recipeDirectory').hidden = false;
    $('#recipeDetail').hidden = true;
    renderRecipes();
  });
$('#recipeCancel').onclick = () => $('#recipeDialog').close();
$('#recipeDialog').addEventListener('close', () => recipePhotoSession++);
$('#recipeDialog').addEventListener('cancel', (e) => {
  if (savingShared) e.preventDefault();
});
$('#recipeDelete').onclick = async () => {
  if (savingShared || !confirm('Delete this recipe? Uploaded photo files will be retained.'))
    return;
  if (await recipeRequest({ action: 'delete_recipe', recipeId: $('#recipeId').value })) {
    $('#recipeDialog').close();
    closeRecipe();
    renderRecipes();
    notify('Recipe deleted');
  }
};
$('#recipePhotos').onchange = (e) => addRecipePhotos([...e.target.files]);
const recipeDrop = $('#recipePhotoDrop');
recipeDrop.addEventListener('dragover', (e) => {
  e.preventDefault();
  recipeDrop.classList.add('drag-over');
});
recipeDrop.addEventListener('dragleave', () => recipeDrop.classList.remove('drag-over'));
recipeDrop.addEventListener('drop', (e) => {
  e.preventDefault();
  recipeDrop.classList.remove('drag-over');
  addRecipePhotos([...e.dataTransfer.files]);
});
recipeDrop.addEventListener('keydown', (e) => {
  if (e.target === recipeDrop && (e.key === 'Enter' || e.key === ' ')) {
    e.preventDefault();
    $('#recipePhotos').click();
  }
});

window.addEventListener('afterprint', () => document.body.classList.remove('recipe-print'));
