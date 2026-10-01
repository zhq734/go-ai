/**
 * 主题管理：支持明亮/暗色/跟随系统，并持久化用户选择。
 * 创建者：zhenghq
 */
import { computed, ref } from 'vue'

/** 主题偏好。 */
export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'go.theme.v1'
const preference = ref<ThemePreference>('system')
const systemDark = ref(false)
let initialized = false

/**
 * 读取持久化的主题偏好。
 * @returns 主题偏好。
 */
function loadPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    /* 忽略存储异常 */
  }
  return 'system'
}

/**
 * 把主题应用到文档根节点。
 * @param dark 是否使用暗色主题。
 */
function applyTheme(dark: boolean): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = dark ? 'dark' : 'light'
  root.style.colorScheme = dark ? 'dark' : 'light'
}

/**
 * 初始化主题监听（幂等）。
 */
function init(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  preference.value = loadPreference()
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = query.matches
  query.addEventListener('change', (event) => {
    systemDark.value = event.matches
    if (preference.value === 'system') applyTheme(event.matches)
  })
  applyTheme(preference.value === 'dark' || (preference.value === 'system' && query.matches))
}

/**
 * 主题组合式函数。
 * @returns 当前是否暗色、主题偏好与切换方法。
 */
export function useTheme() {
  init()
  const isDark = computed(() => preference.value === 'dark' || (preference.value === 'system' && systemDark.value))

  /**
   * 设置主题偏好。
   * @param value 目标偏好。
   */
  function setPreference(value: ThemePreference): void {
    preference.value = value
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* 忽略存储异常 */
    }
    applyTheme(value === 'dark' || (value === 'system' && systemDark.value))
  }

  /** 在明亮与暗色之间切换。 */
  function toggle(): void {
    setPreference(isDark.value ? 'light' : 'dark')
  }

  return { isDark, preference, setPreference, toggle }
}
