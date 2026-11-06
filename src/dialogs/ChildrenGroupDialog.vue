<template>
  <dialog id="childrenGroupDialog" aria-labelledby="childrenGroupTitle">
    <form id="childrenGroupForm">
      <h2 id="childrenGroupTitle">Set Children</h2>
      <p>
        Choose a parent, then select their children. Existing children are included. Saving adds
        parent connections for everyone selected.
      </p>
      <label for="childrenGroupParent">Parent</label>
      <select id="childrenGroupParent"></select>
      <div id="childrenGroupTags"></div>
      <label for="childrenGroupSearch">Find Children</label
      ><input
        id="childrenGroupSearch"
        type="search"
        placeholder="Type a name…"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="false"
        aria-controls="childrenGroupMatches"
      />
      <div id="childrenGroupMatches" role="listbox" hidden></div>
      <p id="childrenGroupSummary" aria-live="polite"></p>
      <p id="childrenGroupError" role="alert"></p>
      <p class="hint">
        Removing a name here only excludes them from this update; it does not delete saved
        relationships. Other parents and relatives are not added automatically.
      </p>
      <div class="form-actions">
        <button id="saveChildrenGroup" type="submit" class="primary">Save Children</button
        ><button id="cancelChildrenGroup" type="button">Cancel</button>
      </div>
    </form>
  </dialog>
</template>
