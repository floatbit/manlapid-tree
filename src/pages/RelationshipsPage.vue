<template>
  <main id="relationships" hidden aria-labelledby="relationshipTitle">
    <section class="finder-page">
      <form id="relationshipForm">
        <p class="eyebrow">FOLLOW THE FAMILY CONNECTION</p>
        <h1 id="relationshipTitle">How Are They Related?</h1>
        <p>Choose two people to find their relationship and connecting path.</p>
        <label>First person<select id="relationshipFrom" required></select></label
        ><label>Second person<select id="relationshipTo" required></select></label>
        <div class="form-actions">
          <button type="submit" class="primary">Relationship</button>
        </div>
        <div id="relationshipResult" aria-live="polite"></div>
      </form>
    </section>
  </main>
</template>
