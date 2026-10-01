/**
 * 对局流程：落子、提子、劫争、停一手、认输、悔棋与终局数子。
 * 创建者：zhenghq
 */
import {
  BLACK,
  EMPTY,
  WHITE,
  type Board,
  type Player,
  type Point,
  createBoard,
  isSuicide,
  opponent,
  placeStone,
  pointIndex,
} from '@/core/board'
import { createsKo, isBoardFull } from '@/core/rules'
import { scoreChinese } from '@/core/scoring'
import type { GameState, MoveRecord } from '@/core/types'

/** 落子结果。 */
export interface ActionResult {
  state: GameState
  error?: string
}

/**
 * 创建一局新对局。
 * @param size 棋盘边长。
 * @param komi 白方贴目。
 * @returns 初始对局状态（黑先）。
 */
export function createGame(size: number, komi = 7.5): GameState {
  return {
    size,
    board: createBoard(size),
    currentPlayer: BLACK,
    status: 'playing',
    moves: [],
    koPoint: null,
    captures: { black: 0, white: 0 },
    komi,
    consecutivePasses: 0,
    score: null,
    winner: null,
    endReason: null,
    history: [],
  }
}

/**
 * 生成用于悔棋的当前状态快照。
 * @param state 当前对局状态。
 * @returns 不含 history 的快照。
 */
function snapshot(state: GameState): Omit<GameState, 'history'> {
  const { history: _history, ...rest } = state
  return {
    ...rest,
    board: state.board.slice(),
    moves: state.moves.map((move) => ({ ...move })),
    captures: { ...state.captures },
    koPoint: state.koPoint ? { ...state.koPoint } : null,
    score: state.score ? { ...state.score } : null,
  }
}

/**
 * 用新状态替换当前状态并追加历史快照。
 * @param state 当前状态。
 * @param patch 需要覆盖的字段。
 * @returns 追加历史后的新状态。
 */
function advance(state: GameState, patch: Partial<GameState>): GameState {
  return {
    ...state,
    ...patch,
    history: [...state.history, snapshot(state)],
  }
}

/**
 * 终局数子。
 * @param state 当前状态。
 * @param reason 终局原因。
 * @param forcedWinner 认输等直接判定的胜者。
 * @returns 终局后的新状态。
 */
export function finishGame(
  state: GameState,
  reason: 'score' | 'resign',
  forcedWinner?: Player,
): GameState {
  const score = reason === 'score' ? scoreChinese(state.board, state.size, state.komi) : null
  const winner = forcedWinner ?? score?.winner ?? 'D'
  return advance(state, {
    status: 'scored',
    endReason: reason,
    score,
    winner,
    koPoint: null,
  })
}

/**
 * 执行一手落子，包含全部合法性校验。
 * @param state 当前对局状态。
 * @param point 落子点。
 * @returns 落子后的状态；非法时返回原状态并附带错误信息。
 */
export function playMove(state: GameState, point: Point): ActionResult {
  if (state.status !== 'playing') return { state, error: '对局已结束' }
  const { size, board, currentPlayer, koPoint } = state
  if (point.x < 0 || point.y < 0 || point.x >= size || point.y >= size) {
    return { state, error: '落子超出棋盘范围' }
  }
  const index = pointIndex(size, point.x, point.y)
  if (board[index] !== EMPTY) return { state, error: '该点已有棋子' }
  if (koPoint && koPoint.x === point.x && koPoint.y === point.y) {
    return { state, error: '劫争禁着点，请先寻劫' }
  }
  if (isSuicide(board, size, point, currentPlayer)) {
    return { state, error: '禁入点：落子后自身无气' }
  }

  const { board: nextBoard, captured } = placeStone(board, size, point, currentPlayer)
  const nextKo = createsKo(board, nextBoard, size, point, currentPlayer) ? { ...point } : null
  const record: MoveRecord = {
    index: state.moves.length + 1,
    player: currentPlayer,
    point: { ...point },
    captured,
    koPoint: nextKo ? { ...nextKo } : null,
  }
  const captures = { ...state.captures }
  if (currentPlayer === BLACK) captures.black += captured
  else captures.white += captured

  const nextState = advance(state, {
    board: nextBoard,
    moves: [...state.moves, record],
    currentPlayer: opponent(currentPlayer),
    koPoint: nextKo,
    captures,
    consecutivePasses: 0,
  })

  if (isBoardFull(nextBoard)) return { state: finishGame(nextState, 'score') }
  return { state: nextState }
}

/**
 * 停一手；连续两次停一手即终局数子。
 * @param state 当前对局状态。
 * @returns 停一手后的状态。
 */
export function passMove(state: GameState): ActionResult {
  if (state.status !== 'playing') return { state, error: '对局已结束' }
  const record: MoveRecord = {
    index: state.moves.length + 1,
    player: state.currentPlayer,
    point: null,
    captured: 0,
    koPoint: null,
  }
  const nextState = advance(state, {
    moves: [...state.moves, record],
    currentPlayer: opponent(state.currentPlayer),
    koPoint: null,
    consecutivePasses: state.consecutivePasses + 1,
  })
  if (nextState.consecutivePasses >= 2) return { state: finishGame(nextState, 'score') }
  return { state: nextState }
}

/**
 * 认输。
 * @param state 当前对局状态。
 * @param player 认输方颜色。
 * @returns 终局后的状态。
 */
export function resignGame(state: GameState, player: Player): ActionResult {
  if (state.status !== 'playing') return { state, error: '对局已结束' }
  return { state: finishGame(state, 'resign', opponent(player)) }
}

/**
 * 悔棋：回退到上一手之前。
 * @param state 当前对局状态。
 * @returns 回退后的状态；无历史时返回原状态。
 */
export function undoMove(state: GameState): GameState {
  if (state.history.length === 0) return state
  const previous = state.history[state.history.length - 1]
  return { ...previous, history: state.history.slice(0, -1) }
}

/**
 * 格式化坐标为中国围棋习惯的“字母 + 数字”（跳过 I）。
 * @param point 坐标点。
 * @param size 棋盘边长。
 * @returns 例如 D4、Q16。
 */
export function formatPoint(point: Point | null, size: number): string {
  if (!point) return '停一手'
  const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'
  const column = letters[point.x] ?? '?'
  const row = size - point.y
  return `${column}${row}`
}

/** 颜色中文名。 */
export function playerName(player: Player): string {
  return player === BLACK ? '黑棋' : '白棋'
}

export { BLACK, WHITE }
export type { Board, Point, Player }
