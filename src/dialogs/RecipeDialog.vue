<template>
  <dialog id="recipeDialog" aria-labelledby="recipeHeading">
    <form id="recipeForm">
      <h2 id="recipeHeading">Add Recipe</h2>
      <input id="recipeId" type="hidden" />
      <section class="recipe-edit-section">
        <h3>The Recipe</h3>
        <label>Name<input id="recipeTitle" required maxlength="200" /></label>
        <div class="recipe-field-row">
          <label>From Whom<select id="recipePerson" required></select></label
          ><label>Category<select id="recipeCategory"></select></label>
        </div>
      </section>
      <section class="recipe-edit-section">
        <h3>Cooking Instructions</h3>
        <label
          >Ingredients<textarea
            id="recipeIngredients"
            required
            rows="7"
            maxlength="20000"
            placeholder="One ingredient per line, including quantities"
          ></textarea></label
        ><label
          >Instructions<textarea
            id="recipeInstructions"
            required
            rows="8"
            maxlength="50000"
            placeholder="One step per line"
          ></textarea>
        </label>
      </section>
      <section class="recipe-edit-section">
        <h3>Family Memories</h3>
        <label
          >Story or notes<textarea
            id="recipeStory"
            rows="4"
            maxlength="20000"
            placeholder="Who taught you this recipe? When does your family make it?"
          ></textarea>
        </label>
        <div
          id="recipePhotoDrop"
          class="photo-dropzone"
          role="group"
          tabindex="0"
          aria-label="Recipe photos and handwritten cards drop area"
        >
          <p>Drop photos or scanned recipe cards here</p>
          <label
            >or choose images<input id="recipePhotos" type="file" accept="image/*" multiple
          /></label>
        </div>
        <div id="recipePhotoPreview"></div>
        <p id="recipePhotoStatus" class="hint" role="status"></p>
        <div class="recipe-field-row recipe-times">
          <label
            >Servings<input
              id="recipeServings"
              maxlength="100"
              placeholder="e.g. 6 people" /></label
          ><label
            >Prep time (minutes)<input
              id="recipePrep"
              type="number"
              min="0"
              max="100000"
              step="1" /></label
          ><label
            >Cooking time (minutes)<input
              id="recipeCook"
              type="number"
              min="0"
              max="100000"
              step="1"
          /></label>
        </div>
      </section>
      <p id="recipeError" role="alert"></p>
      <div class="form-actions">
        <button id="recipeSave" type="submit" class="primary">Save recipe</button
        ><button id="recipeCancel" type="button">Cancel</button
        ><button id="recipeDelete" type="button">Delete recipe</button>
      </div>
    </form>
  </dialog>
</template>
