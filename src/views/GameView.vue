<script setup lang="ts">
/**
 * 对局主视图：棋盘 + 侧边控制台，自适应布局并保持页面状态。
 * 创建者：zhenghq
 */
import { computed } from 'vue'
import GoBoard from '@/components/GoBoard.vue'
import ControlPanel from '@/components/ControlPanel.vue'
import GameActions from '@/components/GameActions.vue'
import MoveHistory from '@/components/MoveHistory.vue'
import ResultOverlay from '@/components/ResultOverlay.vue'
import StatusPanel from '@/components/StatusPanel.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useGameStore } from '@/stores/game'
import type { Point } from '@/core/board'

const store = useGameStore()
const state = computed(() => store.state)

const interactive = computed(
  () => state.value.status === 'playing' && !store.thinking && store.isHuman(state.value.currentPlayer),
)

/** 处理棋盘落子。 */
function onPlace(point: Point): void {
  store.play(point)
}
</script>

<template>
  <div class="game">
    <header class="game__header">
      <div class="game__brand">
        <span class="game__logo" aria-hidden="true">囲</span>
        <div>
          <h1 class="game__title">围棋 · 人机对战</h1>
          <p class="game__tagline">提子 · 劫争 · 数子终局 · Web Worker 异步 AI</p>
        </div>
      </div>
      <ThemeToggle />
    </header>

    <main class="game__body">
      <section class="game__board">
        <GoBoard
          :board="state.board"
          :size="state.size"
          :current-player="state.currentPlayer"
          :last-move="store.lastMove?.point ?? null"
          :show-coordinates="store.preferences.showCoordinates"
          :show-last-move="store.preferences.showLastMove"
          :interactive="interactive"
          :score="state.score"
          :hint-point="null"
          @place="onPlace"
        />
        <ResultOverlay />
      </section>

      <aside class="game__sidebar">
        <StatusPanel :stats="store.lastStats" />
        <GameActions />
        <ControlPanel />
        <MoveHistory class="game__history" />
        <p v-if="store.message" class="game__message" role="alert">{{ store.message }}</p>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.game {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: radial-gradient(circle at 12% 0%, var(--bg-gradient-a), var(--bg-gradient-b) 58%);
}

.game__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 22px;
  border-bottom: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--bg-surface) 82%, transparent);
  backdrop-filter: blur(8px);
}

.game__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.game__logo {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: var(--radius-sm);
  background: var(--text-primary);
  color: var(--bg-surface);
  font-size: 20px;
  font-weight: 700;
}

.game__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
}

.game__tagline {
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-tertiary);
}

.game__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 336px;
  gap: 18px;
  flex: 1;
  min-height: 0;
  padding: 18px 22px 22px;
}

.game__board {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  padding: 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
  background: color-mix(in srgb, var(--bg-surface) 55%, transparent);
  overflow: hidden;
}

.game__sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}

.game__history {
  flex: 1;
  min-height: 180px;
}

.game__message {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: var(--warning-soft);
  color: var(--warning);
  font-size: 12px;
  text-align: center;
}

@media (max-width: 1080px) {
  .game__body {
    grid-template-columns: minmax(0, 1fr);
    overflow-y: auto;
  }

  .game__board {
    min-height: min(78vw, 620px);
  }

  .game__sidebar {
    overflow: visible;
  }
}

@media (max-width: 560px) {
  .game__header {
    padding: 12px 14px;
  }

  .game__tagline {
    display: none;
  }

  .game__body {
    gap: 12px;
    padding: 12px;
  }

  .game__board {
    min-height: 92vw;
    padding: 8px;
  }
}
</style>
