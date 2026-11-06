<template>
  <main id="explore">
    <div class="workspace">
      <section class="canvas" id="canvas">
        <div id="empty">
          <div class="empty-art">✳</div>
          <h2>A Family Starts with Someone.</h2>
          <p>Search for a person above to discover their connections.</p>
          <div id="emptySuggestions"></div>
          <button id="addFirst">Add person ↗</button>
        </div>
        <div id="graph">
          <div id="graphSpace">
            <div id="scene">
              <svg id="lines"></svg>
              <div id="nodes"></div>
            </div>
          </div>
        </div>
        <div id="relationshipBanner" hidden>
          <span id="relationshipSummary"></span
          ><button id="clearRelationshipPath" aria-label="Clear highlighted relationship path">
            ×
          </button>
        </div>
        <div class="tree-view-actions">
          <button id="backToStart" hidden>↩ Back to starting person</button
          ><button id="showEntireTree">Show entire tree</button
          ><button id="reset" hidden>Clear</button>
        </div>
        <div id="graphTools" hidden>
          <button id="zoomOut" aria-label="Zoom out">−</button><span id="zoomLevel">100%</span
          ><button id="zoomIn" aria-label="Zoom in">＋</button><button id="fitGraph">Fit</button>
        </div>
        <div class="canvas-bottom"><span id="count">0 people in view</span></div>
      </section>
      <aside id="details" aria-label="Selected person details">
        <p class="eyebrow">A CLOSER LOOK</p>
        <div class="aside-empty">
          <span>♡</span>
          <h2>Meet Your People.</h2>
          <p>Select a person to see their story and family connections.</p>
        </div>
      </aside>
    </div>
  </main>
</template>
