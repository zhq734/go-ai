<script setup lang="ts">
/**
 * 应用根组件：初始化主题并借助 keep-alive 缓存页面状态。
 * 创建者：zhenghq
 */
import { useTheme } from '@/composables/useTheme'

useTheme()
</script>

<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive>
      <component :is="Component" />
    </KeepAlive>
  </RouterView>
</template>
