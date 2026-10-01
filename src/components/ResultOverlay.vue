<script setup lang="ts">
/**
 * 终局结果弹窗：全屏遮罩展示胜负、比分、手数与操作按钮。
 * 创建者：zhenghq
 */
import { computed, onBeforeUnmount, watch } from 'vue'
import { summarizeResult } from '@/core/result'
import { useGameStore } from '@/stores/game'

const store = useGameStore()

const summary = computed(() =>
  summarizeResult(store.state, {
    mode: store.preferences.mode,
    humanColor: store.humanColor,
  }),
)

const visible = computed(() => Boolean(summary.value) && store.resultOpen)

/** 情绪对应的图标。 */
const icon = computed(() => {
  if (!summary.value) return ''
  if (summary.value.tone === 'win') return '🏆'
  if (summary.value.tone === 'lose') return '💪'
  return '🤝'
})

/** 处理键盘事件：Esc 关闭弹窗。 */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') store.hideResult()
}

watch(visible, (open) => {
  if (typeof window === 'undefined') return
  if (open) window.addEventListener('keydown', onKeydown)
  else window.removeEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="pop">
      <div
        v-if="visible && summary"
        class="result"
        :class="`result--${summary.tone}`"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
      >
        <div class="result__backdrop" @click="store.hideResult()" />
        <div class="result__card">
          <span class="result__icon" aria-hidden="true">{{ icon }}</span>
          <p class="result__eyebrow">{{ summary.eyebrow }}</p>
          <h2 id="result-title" class="result__title">{{ summary.title }}</h2>
          <p class="result__reason">{{ summary.reason }}</p>

          <dl class="result__stats">
            <div
              v-for="item in summary.stats"
              :key="item.label"
              class="result__stat"
              :class="{ 'is-highlight': item.highlight }"
            >
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>

          <p class="result__footnote">{{ summary.footnote }}</p>

          <div class="result__actions">
            <button class="result__button result__button--primary" type="button" @click="store.newGame()">
              再来一局
            </button>
            <button class="result__button" type="button" @click="store.hideResult()">查看棋盘</button>
            <button class="result__button" type="button" :disabled="!store.canUndo" @click="store.undo()">
              悔棋复盘
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.result {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 60;
}

.result__backdrop {
  position: absolute;
  inset: 0;
  background: var(--bg-overlay);
  backdrop-filter: blur(4px);
}

.result__card {
  position: relative;
  width: min(400px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: 26px 24px 22px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-default);
  border-top: 4px solid var(--result-accent);
  background: var(--bg-surface-raised);
  box-shadow: var(--shadow-lg);
  text-align: center;
}

.result--win {
  --result-accent: var(--success);
  --result-accent-soft: var(--success-soft);
}

.result--lose {
  --result-accent: var(--danger);
  --result-accent-soft: var(--danger-soft);
}

.result--draw {
  --result-accent: var(--accent);
  --result-accent-soft: var(--accent-soft);
}

.result__icon {
  display: block;
  font-size: 40px;
  line-height: 1;
}

.result__eyebrow {
  margin-top: 12px;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: var(--text-tertiary);
}

.result__title {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 700;
  color: var(--result-accent);
}

.result__reason {
  margin-top: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.result__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 20px;
}

.result__stat {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: var(--bg-secondary);
}

.result__stat dt {
  font-size: 11px;
  color: var(--text-tertiary);
}

.result__stat dd {
  margin: 4px 0 0;
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.result__stat.is-highlight {
  border-color: var(--result-accent);
  background: var(--result-accent-soft);
}

.result__stat.is-highlight dd {
  color: var(--result-accent);
}

.result__footnote {
  margin-top: 14px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.result__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 20px;
}

.result__button {
  padding: 11px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast), opacity var(--transition-fast);
}

.result__button:hover:not(:disabled) {
  background: var(--bg-hover);
}

.result__button:disabled {
  opacity: 0.45;
}

.result__button--primary {
  border-color: transparent;
  background: var(--accent);
  color: var(--accent-contrast);
}

.result__button--primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.pop-enter-active {
  transition: opacity var(--transition-base);
}

.pop-leave-active {
  transition: opacity var(--transition-base);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
}

.pop-enter-active .result__card {
  animation: result-rise 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes result-rise {
  from {
    transform: translateY(14px) scale(0.96);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}

@media (max-width: 420px) {
  .result__title {
    font-size: 23px;
  }
}
</style>
