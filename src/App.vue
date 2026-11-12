<script setup lang="js">
import AppHeader from './components/AppHeader.vue';
import AccessControls from './components/AccessControls.vue';
import ReportsPage from './pages/ReportsPage.vue';
import FamiliesPage from './pages/FamiliesPage.vue';
import TreePage from './pages/TreePage.vue';
import MapPage from './pages/MapPage.vue';
import RecipesPage from './pages/RecipesPage.vue';
import AlbumsPage from './pages/AlbumsPage.vue';
import StoriesPage from './pages/StoriesPage.vue';
import TimelinePage from './pages/TimelinePage.vue';
import PeoplePage from './pages/PeoplePage.vue';
import BulkLocationDialog from './dialogs/BulkLocationDialog.vue';
import SiblingGroupDialog from './dialogs/SiblingGroupDialog.vue';
import ChildrenGroupDialog from './dialogs/ChildrenGroupDialog.vue';
import FamilyDialog from './dialogs/FamilyDialog.vue';
import RelationshipDialog from './dialogs/RelationshipDialog.vue';
import RecipeDialog from './dialogs/RecipeDialog.vue';
import AlbumDialog from './dialogs/AlbumDialog.vue';
import MilestoneDialog from './dialogs/MilestoneDialog.vue';
import PhotoLightbox from './dialogs/PhotoLightbox.vue';
import SystemNotices from './components/SystemNotices.vue';
</script>
<template>
  <SystemNotices />
  <AccessControls />
  <AppHeader />
  <ReportsPage />
  <TreePage />
  <FamiliesPage />
  <MapPage />
  <RecipesPage />
  <AlbumsPage />
  <TimelinePage />
  <StoriesPage />
  <PeoplePage />
  <BulkLocationDialog />
  <SiblingGroupDialog />
  <ChildrenGroupDialog />
  <FamilyDialog />
  <RelationshipDialog />
  <RecipeDialog />
  <AlbumDialog />
  <MilestoneDialog />
  <PhotoLightbox />
</template>
