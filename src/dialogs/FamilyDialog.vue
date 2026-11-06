<template>
  <dialog id="familyDialog" aria-labelledby="familyTitle">
    <form id="familyForm">
      <p class="eyebrow">ONE CONNECTION AT A TIME</p>
      <h2 id="familyTitle">Add Family</h2>
      <p id="familyContext"></p>
      <label
        >New person’s name<input id="familyName" placeholder="Enter their name" maxlength="120"
      /></label>
      <div class="or-divider">or</div>
      <label>Someone already in your directory<select id="existingFamily"></select></label>
      <p class="hint">
        This connection will appear for both people automatically. Photos and other details can be
        added later.
      </p>
      <p id="familyError" role="alert"></p>
      <div class="form-actions">
        <button class="primary" type="submit">Add to family</button
        ><button id="familyCancel" type="button">Cancel</button>
      </div>
    </form>
  </dialog>
</template>
