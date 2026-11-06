<script setup lang="js">
import { computed } from 'vue';
import { family, recipeDetail, useRuntime } from '../ui/runtime.js';
const api=computed(useRuntime), r=recipeDetail;
const owner=computed(()=>family.value.people.find((p)=>p.id === r.value?.personId));
const lines=(value)=>value.split(/\n+/).filter((line)=>line.trim());
function print() {document.body.classList.add('recipe-print');window.print();}
</script>
<template>
  <article id="recipeDetail" hidden>
    <template v-if="r">
      <div class="recipe-detail-actions">
        <button id="recipeBack" type="button" @click="api.closeRecipe">← All recipes</button>
        <div>
          <button id="recipePrint" type="button" @click="print">Print recipe</button
          ><button id="recipeShare" type="button" @click="api.copyDirectLink({ recipe: r.id })">
            Copy link</button
          ><button id="recipeEdit" type="button" class="primary" @click="api.editRecipe(r.id)">
            Edit Recipe
          </button>
        </div>
      </div>
      <p class="eyebrow">{{ api.recipeCategories[r.category] || 'Family recipe' }}</p>
      <h1>{{ r.title }}</h1>
      <p v-if="owner" class="recipe-attribution">From {{ api.displayName(owner) }}</p>
      <p class="recipe-facts">
        {{
          [
            r.servings ? 'Servings: ' + r.servings : '',
            r.prepMinutes !== null ? 'Prep: ' + r.prepMinutes + ' minutes' : '',
            r.cookMinutes !== null ? 'Cook: ' + r.cookMinutes + ' minutes' : '',
          ]
            .filter(Boolean)
            .join(' · ')
        }}
      </p>
      <button
        v-if="r.photos.length"
        type="button"
        class="recipe-hero"
        @click="api.openPhotoLightbox(r.photos, 0, r.title)"
      >
        <img :src="r.photos[0]" :alt="r.title" />
      </button>
      <div class="recipe-cooking-columns">
        <section>
          <h2>Ingredients</h2>
          <ul>
            <li v-for="(line, i) in lines(r.ingredients)" :key="i">{{ line }}</li>
          </ul>
        </section>
        <section>
          <h2>Instructions</h2>
          <ol>
            <li v-for="(line, i) in lines(r.instructions)" :key="i">{{ line }}</li>
          </ol>
        </section>
      </div>
      <section v-if="r.story" class="recipe-family-story">
        <h2>The Family Story</h2>
        <p>{{ r.story }}</p>
      </section>
      <section v-if="r.photos.length > 1" class="recipe-more-photos">
        <h2>Photos and Recipe Cards</h2>
        <div>
          <button
            v-for="(photo, i) in r.photos.slice(1)"
            :key="photo"
            type="button"
            @click="api.openPhotoLightbox(r.photos, i + 1, r.title)"
          >
            <img :src="photo" :alt="r.title + ' — photo ' + (i + 2)" loading="lazy" />
          </button>
        </div>
      </section>
    </template>
  </article>
</template>
