<script setup lang="js">
import RecipeGrid from '../components/RecipeGrid.vue';
import RecipeDetail from '../components/RecipeDetail.vue';
</script>
<template>
  <main id="recipesPage" hidden>
    <section id="recipeDirectory">
      <div class="recipes-heading">
        <div>
          <p class="eyebrow">PASSED DOWN WITH LOVE</p>
          <h1>Family Recipes.</h1>
          <p>Keep the dishes, handwritten notes, and stories that bring your family together.</p>
        </div>
        <button id="newRecipe" class="primary">＋ Add recipe</button>
      </div>
      <div class="recipes-filters">
        <label
          >Search recipes<input
            id="recipeSearch"
            type="search"
            placeholder="Search titles, ingredients, or memories…" /></label
        ><label>Category<select id="recipeCategoryFilter"></select></label
        ><label>From whom<select id="recipePersonFilter"></select></label>
      </div>
      <p id="recipesCount" role="status"></p>
      <RecipeGrid />
    </section>
    <RecipeDetail />
  </main>
</template>
