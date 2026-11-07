<template>
  <Teleport to="body">
    <div v-if="modelValue && images.length" class="iv-mask" @click="close">
      <img :src="images[current]" class="iv-img" alt="放大查看图片" />
      <button type="button" class="iv-btn iv-prev" :class="{ disabled: current === 0 }" @click.stop="prev">‹</button>
      <button type="button" class="iv-btn iv-next" :class="{ disabled: current === images.length - 1 }" @click.stop="next">›</button>
      <div class="iv-counter">{{ current + 1 }} / {{ images.length }}</div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  images: { type: Array, default: () => [] },
  initialIndex: { type: Number, default: 0 }
})
const emit = defineEmits(['update:modelValue'])

const current = ref(0)

function onKey(e) {
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}

watch(() => props.modelValue, (open) => {
  if (open) {
    current.value = Math.min(props.initialIndex || 0, props.images.length - 1)
    window.addEventListener('keydown', onKey)
  } else {
    window.removeEventListener('keydown', onKey)
  }
})
onUnmounted(() => window.removeEventListener('keydown', onKey))

function prev() {
  if (current.value > 0) current.value -= 1
}
function next() {
  if (current.value < props.images.length - 1) current.value += 1
}
function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.iv-mask { position: fixed; inset: 0; z-index: 3000; background: rgba(0, 0, 0, 0.88); display: flex; align-items: center; justify-content: center; animation: fadeIn var(--duration-fast) ease-out both; }
.iv-img { max-width: 88vw; max-height: 84vh; object-fit: contain; border-radius: 6px; animation: scaleIn var(--duration-normal) var(--ease-out) both; }
.iv-btn { position: absolute; top: 50%; transform: translateY(-50%); width: 52px; height: 52px; border: none; border-radius: 50%; background: rgba(255, 255, 255, 0.18); color: #fff; font-size: 30px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; user-select: none; }
.iv-btn:hover { background: rgba(255, 255, 255, 0.35); }
.iv-btn.disabled { opacity: 0.25; cursor: not-allowed; }
.iv-prev { left: 28px; }
.iv-next { right: 28px; }
.iv-counter { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); color: #fff; font-size: 16px; letter-spacing: 1px; }
</style>