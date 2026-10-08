/**
 * 对局仓库流程测试：验证对手无合法着法被自动停一手后，AI 仍会继续行棋，
 * 不会把对局永久卡在 AI 回合（线上「走不下去也不结算」的回归防护）。
 * 创建者：zhenghq
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { BLACK, EMPTY, type Player, type Point } from '@/core/board'
import { createGame, playMove } from '@/core/game'
import type { GameState } from '@/core/types'

// 用可控的假 Worker 替换真实 Web Worker，便于在测试环境确定性驱动对局流程。
const { thinkMock } = vi.hoisted(() => ({ thinkMock: vi.fn() }))

vi.mock('@/composables/useGoWorker', () => ({
  useGoWorker: () => ({
    thinking: { value: false },
    lastStats: { value: null },
    think: thinkMock,
    cancel: () => {},
  }),
}))

vi.mock('@/composables/useSound', () => ({
  useSound: () => ({
    enabled: { value: false },
    setEnabled: () => {},
    playPlace: () => {},
    playCapture: () => {},
    playFinish: () => {},
  }),
}))

import { useGameStore } from '@/stores/game'

/**
 * 找到指定一方第一个合法落点。
 * @param state 当前对局状态。
 * @param player 待落子的一方。
 * @returns 合法落点；无合法着法时返回 null。
 */
function firstLegal(state: GameState, player: Player): Point | null {
  for (let index = 0; index < state.board.length; index += 1) {
    if (state.board[index] !== EMPTY) continue
    const point = { x: index % state.size, y: Math.floor(index / state.size) }
    if (state.koPoint && state.koPoint.x === point.x && state.koPoint.y === point.y) continue
    const probe: GameState = {
      ...createGame(state.size),
      board: state.board.slice(),
      size: state.size,
      currentPlayer: player,
      koPoint: state.koPoint ? { ...state.koPoint } : null,
    }
    if (!playMove(probe, point).error) return point
  }
  return null
}

/** 等待若干轮宏任务，让仓库内部的异步 AI 流程推进。 */
async function flush(rounds = 12): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

/** 用棋盘字符串构造 3 路残局。 */
function stateFrom(rows: string, currentPlayer: Player): GameState {
  const board = createGame(3).board
  for (let i = 0; i < rows.length; i += 1) {
    board[i] = Number(rows[i]) as 0 | 1 | 2
  }
  return { ...createGame(3), board, currentPlayer }
}

describe('game store 流程', () => {
  beforeEach(() => {
    thinkMock.mockReset()
    // 假 AI：总是选择第一个合法点，保证流程可确定性复现。
    thinkMock.mockImplementation(
      async (params: { board: GameState['board']; size: number; player: Player; koPoint: Point | null }) => {
        const point = firstLegal(
          {
            ...createGame(params.size),
            board: params.board,
            size: params.size,
            currentPlayer: params.player,
            koPoint: params.koPoint,
          },
          params.player,
        )
        if (!point) return null
        return {
          point,
          captured: 0,
          stats: { nodes: 1, depth: 1, iterations: 1, elapsed: 0, score: 0, timedOut: false },
        }
      },
    )
    setActivePinia(createPinia())
  })

  it('AI 落子导致人类无合法着法被自动停一手后，AI 会继续行棋而非卡死', async () => {
    const store = useGameStore()
    // 人机模式：人类执黑、AI 执白。
    store.updatePreferences({ mode: 'ai', humanFirst: true, boardSize: 9, difficulty: 'easy' })

    // 3 路残局，轮到黑方（人类）：
    //   黑 黑 黑
    //   白 白 黑
    //   空 空 空
    // 人类落子 (0,2)、AI 落子 (1,2) 后，人类已无合法落点会被核心逻辑自动停一手，
    // 行棋权交回 AI —— 修复前仓库不再触发 AI，对局永久卡在 AI 回合。
    store.state = stateFrom('111221000', BLACK)

    store.play({ x: 0, y: 2 })
    await flush()

    const stuckOnAi =
      store.state.status === 'playing' && store.state.currentPlayer === store.aiColor
    // 修复前：moves 停在 2 且仍轮到 AI；修复后：AI 已续走，moves 增长且交还人类（或已终局）。
    expect(store.state.moves.length).toBeGreaterThanOrEqual(3)
    expect(stuckOnAi).toBe(false)
  }, 20000)

  it('一方无合法着法被自动停一手后，另一方连续行动直至终局并弹出结果', async () => {
    const store = useGameStore()
    store.updatePreferences({ mode: 'ai', humanFirst: true, boardSize: 9, difficulty: 'easy' })

    // 黑方（人类）已无合法落点、白方（AI）仍可落子：AI 应连续行动直至终局。
    store.state = stateFrom('211111111', BLACK)

    // 人类停一手触发 AI 流程。
    store.pass()
    await flush()

    expect(store.state.status).toBe('scored')
    expect(store.state.winner).not.toBeNull()
    expect(store.resultOpen).toBe(true)
  }, 20000)
})
