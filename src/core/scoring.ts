/**
 * 中国规则数子法：子 + 空，双活与单官按规则处理为中性点。
 * 创建者：zhenghq
 */
import { BLACK, EMPTY, WHITE, type Board, type Player, neighbors } from '@/core/board'

/** 终局点目结果。 */
export interface ScoreResult {
  black: number
  white: number
  blackTerritory: number
  whiteTerritory: number
  neutral: number
  winner: Player | 'D'
}

/**
 * 按中国规则数子法计算终局比分。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param komi 白方贴目。
 * @returns 双方比分与胜负结果。
 */
export function scoreChinese(board: Board, size: number, komi: number): ScoreResult {
  let black = 0
  let white = 0
  let blackTerritory = 0
  let whiteTerritory = 0
  let neutral = 0
  const visited = new Uint8Array(board.length)

  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === BLACK) black += 1
    if (board[i] === WHITE) white += 1
  }

  for (let i = 0; i < board.length; i += 1) {
    if (board[i] !== EMPTY || visited[i] === 1) continue
    const region: number[] = []
    const borders = new Set<number>()
    const stack: number[] = [i]
    visited[i] = 1
    while (stack.length > 0) {
      const current = stack.pop() as number
      region.push(current)
      for (const next of neighbors(size, current)) {
        if (board[next] === EMPTY) {
          if (visited[next] === 0) {
            visited[next] = 1
            stack.push(next)
          }
        } else {
          borders.add(board[next])
        }
      }
    }
    if (borders.size === 1 && borders.has(BLACK)) blackTerritory += region.length
    else if (borders.size === 1 && borders.has(WHITE)) whiteTerritory += region.length
    else neutral += region.length
  }

  const blackTotal = black + blackTerritory
  const whiteTotal = white + whiteTerritory + komi
  let winner: Player | 'D' = 'D'
  if (blackTotal > whiteTotal) winner = BLACK
  else if (whiteTotal > blackTotal) winner = WHITE
  return {
    black: blackTotal,
    white: whiteTotal,
    blackTerritory,
    whiteTerritory,
    neutral,
    winner,
  }
}
