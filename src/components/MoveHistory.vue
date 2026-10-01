<script setup lang="ts">
/**
 * 棋谱列表：展示手数、落子方与坐标，并自动滚动到最新一手。
 * 创建者：zhenghq
 */
import { computed, nextTick, ref, watch } from 'vue'
import { BLACK, formatPoint } from '@/core/game'
import { useGameStore } from '@/stores/game'

const store = useGameStore()
const listRef = ref<HTMLElement | null>(null)

const moves = computed(() => store.state.moves)

watch(
  () => moves.value.length,
  async () => {
    await nextTick()
    const list = listRef.value
    if (list) list.scrollTop = list.scrollHeight
  },
)
</script>

<template>
  <section class="history">
    <header class="history__header">
      <h3 class="history__title">棋谱</h3>
      <span class="history__count">{{ moves.length }} 手</span>
    </header>
    <div ref="listRef" class="history__list">
      <p v-if="moves.length === 0" class="history__empty">尚未落子，点击棋盘开始对局。</p>
      <ol v-else class="history__items">
        <li v-for="move in moves" :key="move.index" class="history__item">
          <span class="history__index">{{ move.index }}</span>
          <span class="history__stone" :class="move.player === BLACK ? 'is-black' : 'is-white'" />
          <span class="history__point">{{ formatPoint(move.point, store.state.size) }}</span>
          <span v-if="move.captured > 0" class="history__capture">提 {{ move.captured }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.history {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.history__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.history__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.history__count {
  font-size: 12px;
  color: var(--text-tertiary);
}

.history__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.history__empty {
  padding: 16px 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-tertiary);
  text-align: center;
}

.history__items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history__item {
  display: grid;
  grid-template-columns: 30px 14px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-size: 13px;
}

.history__item:last-child {
  background: var(--accent-soft);
}

.history__index {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-tertiary);
  text-align: right;
}

.history__stone {
  width: 13px;
  height: 13px;
  border-radius: 50%;
}

.history__stone.is-black {
  background: radial-gradient(circle at 32% 30%, var(--stone-black-a), var(--stone-black-b));
}

.history__stone.is-white {
  background: radial-gradient(circle at 32% 30%, var(--stone-white-a), var(--stone-white-b));
  border: 1px solid var(--stone-white-edge);
}

.history__point {
  font-family: var(--font-mono);
  color: var(--text-primary);
}

.history__capture {
  font-size: 11px;
  color: var(--danger);
}
</style>
