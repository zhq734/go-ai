<script setup lang="ts">
/**
 * Canvas 围棋棋盘：绘制木纹棋盘、星位、棋子、最后一手、悬停预览与终局领地。
 * 创建者：zhenghq
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BLACK, EMPTY, WHITE, type Board, type Player, type Point } from '@/core/board'
import type { ScoreResult } from '@/core/scoring'

const props = defineProps<{
  board: Board
  size: number
  currentPlayer: Player
  lastMove: Point | null
  showCoordinates: boolean
  showLastMove: boolean
  interactive: boolean
  score: ScoreResult | null
  hintPoint: Point | null
}>()

const emit = defineEmits<{ (e: 'place', point: Point): void }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const hover = ref<Point | null>(null)
const cssSize = ref(0)

/** 星位坐标（按棋盘规格）。 */
const starPoints = computed<Point[]>(() => {
  const size = props.size
  if (size === 9) {
    return [
      { x: 2, y: 2 },
      { x: 6, y: 2 },
      { x: 4, y: 4 },
      { x: 2, y: 6 },
      { x: 6, y: 6 },
    ]
  }
  if (size === 13) {
    return [
      { x: 3, y: 3 },
      { x: 9, y: 3 },
      { x: 6, y: 6 },
      { x: 3, y: 9 },
      { x: 9, y: 9 },
    ]
  }
  return [
    { x: 3, y: 3 },
    { x: 9, y: 3 },
    { x: 15, y: 3 },
    { x: 3, y: 9 },
    { x: 9, y: 9 },
    { x: 15, y: 9 },
    { x: 3, y: 15 },
    { x: 9, y: 15 },
    { x: 15, y: 15 },
  ]
})

/** 棋盘内边距（CSS 像素）。 */
const padding = computed(() => (props.showCoordinates ? Math.max(26, cssSize.value * 0.055) : Math.max(12, cssSize.value * 0.03)))
/** 网格间距。 */
const gap = computed(() => {
  const inner = cssSize.value - padding.value * 2
  return inner / Math.max(1, props.size - 1)
})

/**
 * 把棋盘坐标转换为画布像素坐标。
 * @param point 棋盘坐标。
 * @returns 画布坐标。
 */
function toPixel(point: Point): { x: number; y: number } {
  return { x: padding.value + point.x * gap.value, y: padding.value + point.y * gap.value }
}

/**
 * 把画布坐标转换为棋盘坐标。
 * @param x 画布横坐标。
 * @param y 画布纵坐标。
 * @returns 最近的棋盘交叉点；超出范围时返回 null。
 */
function toPoint(x: number, y: number): Point | null {
  const gx = Math.round((x - padding.value) / gap.value)
  const gy = Math.round((y - padding.value) / gap.value)
  if (gx < 0 || gy < 0 || gx >= props.size || gy >= props.size) return null
  const pixel = toPixel({ x: gx, y: gy })
  const distance = Math.hypot(pixel.x - x, pixel.y - y)
  if (distance > gap.value * 0.52) return null
  return { x: gx, y: gy }
}

/** 读取主题变量值。 */
function themeVar(name: string): string {
  if (typeof window === 'undefined') return '#000'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#000'
}

/** 绘制一颗棋子。 */
function drawStone(
  ctx: CanvasRenderingContext2D,
  point: Point,
  player: Player,
  radius: number,
  alpha = 1,
): void {
  const { x, y } = toPixel(point)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.arc(x + radius * 0.08, y + radius * 0.14, radius, 0, Math.PI * 2)
  ctx.fillStyle = themeVar('--stone-shadow')
  ctx.fill()

  const gradient = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.4,
    radius * 0.12,
    x,
    y,
    radius * 1.05,
  )
  if (player === BLACK) {
    gradient.addColorStop(0, themeVar('--stone-black-a'))
    gradient.addColorStop(1, themeVar('--stone-black-b'))
  } else {
    gradient.addColorStop(0, themeVar('--stone-white-a'))
    gradient.addColorStop(1, themeVar('--stone-white-b'))
  }
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()
  if (player === WHITE) {
    ctx.strokeStyle = themeVar('--stone-white-edge')
    ctx.lineWidth = Math.max(0.6, radius * 0.06)
    ctx.stroke()
  }
  ctx.restore()
}

/** 全量重绘棋盘。 */
function draw(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const size = cssSize.value
  canvas.width = Math.round(size * dpr)
  canvas.height = Math.round(size * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size, size)

  // 木纹背景
  const wood = ctx.createLinearGradient(0, 0, size, size)
  wood.addColorStop(0, themeVar('--board-wood-a'))
  wood.addColorStop(1, themeVar('--board-wood-b'))
  ctx.fillStyle = wood
  ctx.fillRect(0, 0, size, size)
  ctx.save()
  ctx.globalAlpha = 0.06
  ctx.strokeStyle = themeVar('--board-line-strong')
  for (let i = 0; i < 14; i += 1) {
    const y = (size / 14) * i + (i % 3) * 2
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(size * 0.3, y + 6, size * 0.6, y - 6, size, y + 2)
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.restore()

  // 终局领地标记
  if (props.score) {
    for (let y = 0; y < props.size; y += 1) {
      for (let x = 0; x < props.size; x += 1) {
        if (props.board[y * props.size + x] !== EMPTY) continue
        const { x: px, y: py } = toPixel({ x, y })
        const radius = gap.value * 0.2
        const left = x > 0 ? props.board[y * props.size + x - 1] : EMPTY
        const right = x < props.size - 1 ? props.board[y * props.size + x + 1] : EMPTY
        const up = y > 0 ? props.board[(y - 1) * props.size + x] : EMPTY
        const down = y < props.size - 1 ? props.board[(y + 1) * props.size + x] : EMPTY
        const blackNeighbor = [left, right, up, down].filter((cell) => cell === BLACK).length
        const whiteNeighbor = [left, right, up, down].filter((cell) => cell === WHITE).length
        if (blackNeighbor > 0 && whiteNeighbor === 0) {
          ctx.fillStyle = themeVar('--territory-black')
          ctx.beginPath()
          ctx.arc(px, py, radius, 0, Math.PI * 2)
          ctx.fill()
        } else if (whiteNeighbor > 0 && blackNeighbor === 0) {
          ctx.fillStyle = themeVar('--territory-white')
          ctx.beginPath()
          ctx.arc(px, py, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }

  // 网格线
  ctx.strokeStyle = themeVar('--board-line')
  ctx.lineWidth = Math.max(0.8, size / 640)
  ctx.beginPath()
  for (let i = 0; i < props.size; i += 1) {
    const offset = padding.value + i * gap.value
    ctx.moveTo(padding.value, offset)
    ctx.lineTo(size - padding.value, offset)
    ctx.moveTo(offset, padding.value)
    ctx.lineTo(offset, size - padding.value)
  }
  ctx.stroke()

  // 外框加粗
  ctx.strokeStyle = themeVar('--board-line-strong')
  ctx.lineWidth = Math.max(1.6, size / 320)
  ctx.strokeRect(padding.value, padding.value, size - padding.value * 2, size - padding.value * 2)

  // 星位
  ctx.fillStyle = themeVar('--board-star')
  for (const star of starPoints.value) {
    const { x, y } = toPixel(star)
    ctx.beginPath()
    ctx.arc(x, y, Math.max(1.8, gap.value * 0.1), 0, Math.PI * 2)
    ctx.fill()
  }

  // 坐标
  if (props.showCoordinates) {
    const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
    ctx.fillStyle = themeVar('--board-coordinate')
    ctx.font = `${Math.max(10, gap.value * 0.42)}px ${themeVar('--font-sans')}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < props.size; i += 1) {
      const offset = padding.value + i * gap.value
      ctx.fillText(letters[i] ?? '', offset, padding.value * 0.52)
      ctx.fillText(String(props.size - i), padding.value * 0.48, offset)
    }
  }

  const radius = gap.value * 0.46
  // 棋子
  for (let y = 0; y < props.size; y += 1) {
    for (let x = 0; x < props.size; x += 1) {
      const cell = props.board[y * props.size + x]
      if (cell === EMPTY) continue
      drawStone(ctx, { x, y }, cell as Player, radius)
    }
  }

  // 最后一手标记
  if (props.showLastMove && props.lastMove) {
    const { x, y } = toPixel(props.lastMove)
    ctx.beginPath()
    ctx.arc(x, y, Math.max(2.4, radius * 0.3), 0, Math.PI * 2)
    ctx.fillStyle = themeVar('--last-move')
    ctx.fill()
  }

  // 推荐落点提示
  if (props.hintPoint) {
    const { x, y } = toPixel(props.hintPoint)
    ctx.beginPath()
    ctx.arc(x, y, radius * 0.9, 0, Math.PI * 2)
    ctx.strokeStyle = themeVar('--accent')
    ctx.lineWidth = Math.max(1.4, radius * 0.16)
    ctx.setLineDash([radius * 0.5, radius * 0.36])
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 悬停预览
  if (hover.value && props.interactive && props.board[hover.value.y * props.size + hover.value.x] === EMPTY) {
    drawStone(ctx, hover.value, props.currentPlayer, radius, 0.42)
  }
}

/** 根据容器宽度更新棋盘尺寸（自适应）。 */
function resize(): void {
  const canvas = canvasRef.value
  const parent = canvas?.parentElement
  if (!canvas || !parent) return
  const next = Math.floor(Math.min(parent.clientWidth, parent.clientHeight || parent.clientWidth))
  if (next > 0 && Math.abs(next - cssSize.value) > 0.5) {
    cssSize.value = next
    draw()
  }
}

/** 处理指针移动，更新悬停点。 */
function onPointerMove(event: PointerEvent): void {
  const canvas = canvasRef.value
  if (!canvas || !props.interactive) return
  const rect = canvas.getBoundingClientRect()
  const point = toPoint(event.clientX - rect.left, event.clientY - rect.top)
  const changed = point?.x !== hover.value?.x || point?.y !== hover.value?.y
  hover.value = point
  if (changed) draw()
}

/** 处理点击落子。 */
function onPointerDown(event: PointerEvent): void {
  const canvas = canvasRef.value
  if (!canvas || !props.interactive) return
  const rect = canvas.getBoundingClientRect()
  const point = toPoint(event.clientX - rect.left, event.clientY - rect.top)
  if (point) emit('place', point)
}

let observer: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null

onMounted(() => {
  resize()
  if (typeof ResizeObserver !== 'undefined' && canvasRef.value?.parentElement) {
    observer = new ResizeObserver(() => resize())
    observer.observe(canvasRef.value.parentElement)
  } else {
    window.addEventListener('resize', resize)
  }
  themeObserver = new MutationObserver(() => draw())
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  themeObserver?.disconnect()
  window.removeEventListener('resize', resize)
})

watch(
  () => [props.board, props.size, props.lastMove, props.hintPoint, props.score, props.showCoordinates, props.showLastMove, props.currentPlayer],
  () => draw(),
  { deep: true },
)
</script>

<template>
  <div class="board-shell">
    <canvas
      ref="canvasRef"
      class="board-canvas"
      :style="{ width: `${cssSize}px`, height: `${cssSize}px` }"
      role="grid"
      :aria-label="`围棋棋盘，${size} 路`"
      @pointermove="onPointerMove"
      @pointerleave="hover = null; draw()"
      @pointerdown="onPointerDown"
    />
  </div>
</template>

<style scoped>
.board-shell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.board-canvas {
  display: block;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  touch-action: manipulation;
  cursor: pointer;
  max-width: 100%;
  max-height: 100%;
}
</style>
