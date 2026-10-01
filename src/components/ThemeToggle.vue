<script setup lang="ts">
/**
 * 主题切换按钮：明亮 / 暗色 / 跟随系统三态循环。
 * 创建者：zhenghq
 */
import { computed } from 'vue'
import { useTheme, type ThemePreference } from '@/composables/useTheme'

const { preference, setPreference } = useTheme()

const ORDER: ThemePreference[] = ['system', 'light', 'dark']

const label = computed(() => {
  if (preference.value === 'light') return '明亮'
  if (preference.value === 'dark') return '暗色'
  return '跟随系统'
})

const icon = computed(() => {
  if (preference.value === 'light') return '☀'
  if (preference.value === 'dark') return '☾'
  return '◐'
})

/** 循环切换主题偏好。 */
function cycle(): void {
  const index = ORDER.indexOf(preference.value)
  setPreference(ORDER[(index + 1) % ORDER.length])
}
</script>

<template>
  <button class="theme-toggle" type="button" :title="`主题：${label}`" @click="cycle">
    <span class="theme-toggle__icon" aria-hidden="true">{{ icon }}</span>
    <span class="theme-toggle__label">{{ label }}</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-default);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 13px;
  transition: background-color var(--transition-fast), color var(--transition-fast),
    border-color var(--transition-fast);
}

.theme-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.theme-toggle__icon {
  font-size: 15px;
  line-height: 1;
}
</style>
