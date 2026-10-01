<script setup lang="ts">
/**
 * 状态面板：当前行棋方、AI 思考状态、提子数与搜索统计。
 * 创建者：zhenghq
 */
import { computed } from 'vue'
import { BLACK, WHITE, type Player } from '@/core/board'
import type { SearchStats } from '@/core/ai'
import { useGameStore } from '@/stores/game'

const store = useGameStore()

const props = defineProps<{
  stats: SearchStats | null
}>()

const state = computed(() => store.state)

/** 某方的显示名。 */
function nameOf(player: Player): string {
  const isHuman = store.isHuman(player)
  if (store.preferences.mode === 'pvp') return player === BLACK ? '黑棋' : '白棋'
  return player === store.humanColor ? '你' : 'AI'
}

const blackLabel = computed(() => nameOf(BLACK))
const whiteLabel = computed(() => nameOf(WHITE))

/** 胜负文案。 */
const resultText = computed(() => {
  if (state.value.status !== 'scored') return ''
  const winner = state.value.winner
  if (winner === 'D') return '和棋'
  const side = winner === BLACK ? '黑棋' : '白棋'
  const owner = winner === store.humanColor && store.preferences.mode === 'ai' ? '你' : side
  return `${owner}胜`
})
</script>

<template>
  <section class="status" :class="{ 'status--over': state.status === 'scored' }">
    <header class="status__header">
      <span class="status__turn" :class="state.currentPlayer === BLACK ? 'is-black' : 'is-white'" />
      <div class="status__text">
        <p class="status__title">
          <template v-if="state.status === 'scored'">{{ resultText }}</template>
          <template v-else-if="store.thinking">AI 思考中…</template>
          <template v-else>轮到{{ state.currentPlayer === BLACK ? blackLabel : whiteLabel }}落子</template>
        </p>
        <p class="status__subtitle">
          {{ state.size }} 路棋盘 · 贴目 {{ state.komi }}
          <template v-if="state.moves.length">· 第 {{ state.moves.length }} 手</template>
        </p>
      </div>
      <span v-if="store.thinking" class="status__spinner" aria-hidden="true" />
    </header>

    <dl class="status__stats">
      <div class="status__stat">
        <dt>{{ blackLabel }}提子</dt>
        <dd>{{ state.captures.black }}</dd>
      </div>
      <div class="status__stat">
        <dt>{{ whiteLabel }}提子</dt>
        <dd>{{ state.captures.white }}</dd>
      </div>
      <div class="status__stat">
        <dt>AI 深度</dt>
        <dd>{{ props.stats?.depth ?? '—' }}</dd>
      </div>
      <div class="status__stat">
        <dt>搜索节点</dt>
        <dd>{{ props.stats ? props.stats.nodes.toLocaleString('zh-CN') : '—' }}</dd>
      </div>
    </dl>

    <p v-if="state.status === 'scored' && state.score" class="status__score">
      黑 {{ state.score.black.toFixed(1) }} : {{ state.score.white.toFixed(1) }} 白
      <span v-if="state.score.neutral">（中性点 {{ state.score.neutral }}）</span>
    </p>
  </section>
</template>

<style scoped>
.status {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.status--over {
  border-color: var(--accent);
}

.status__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status__turn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex: none;
  box-shadow: var(--shadow-sm);
}

.status__turn.is-black {
  background: radial-gradient(circle at 32% 30%, var(--stone-black-a), var(--stone-black-b));
}

.status__turn.is-white {
  background: radial-gradient(circle at 32% 30%, var(--stone-white-a), var(--stone-white-b));
  border: 1px solid var(--stone-white-edge);
}

.status__text {
  flex: 1;
  min-width: 0;
}

.status__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.status__subtitle {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.status__spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--accent-soft);
  border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.status__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.status__stat {
  padding: 9px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
}

.status__stat dt {
  font-size: 11px;
  color: var(--text-tertiary);
}

.status__stat dd {
  margin: 4px 0 0;
  font-size: 16px;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.status__score {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  text-align: center;
}
</style>
