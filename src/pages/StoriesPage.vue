<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { PhArrowRight, PhBookOpen, PhX, PhPlus } from '@phosphor-icons/vue';
import { activePage, family, canEdit, useRuntime } from '../ui/runtime.js';
import { sampleStories } from '../prototypes/stories.js';
import PersonAutocomplete from '../components/PersonAutocomplete.vue';
import PersonAvatar from '../components/PersonAvatar.vue';
import SearchField from '../components/SearchField.vue';
const api=computed(useRuntime), query=ref(''), reader=ref(null), editor=ref(null), selected=ref(null), drafts=ref([]), loadError=ref('');
const title=ref(''), date=ref(''), excerpt=ref(''), author=ref(null), tagged=ref([]), body=ref(''), images=ref([]), error=ref('');
const fileInput=ref(null), returnFocus=ref(null), objectUrls=new Set();
const people=computed(()=>family.value.people || []);
const photos=computed(()=>(family.value.albums || []).flatMap(a=>a.photos || []).filter(src=>!/^data:video/i.test(src) && !/\.(mov|mp4)$/i.test(src)).slice(0,3));
const stories=computed(()=>[...drafts.value,...sampleStories(people.value,photos.value)].sort((a,b)=>b.date.localeCompare(a.date)));
const name=id=>{const person=people.value.find(p=>p.id===id);return person ? api.value?.displayName(person) || person.name : '';};
const authorName=story=>story.authorId ? name(story.authorId) : story.authorName;
const filtered=computed(()=>stories.value.filter(story=>[story.title,story.excerpt,authorName(story),...story.people.map(name)].join(' ').toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())));
const dateLabel=value=>new Date(value+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
watch(activePage,async page=>{
  if(page!=='stories') {reader.value?.close();editor.value?.close();return;}
  try {await api.value?.loadFamilyAlbums?.();} catch {loadError.value='Album images could not load. You can still read the stories.';}
});
async function open(story) {returnFocus.value=document.activeElement;selected.value=story;reader.value.showModal();await nextTick();reader.value.scrollTop=0;}
function closeReader(){reader.value.close();returnFocus.value?.focus?.({preventScroll:true});}
function newStory(){
  if(!canEdit.value)return;
  title.value='';date.value=new Date().toLocaleDateString('en-CA');excerpt.value='';author.value=null;tagged.value=[];body.value='';images.value=[];error.value='';if(fileInput.value)fileInput.value.value='';editor.value.showModal();
}
function addImages(event){
  for(const file of event.target.files || []) {
    if(!['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(file.type)) {error.value='Choose a JPG, PNG, WebP, GIF, or AVIF image.';continue;}
    const src=URL.createObjectURL(file);objectUrls.add(src);images.value.push({type:'image',src,caption:''});
  }
  event.target.value='';
}
function saveDraft(){
  if(!canEdit.value)return;
  if(!title.value.trim() || !date.value || !author.value || !body.value.trim()) {error.value='Add a title, date, author, and story.';return;}
  const paragraphs=body.value.trim().split(/\n\s*\n/).map(text=>({type:'paragraph',text:text.trim()}));
  const blocks=[];paragraphs.forEach((paragraph,index)=>{blocks.push(paragraph);if(images.value[index])blocks.push({...images.value[index]});});
  blocks.push(...images.value.slice(paragraphs.length).map(image=>({...image})));
  const story={id:'draft-'+Date.now(),title:title.value.trim(),date:date.value,excerpt:excerpt.value.trim() || paragraphs[0].text.slice(0,180),authorId:author.value.id,people:tagged.value.map(p=>p.id),blocks,sample:false};
  drafts.value=[story,...drafts.value];editor.value.close();open(story);
}
onBeforeUnmount(()=>{for(const url of objectUrls)URL.revokeObjectURL(url);});
</script>
<template>
  <main id="storiesPage" hidden>
    <div class="stories-heading"><div><p class="eyebrow">THE MEMORIES BEHIND THE NAMES</p><h1>Family Stories.</h1><p>Every family has stories worth keeping. Give them a place to live.</p></div><button v-if="canEdit" type="button" class="primary" @click="newStory"><PhPlus :size="16" aria-hidden="true" /> Try a Story</button></div>
    <p class="stories-prototype-note"><PhBookOpen :size="18" aria-hidden="true" /> Prototype · Sample stories and temporary drafts. Nothing is saved to the database. Drafts reset on refresh.</p>
    <SearchField class="stories-search"><input v-model="query" type="search" placeholder="Search stories, authors, or people…" aria-label="Search stories" /></SearchField>
    <p v-if="loadError" class="hint" role="status">{{ loadError }}</p>
    <div class="stories-list">
      <article v-for="story in filtered" :key="story.id" class="story-card">
        <div><time :datetime="story.date">{{ dateLabel(story.date) }}</time><span class="story-sample-label">{{ story.sample ? 'Sample Story' : 'Temporary Draft' }}</span></div>
        <h2><button type="button" @click="open(story)">{{ story.title }}<PhArrowRight :size="20" aria-hidden="true" /></button></h2>
        <p>{{ story.excerpt }}</p><span class="story-byline">By {{ authorName(story) }}</span>
      </article>
      <p v-if="!filtered.length">No stories match your search.</p>
    </div>
  </main>
  <dialog ref="reader" id="storyReader" aria-labelledby="storyReaderTitle" class="story-reader" @click="$event.target===reader && closeReader()">
    <button type="button" class="story-close" aria-label="Close story" @click="closeReader"><PhX :size="22" aria-hidden="true" /></button>
    <article v-if="selected" class="story-article"><header class="story-article-heading"><p class="eyebrow">{{ selected.sample ? 'SAMPLE STORY' : 'TEMPORARY DRAFT' }}</p><h1 id="storyReaderTitle">{{ selected.title }}</h1><div class="story-meta"><span>By {{ authorName(selected) }}</span><time :datetime="selected.date">{{ dateLabel(selected.date) }}</time></div><p class="story-deck">{{ selected.excerpt }}</p></header>
      <div class="story-prose"><template v-for="(block,index) in selected.blocks" :key="index"><p v-if="block.type==='paragraph'">{{ block.text }}</p><figure v-else><img :src="block.src" alt="Story photograph" loading="lazy" /><figcaption v-if="block.caption">{{ block.caption }}</figcaption></figure></template></div>
      <section v-if="selected.people.length" class="story-people"><h2>People in This Story</h2><div><span v-for="id in selected.people" :key="id"><PersonAvatar v-if="people.find(p=>p.id===id)" :person="people.find(p=>p.id===id)" />{{ name(id) }}</span></div></section>
    </article>
  </dialog>
  <dialog ref="editor" id="storyPrototypeEditor" class="story-editor" aria-labelledby="storyEditorTitle">
    <button type="button" class="story-close" aria-label="Close story editor" @click="editor.close()"><PhX :size="22" /></button>
    <form v-if="api" @submit.prevent="saveDraft"><h2 id="storyEditorTitle">Try a Story</h2><p class="hint">Prototype only. Your draft stays on this page until you refresh.</p>
      <label>Title *<input v-model="title" required /></label><label>Date *<input v-model="date" type="date" required /></label>
      <label>Excerpt<textarea v-model="excerpt" rows="2" placeholder="A short introduction for the story list…"></textarea></label>
      <fieldset><legend>Author *</legend><p v-if="author" class="story-author-selection">{{ name(author.id) }}<button type="button" aria-label="Change author" @click="author=null">Change</button></p><PersonAutocomplete v-else input-id="storyAuthorSearch" list-id="storyAuthorMatches" label="Find the author" :options="()=>people" :display="api.displayName" :matches="api.personMatchesQuery" @select="p=>author=p" /></fieldset>
      <fieldset><legend>People in This Story</legend><div class="story-tag-list"><button v-for="p in tagged" :key="p.id" type="button" :aria-label="'Remove '+name(p.id)" @click="tagged=tagged.filter(item=>item.id!==p.id)">{{ name(p.id) }} ×</button></div><PersonAutocomplete input-id="storyPeopleSearch" list-id="storyPeopleMatches" label="Tag people in this story" :options="()=>people.filter(p=>!tagged.some(item=>item.id===p.id))" :display="api.displayName" :matches="api.personMatchesQuery" clear-on-select :validate-selection="false" @select="p=>tagged.push(p)" /></fieldset>
      <label>Story *<textarea v-model="body" required rows="9" placeholder="Write your story. Leave a blank line between paragraphs…"></textarea></label>
      <label>Images<input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple @change="addImages" /></label><p class="hint">Images appear between paragraphs, in the order selected.</p>
      <div v-for="(image,index) in images" :key="image.src" class="story-image-draft"><img :src="image.src" alt="Selected story image" /><label>Caption<input v-model="image.caption" /></label><button type="button" :aria-label="'Remove image '+(index+1)" @click="images.splice(index,1)"><PhX :size="18" /></button></div>
      <p v-if="error" role="alert">{{ error }}</p><div class="story-editor-actions"><button type="submit" class="primary">Preview Draft</button><button type="button" @click="editor.close()">Cancel</button></div>
    </form>
  </dialog>
</template>
