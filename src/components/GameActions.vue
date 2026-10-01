<script setup lang="ts">
/**
 * 对局操作栏：新局、悔棋、停一手、认输。
 * 创建者：zhenghq
 */
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

const store = useGameStore()
const state = computed(() => store.state)

const canPlay = computed(() => state.value.status === 'playing' && !store.thinking)

/** 认输：人机模式由人类认输，双人模式由当前行棋方认输。 */
function resign(): void {
  const player = store.preferences.mode === 'ai' ? store.humanColor : state.value.currentPlayer
  store.resign(player)
}
</script>

<template>
  <div class="actions">
    <button class="actions__button actions__button--primary" type="button" @click="store.newGame()">新对局</button>
    <button class="actions__button" type="button" :disabled="!store.canUndo" @click="store.undo()">悔棋</button>
    <button class="actions__button" type="button" :disabled="!canPlay" @click="store.pass()">停一手</button>
    <button class="actions__button actions__button--danger" type="button" :disabled="!canPlay" @click="resign">认输</button>
  </div>
</template>

<style scoped>
.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.actions__button {
  padding: 11px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast), opacity var(--transition-fast);
}

.actions__button:hover:not(:disabled) {
  background: var(--bg-hover);
}

.actions__button:disabled {
  opacity: 0.45;
}

.actions__button--primary {
  border-color: transparent;
  background: var(--accent);
  color: var(--accent-contrast);
}

.actions__button--primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.actions__button--danger {
  color: var(--danger);
  border-color: var(--danger-soft);
}

.actions__button--danger:hover:not(:disabled) {
  background: var(--danger-soft);
}
</style>
