<script setup lang="js">
import AppHeader from './components/AppHeader.vue';
import ReportsPage from './pages/ReportsPage.vue';
import TreePage from './pages/TreePage.vue';
import MapPage from './pages/MapPage.vue';
import RecipesPage from './pages/RecipesPage.vue';
import AlbumsPage from './pages/AlbumsPage.vue';
import TimelinePage from './pages/TimelinePage.vue';
import PeoplePage from './pages/PeoplePage.vue';
import BulkLocationDialog from './dialogs/BulkLocationDialog.vue';
import SiblingGroupDialog from './dialogs/SiblingGroupDialog.vue';
import ChildrenGroupDialog from './dialogs/ChildrenGroupDialog.vue';
import FamilyDialog from './dialogs/FamilyDialog.vue';
import RelationshipsPage from './pages/RelationshipsPage.vue';
import RecipeDialog from './dialogs/RecipeDialog.vue';
import AlbumDialog from './dialogs/AlbumDialog.vue';
import MilestoneDialog from './dialogs/MilestoneDialog.vue';
import PhotoLightbox from './dialogs/PhotoLightbox.vue';
import SystemNotices from './components/SystemNotices.vue';
</script>
<template>
  <SystemNotices />
  <AppHeader />
  <ReportsPage />
  <TreePage />
  <MapPage />
  <RecipesPage />
  <AlbumsPage />
  <TimelinePage />
  <PeoplePage />
  <BulkLocationDialog />
  <SiblingGroupDialog />
  <ChildrenGroupDialog />
  <FamilyDialog />
  <RelationshipsPage />
  <RecipeDialog />
  <AlbumDialog />
  <MilestoneDialog />
  <PhotoLightbox />
</template>
