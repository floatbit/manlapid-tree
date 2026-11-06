<script setup lang="js">
import { computed } from 'vue';
import { family, recipeView, useRuntime } from '../ui/runtime.js';
const api=computed(useRuntime);
function attribution(r) { const p=family.value.people.find((p)=>p.id === r.personId);return p ? api.value.displayName(p) : ''; }
function facts(r) { return [r.servings ? 'Serves '+r.servings : '', r.prepMinutes !== null ? 'Prep '+r.prepMinutes+' min' : '',r.cookMinutes !== null ? 'Cook '+r.cookMinutes+' min' : ''].filter(Boolean).join(' · '); }
</script>
<template>
  <div id="recipesGrid">
    <button
      v-for="recipe in recipeView"
      :key="recipe.id"
      type="button"
      class="recipe-card"
      @click="api.openRecipe(recipe.id)"
    >
      <img
        v-if="recipe.photos.length"
        :src="recipe.photos[0]"
        :alt="recipe.title"
        loading="lazy"
      /><span v-else class="recipe-placeholder" aria-hidden="true">♧</span
      ><span class="recipe-card-body"
        ><small>{{ api.recipeCategories[recipe.category] || 'Other' }}</small
        ><strong>{{ recipe.title }}</strong
        ><span v-if="attribution(recipe)">From {{ attribution(recipe) }}</span
        ><span>{{ facts(recipe) }}</span></span
      >
    </button>
    <div v-if="!recipeView.length" class="recipes-empty">
      <h2>Every Family Has a Dish Worth Keeping.</h2>
      <p>Add a recipe, its story, and a photo or handwritten card.</p>
    </div>
  </div>
</template>
