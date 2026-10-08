/**
 * 对局状态管理：棋盘、回合、终局、悔棋、偏好持久化与 AI 交互。
 * 创建者：zhenghq
 */
import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { BLACK, WHITE, type Player, type Point } from '@/core/board'
import { createGame, passMove, playMove, playerName, resignGame, undoMove } from '@/core/game'
import type { Difficulty, GameMode, GameState, MoveRecord } from '@/core/types'
import { useGoWorker } from '@/composables/useGoWorker'
import { useSound } from '@/composables/useSound'

/** 棋盘规格。 */
export type BoardSize = 9 | 13 | 19

/** 持久化偏好。 */
export interface Preferences {
  difficulty: Difficulty
  boardSize: BoardSize
  humanFirst: boolean
  showCoordinates: boolean
  showLastMove: boolean
  sound: boolean
  mode: GameMode
}

const STORAGE_KEY = 'go.preferences.v1'
const DEFAULT_PREFERENCES: Preferences = {
  difficulty: 'normal',
  boardSize: 9,
  humanFirst: true,
  showCoordinates: true,
  showLastMove: true,
  sound: true,
  mode: 'ai',
}

/**
 * 从本地存储读取偏好。
 * @returns 合并默认值后的偏好设置。
 */
function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFERENCES }
    const parsed = JSON.parse(raw) as Partial<Preferences>
    return { ...DEFAULT_PREFERENCES, ...parsed }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

/**
 * 对局状态仓库。
 * 创建者：zhenghq
 */
export const useGameStore = defineStore('go-game', () => {
  const preferences = ref<Preferences>(loadPreferences())
  const state = ref<GameState>(createGame(preferences.value.boardSize))
  const humanColor = computed<Player>(() => (preferences.value.humanFirst ? BLACK : WHITE))
  const aiColor = computed<Player>(() => (humanColor.value === BLACK ? WHITE : BLACK))
  const isAiTurn = computed(
    () => preferences.value.mode === 'ai' && state.value.status === 'playing' && state.value.currentPlayer === aiColor.value,
  )
  const message = ref<string>('')
  const resultOpen = ref(false)

  const { thinking, lastStats, think, cancel } = useGoWorker()
  const sound = useSound()

  /**
   * 持久化偏好设置。
   */
  watch(
    preferences,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      } catch {
        /* 忽略存储异常 */
      }
      sound.setEnabled(value.sound)
    },
    { deep: true, immediate: true },
  )

  /**
   * 判断指定颜色是否由人类玩家操作。
   * @param player 颜色。
   * @returns 是否为人类回合。
   */
  function isHuman(player: Player): boolean {
    return preferences.value.mode === 'pvp' || player === humanColor.value
  }

  /** 开始新对局。 */
  function newGame(): void {
    cancel()
    state.value = createGame(preferences.value.boardSize)
    message.value = ''
    resultOpen.value = false
  }

  /**
   * 落子并处理音效与 AI 回合。
   * @param point 落子点。
   */
  function play(point: Point): void {
    if (state.value.status !== 'playing') return
    if (preferences.value.mode === 'ai' && !isHuman(state.value.currentPlayer)) return
    const result = playMove(state.value, point)
    if (result.error) {
      message.value = result.error
      return
    }
    message.value = ''
    const record = result.state.moves[result.state.moves.length - 1]
    if (record && record.captured > 0) sound.playCapture()
    else sound.playPlace()
    if (result.state.status === 'scored') {
      sound.playFinish()
      resultOpen.value = true
    }
    state.value = result.state
    void maybeAiMove()
  }

  /** 停一手。 */
  function pass(): void {
    if (state.value.status !== 'playing') return
    if (preferences.value.mode === 'ai' && !isHuman(state.value.currentPlayer)) return
    const result = passMove(state.value)
    if (result.error) {
      message.value = result.error
      return
    }
    message.value = ''
    if (result.state.status === 'scored') {
      sound.playFinish()
      resultOpen.value = true
    }
    state.value = result.state
    void maybeAiMove()
  }

  /**
   * 认输。
   * @param player 认输方；默认为当前行棋方。
   */
  function resign(player?: Player): void {
    if (state.value.status !== 'playing') return
    const loser = player ?? state.value.currentPlayer
    state.value = resignGame(state.value, loser).state
    message.value = ''
    resultOpen.value = true
    sound.playFinish()
  }

  /** 悔棋：人机模式回退到人类上一手之前。 */
  function undo(): void {
    if (state.value.history.length === 0) return
    cancel()
    let next = undoMove(state.value)
    if (preferences.value.mode === 'ai') {
      let guard = 0
      while (next.history.length > 0 && next.currentPlayer !== humanColor.value && guard < 4) {
        next = undoMove(next)
        guard += 1
      }
    }
    state.value = next
    message.value = ''
    resultOpen.value = false
  }

  /**
   * 触发 AI 落子。
   * 说明：当对手无合法着法时核心逻辑会自动替对手停一手，行棋权随即回到 AI，
   * 因此这里循环处理 AI 的连续回合，直至终局或轮到人类，避免对局卡死。
   */
  async function maybeAiMove(): Promise<void> {
    let guard = 0
    const maxSteps = state.value.board.length + 4
    while (isAiTurn.value && guard < maxSteps) {
      guard += 1
      const snapshot = state.value
      const result = await think({
        board: snapshot.board.slice(),
        size: snapshot.size,
        player: snapshot.currentPlayer,
        difficulty: preferences.value.difficulty,
        koPoint: snapshot.koPoint ? { ...snapshot.koPoint } : null,
      })
      // 思考期间局面已变化则丢弃结果。
      if (state.value !== snapshot || state.value.status !== 'playing') return
      if (!result) {
        // AI 无合法着法时自动停一手，交由核心逻辑推进或直接结算。
        const passed = passMove(state.value)
        if (passed.error) return
        if (passed.state.status === 'scored') {
          sound.playFinish()
          resultOpen.value = true
        }
        state.value = passed.state
        continue
      }
      const applied = playMove(state.value, result.point)
      if (applied.error) return
      const record = applied.state.moves[applied.state.moves.length - 1]
      if (record && record.captured > 0) sound.playCapture()
      else sound.playPlace()
      if (applied.state.status === 'scored') {
        sound.playFinish()
        resultOpen.value = true
      }
      state.value = applied.state
    }
  }

  /** 重新打开终局结果弹窗。 */
  function showResult(): void {
    if (state.value.status === 'scored') resultOpen.value = true
  }

  /** 关闭终局结果弹窗，便于查看棋盘。 */
  function hideResult(): void {
    resultOpen.value = false
  }

  /**
   * 修改偏好设置。
   * @param patch 需要更新的字段。
   */
  function updatePreferences(patch: Partial<Preferences>): void {
    const sizeChanged = patch.boardSize !== undefined && patch.boardSize !== preferences.value.boardSize
    const colorChanged = patch.humanFirst !== undefined && patch.humanFirst !== preferences.value.humanFirst
    const modeChanged = patch.mode !== undefined && patch.mode !== preferences.value.mode
    preferences.value = { ...preferences.value, ...patch }
    if (sizeChanged || colorChanged || modeChanged) newGame()
  }

  /** 当前行棋方名称。 */
  const currentName = computed(() => playerName(state.value.currentPlayer))

  /** 最近一手记录。 */
  const lastMove = computed<MoveRecord | null>(() => {
    const moves = state.value.moves
    return moves.length > 0 ? moves[moves.length - 1] : null
  })

  /** 是否允许悔棋。 */
  const canUndo = computed(() => state.value.history.length > 0 && !thinking.value)

  /** 是否已终局，可用于重新查看结果。 */
  const canShowResult = computed(() => state.value.status === 'scored')

  return {
    preferences,
    state,
    message,
    resultOpen,
    humanColor,
    aiColor,
    isAiTurn,
    thinking,
    lastStats,
    currentName,
    lastMove,
    canUndo,
    canShowResult,
    isHuman,
    newGame,
    play,
    pass,
    resign,
    undo,
    showResult,
    hideResult,
    updatePreferences,
  }
})
