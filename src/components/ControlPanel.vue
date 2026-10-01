<script setup lang="ts">
/**
 * 控制面板：棋盘规格、难度、执子、模式与开关项设置。
 * 创建者：zhenghq
 */
import { computed } from 'vue'
import { useGameStore, type BoardSize } from '@/stores/game'
import type { Difficulty, GameMode } from '@/core/types'

const store = useGameStore()
const preferences = computed(() => store.preferences)

const SIZES: BoardSize[] = [9, 13, 19]
const DIFFICULTIES: Array<{ value: Difficulty; label: string; hint: string }> = [
  { value: 'easy', label: '入门', hint: '快速落子，适合熟悉规则' },
  { value: 'normal', label: '普通', hint: '兼顾棋力与速度' },
  { value: 'hard', label: '困难', hint: '更深搜索，思考稍久' },
  { value: 'expert', label: '大师', hint: '最深搜索，追求棋力' },
]
const MODES: Array<{ value: GameMode; label: string }> = [
  { value: 'ai', label: '人机对战' },
  { value: 'pvp', label: '双人对弈' },
]

/** 切换棋盘规格。 */
function setSize(size: BoardSize): void {
  store.updatePreferences({ boardSize: size })
}

/** 切换难度。 */
function setDifficulty(difficulty: Difficulty): void {
  store.updatePreferences({ difficulty })
}

/** 切换对战模式。 */
function setMode(mode: GameMode): void {
  store.updatePreferences({ mode })
}

/** 切换执黑/执白。 */
function setHumanFirst(humanFirst: boolean): void {
  store.updatePreferences({ humanFirst })
}
</script>

<template>
  <section class="panel">
    <div class="panel__group">
      <h3 class="panel__title">对局模式</h3>
      <div class="segmented">
        <button
          v-for="mode in MODES"
          :key="mode.value"
          type="button"
          class="segmented__item"
          :class="{ 'is-active': preferences.mode === mode.value }"
          @click="setMode(mode.value)"
        >
          {{ mode.label }}
        </button>
      </div>
    </div>

    <div v-if="preferences.mode === 'ai'" class="panel__group">
      <h3 class="panel__title">AI 难度</h3>
      <div class="difficulty">
        <button
          v-for="item in DIFFICULTIES"
          :key="item.value"
          type="button"
          class="difficulty__item"
          :class="{ 'is-active': preferences.difficulty === item.value }"
          :title="item.hint"
          @click="setDifficulty(item.value)"
        >
          <span class="difficulty__label">{{ item.label }}</span>
          <span class="difficulty__hint">{{ item.hint }}</span>
        </button>
      </div>
    </div>

    <div class="panel__group">
      <h3 class="panel__title">棋盘规格</h3>
      <div class="segmented">
        <button
          v-for="size in SIZES"
          :key="size"
          type="button"
          class="segmented__item"
          :class="{ 'is-active': preferences.boardSize === size }"
          @click="setSize(size)"
        >
          {{ size }} 路
        </button>
      </div>
    </div>

    <div v-if="preferences.mode === 'ai'" class="panel__group">
      <h3 class="panel__title">执子颜色</h3>
      <div class="segmented">
        <button
          type="button"
          class="segmented__item"
          :class="{ 'is-active': preferences.humanFirst }"
          @click="setHumanFirst(true)"
        >
          <span class="dot dot--black" />执黑先行
        </button>
        <button
          type="button"
          class="segmented__item"
          :class="{ 'is-active': !preferences.humanFirst }"
          @click="setHumanFirst(false)"
        >
          <span class="dot dot--white" />执白后行
        </button>
      </div>
    </div>

    <div class="panel__group">
      <h3 class="panel__title">显示与声音</h3>
      <ul class="switches">
        <li>
          <label class="switch">
            <input
              type="checkbox"
              :checked="preferences.showCoordinates"
              @change="store.updatePreferences({ showCoordinates: ($event.target as HTMLInputElement).checked })"
            />
            <span>显示坐标</span>
          </label>
        </li>
        <li>
          <label class="switch">
            <input
              type="checkbox"
              :checked="preferences.showLastMove"
              @change="store.updatePreferences({ showLastMove: ($event.target as HTMLInputElement).checked })"
            />
            <span>标记最后一手</span>
          </label>
        </li>
        <li>
          <label class="switch">
            <input
              type="checkbox"
              :checked="preferences.sound"
              @change="store.updatePreferences({ sound: ($event.target as HTMLInputElement).checked })"
            />
            <span>落子音效</span>
          </label>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  box-shadow: var(--shadow-sm);
}

.panel__group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel__title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
}

.segmented {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
}

.segmented__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 6px;
  border-radius: calc(var(--radius-sm) - 2px);
  font-size: 13px;
  color: var(--text-secondary);
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.segmented__item:hover {
  color: var(--text-primary);
}

.segmented__item.is-active {
  background: var(--bg-surface-raised);
  color: var(--accent);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot--black {
  background: radial-gradient(circle at 32% 30%, var(--stone-black-a), var(--stone-black-b));
}

.dot--white {
  background: radial-gradient(circle at 32% 30%, var(--stone-white-a), var(--stone-white-b));
  border: 1px solid var(--stone-white-edge);
}

.difficulty {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.difficulty__item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px;
  text-align: left;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  background: var(--bg-secondary);
  transition: border-color var(--transition-fast), background-color var(--transition-fast);
}

.difficulty__item:hover {
  background: var(--bg-hover);
}

.difficulty__item.is-active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.difficulty__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.difficulty__item.is-active .difficulty__label {
  color: var(--accent);
}

.difficulty__hint {
  font-size: 11px;
  line-height: 1.35;
  color: var(--text-tertiary);
}

.switches {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.switch {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
}

.switch input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  cursor: pointer;
}
</style>
