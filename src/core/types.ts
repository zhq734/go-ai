/**
 * 对局层类型定义。
 * 创建者：zhenghq
 */
import type { Board, Player, Point } from '@/core/board'
import type { ScoreResult } from '@/core/scoring'

export type { Board, Player, Point } from '@/core/board'
export type { ScoreResult } from '@/core/scoring'

/** AI 难度等级。 */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert'

/** 对局模式：人机对战 / 本地双人。 */
export type GameMode = 'ai' | 'pvp'

/** 对局状态：进行中 / 已结束。 */
export type GameStatus = 'playing' | 'scored'

/** 终局原因。 */
export type EndReason = 'score' | 'resign' | null

/** 一手棋的记录。 */
export interface MoveRecord {
  /** 手数（从 1 开始）。 */
  index: number
  /** 落子方颜色。 */
  player: Player
  /** 落子点；null 表示停一手。 */
  point: Point | null
  /** 本手提子数。 */
  captured: number
  /** 本手之后的劫争禁着点。 */
  koPoint: Point | null
}

/** 对局完整状态。 */
export interface GameState {
  size: number
  board: Board
  currentPlayer: Player
  status: GameStatus
  moves: MoveRecord[]
  koPoint: Point | null
  captures: { black: number; white: number }
  komi: number
  consecutivePasses: number
  score: ScoreResult | null
  winner: Player | 'D' | null
  endReason: EndReason
  /** 用于悔棋的历史快照（不含 history 自身）。 */
  history: Omit<GameState, 'history'>[]
}
