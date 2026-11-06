<script setup lang="js">
import { LockKeyhole, LockKeyholeOpen, Scan, Eraser, Network } from '@lucide/vue';
</script>
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
          <button
            id="backToStart"
            title="Back to starting person"
            aria-label="Back to starting person"
            hidden
          >
            ↩ Start
          </button>
          <button id="showEntireTree" title="Show entire tree" aria-label="Show entire tree">
            <Network :size="18" aria-hidden="true" />
            <span>Tree</span>
          </button>
          <button
            id="openRelationshipFinder"
            type="button"
            title="Find a relationship between two people"
            aria-label="Relationship"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <circle cx="6" cy="12" r="4" />
              <path d="M10 12h4" />
              <circle cx="18" cy="12" r="4" />
            </svg>
            <span>Relationship</span>
          </button>
          <button id="reset" title="Clear tree" aria-label="Clear tree" hidden>
            <Eraser :size="18" aria-hidden="true" />
            <span>Clear</span>
          </button>
        </div>
        <div id="graphTools" hidden>
          <input
            id="zoomSlider"
            type="range"
            min="20"
            max="200"
            step="1"
            value="100"
            aria-label="Tree zoom"
            aria-valuetext="100%"
          />
          <span id="zoomLevel">100%</span>
          <button
            id="lockZoom"
            type="button"
            aria-label="Lock zoom level"
            title="Lock zoom level"
            aria-pressed="false"
          >
            <LockKeyholeOpen class="zoom-unlocked-icon" :size="18" aria-hidden="true" />
            <LockKeyhole class="zoom-locked-icon" :size="18" aria-hidden="true" />
            <span id="lockZoomLabel">Lock</span>
          </button>
          <button
            id="fitGraph"
            type="button"
            aria-label="Fit tree to view"
            title="Fit tree to view"
          >
            <Scan :size="18" aria-hidden="true" />
            <span>Fit</span>
          </button>
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
