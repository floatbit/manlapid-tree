<script setup>
import { computed } from 'vue';
import {
  PhBabyCarriage, PhFlame, PhHeart, PhCake, PhEgg, PhFlower, PhFlag,
  PhUser, PhBriefcase, PhGhost, PhAcorn, PhStarOfDavid, PhTreeEvergreen,
  PhChampagne, PhConfetti, PhHouse, PhGraduationCap, PhUsersThree, PhCircle,
} from '@phosphor-icons/vue';
const props = defineProps({ type: String, size: { type: Number, default: 16 } });
const icons = {
  birth: PhBabyCarriage, death: PhFlame, remembrance: PhFlame,
  new_year: PhChampagne, valentines_day: PhHeart, easter: PhEgg,
  mothers_day: PhFlower, memorial_day: PhFlag, fathers_day: PhUser,
  independence_day: PhFlag, labor_day: PhBriefcase, halloween: PhGhost,
  thanksgiving: PhAcorn, hanukkah: PhStarOfDavid, christmas: PhTreeEvergreen,
  new_years_eve: PhChampagne, holiday: PhConfetti, birthday_party: PhCake,
  marriage: PhHeart, move: PhHouse, graduation: PhGraduationCap,
  reunion: PhUsersThree, other: PhCircle,
};
const icon = computed(() => icons[props.type] || PhCircle);
</script>
<template>
  <component :is="icon" :size="size" weight="regular" aria-hidden="true" class="timeline-event-icon" :class="'event-icon-' + (type || 'other')" />
</template>
