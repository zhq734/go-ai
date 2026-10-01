/**
 * 围棋着法规则：落子、提子、自杀与劫争判定。
 * 创建者：zhenghq
 */
import {
  EMPTY,
  type Board,
  type Player,
  type Point,
  findGroup,
  isLegalMove,
  isSuicide,
  opponent,
  placeStone,
  pointIndex,
} from '@/core/board'

/** 一次落子产生的结果。 */
export interface MoveResult {
  board: Board
  captured: number
}

/**
 * 返回对手颜色。
 * @param player 当前颜色。
 * @returns 对手颜色。
 */
export function opposite(player: Player): Player {
  return opponent(player)
}

/**
 * 执行一手合法落子（含提子），不修改原棋盘。
 * @param board 当前棋盘。
 * @param size 棋盘边长。
 * @param point 落子点。
 * @param player 落子方颜色。
 * @returns 落子后的新棋盘与被提子数量。
 */
export function applyMove(board: Board, size: number, point: Point, player: Player): MoveResult {
  return placeStone(board, size, point, player)
}

/**
 * 判断这手棋是否形成打劫（提一子后落子点自身仅剩一气，且提子点可立即回提）。
 * @param before 落子前棋盘。
 * @param after 落子后棋盘。
 * @param size 棋盘边长。
 * @param point 落子点。
 * @param player 落子方颜色。
 * @returns 是否形成劫争。
 */
export function createsKo(
  before: Board,
  after: Board,
  size: number,
  point: Point,
  player: Player,
): boolean {
  const index = pointIndex(size, point.x, point.y)
  if (after[index] !== player) return false
  const selfGroup = findGroup(after, size, point)
  if (selfGroup.stones.size !== 1 || selfGroup.liberties.size !== 1) return false

  if (before[index] !== EMPTY) return false

  const libertyIndex = [...selfGroup.liberties][0]
  const lx = libertyIndex % size
  const ly = Math.floor(libertyIndex / size)
  if (after[libertyIndex] !== EMPTY) return false

  // 回提后必须正好提走刚落的一子，且落子点重新变空（局面还原），形同劫争。
  const recapture = placeStone(after, size, { x: lx, y: ly }, opponent(player))
  if (recapture.captured !== 1 || recapture.board[index] !== EMPTY) return false
  return findGroup(recapture.board, size, { x: lx, y: ly }).liberties.size > 0
}

/**
 * 判断棋盘是否已满（终局候选）。
 * @param board 棋盘。
 * @returns 是否无空点。
 */
export function isBoardFull(board: Board): boolean {
  return !board.includes(EMPTY)
}

/**
 * 判断指定一方是否还有合法落点（排除劫争禁着点与自杀点）。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param player 待判断的一方。
 * @param koPoint 当前劫争禁着点。
 * @returns 是否存在至少一个合法落点。
 */
export function hasLegalMove(board: Board, size: number, player: Player, koPoint: Point | null): boolean {
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== EMPTY) continue
    const point = { x: index % size, y: Math.floor(index / size) }
    if (koPoint && koPoint.x === point.x && koPoint.y === point.y) continue
    if (isLegalMove(board, size, point, player)) return true
  }
  return false
}

/**
 * 判断某手是否为自杀手。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param point 落子点。
 * @param player 落子方颜色。
 * @returns 是否自杀。
 */
export function isSelfCapture(board: Board, size: number, point: Point, player: Player): boolean {
  return isSuicide(board, size, point, player)
}
