<script setup lang="ts">
/**
 * 终局结果浮层：展示胜负、比分与操作按钮。
 * 创建者：zhenghq
 */
import { computed } from 'vue'
import { BLACK } from '@/core/board'
import { useGameStore } from '@/stores/game'

const store = useGameStore()
const state = computed(() => store.state)
const visible = computed(() => state.value.status === 'scored')

const title = computed(() => {
  if (!visible.value) return ''
  if (state.value.endReason === 'resign') {
    return state.value.winner === store.humanColor ? '你赢了！' : 'AI 获胜'
  }
  if (state.value.winner === 'D') return '和棋'
  const winnerName = state.value.winner === BLACK ? '黑棋' : '白棋'
  if (store.preferences.mode === 'ai') {
    return state.value.winner === store.humanColor ? `你赢了！（${winnerName}）` : `AI 获胜（${winnerName}）`
  }
  return `${winnerName}胜`
})

const subtitle = computed(() => {
  if (state.value.endReason === 'resign') return '对方中盘认输'
  const score = state.value.score
  if (!score) return ''
  return `黑 ${score.black.toFixed(1)} : ${score.white.toFixed(1)} 白`
})
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="overlay" role="dialog" aria-modal="true">
      <div class="overlay__card">
        <p class="overlay__eyebrow">对局结束</p>
        <h2 class="overlay__title">{{ title }}</h2>
        <p v-if="subtitle" class="overlay__subtitle">{{ subtitle }}</p>
        <div class="overlay__actions">
          <button class="overlay__button overlay__button--primary" type="button" @click="store.newGame()">
            再来一局
          </button>
          <button class="overlay__button" type="button" @click="store.undo()">悔棋复盘</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg-overlay);
  backdrop-filter: blur(3px);
  z-index: 20;
}

.overlay__card {
  width: min(320px, 100%);
  padding: 26px 22px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  background: var(--bg-surface-raised);
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.overlay__eyebrow {
  font-size: 12px;
  letter-spacing: 0.16em;
  color: var(--text-tertiary);
}

.overlay__title {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
}

.overlay__subtitle {
  margin-top: 8px;
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--text-secondary);
}

.overlay__actions {
  display: flex;
  gap: 10px;
  margin-top: 22px;
}

.overlay__button {
  flex: 1;
  padding: 11px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  transition: background-color var(--transition-fast), border-color var(--transition-fast);
}

.overlay__button:hover {
  background: var(--bg-hover);
}

.overlay__button--primary {
  border-color: transparent;
  background: var(--accent);
  color: var(--accent-contrast);
}

.overlay__button--primary:hover {
  background: var(--accent-hover);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
