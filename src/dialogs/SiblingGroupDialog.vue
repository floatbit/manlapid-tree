<template>
  <dialog id="siblingGroupDialog" aria-labelledby="siblingGroupTitle">
    <form id="siblingGroupForm">
      <h2 id="siblingGroupTitle">Group Siblings</h2>
      <p id="siblingGroupDescription">
        Select the people who are siblings. Everyone selected will be connected to everyone else in
        the group. No starting person is required.
      </p>
      <div id="siblingGroupTags"></div>
      <label for="siblingGroupSearch">Find people</label
      ><input
        id="siblingGroupSearch"
        type="search"
        placeholder="Type a name…"
        autocomplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="false"
        aria-controls="siblingGroupMatches"
      />
      <div id="siblingGroupMatches" role="listbox" hidden></div>
      <p id="siblingGroupSummary" aria-live="polite"></p>
      <p id="siblingGroupError" role="alert"></p>
      <p class="hint">
        Removing a name here only excludes them from this update; it does not delete saved
        relationships. Parents and other relatives are not added automatically.
      </p>
      <div class="form-actions">
        <button id="saveSiblingGroup" type="submit" class="primary">Save sibling group</button
        ><button id="cancelSiblingGroup" type="button">Cancel</button>
      </div>
    </form>
  </dialog>
</template>
