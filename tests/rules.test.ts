/**
 * 劫争与终局判定测试。
 * 创建者：zhenghq
 */
import { describe, expect, it } from 'vitest'
import { BLACK, EMPTY, WHITE, createBoard, placeStone, pointIndex } from '@/core/board'
import { applyMove, createsKo, hasLegalMove, isBoardFull, opposite } from '@/core/rules'

/** 落子并返回新棋盘的测试辅助函数。 */
function put(board: ReturnType<typeof createBoard>, size: number, point: { x: number; y: number }, player: 1 | 2) {
  return placeStone(board, size, point, player).board
}

describe('rules', () => {
  it('opposite 返回对手颜色', () => {
    expect(opposite(BLACK)).toBe(WHITE)
    expect(opposite(WHITE)).toBe(BLACK)
  })

  it('打劫形状被判定为劫', () => {
    // 经典劫形：黑 (2,2) 提白 (2,1)，白不能立即在 (2,1) 回提
    let board = createBoard(5)
    board = put(board, 5, { x: 2, y: 1 }, WHITE)
    board = put(board, 5, { x: 1, y: 2 }, WHITE)
    board = put(board, 5, { x: 3, y: 2 }, WHITE)
    board = put(board, 5, { x: 2, y: 3 }, WHITE)
    board = put(board, 5, { x: 1, y: 1 }, BLACK)
    board = put(board, 5, { x: 3, y: 1 }, BLACK)
    board = put(board, 5, { x: 2, y: 0 }, BLACK)
    const { board: after, captured } = applyMove(board, 5, { x: 2, y: 2 }, BLACK)
    expect(captured).toBe(1)
    expect(createsKo(board, after, 5, { x: 2, y: 2 }, BLACK)).toBe(true)
  })

  it('普通提子不构成劫', () => {
    let board = createBoard(5)
    board = put(board, 5, { x: 1, y: 1 }, WHITE)
    board = put(board, 5, { x: 0, y: 1 }, BLACK)
    board = put(board, 5, { x: 2, y: 1 }, BLACK)
    const { board: after } = applyMove(board, 5, { x: 1, y: 2 }, BLACK)
    expect(createsKo(board, after, 5, { x: 1, y: 2 }, BLACK)).toBe(false)
  })

  it('isBoardFull 检测满盘', () => {
    const board = createBoard(2)
    board[pointIndex(2, 0, 0)] = BLACK
    board[pointIndex(2, 0, 1)] = WHITE
    expect(isBoardFull(board)).toBe(false)
    board[pointIndex(2, 1, 0)] = WHITE
    board[pointIndex(2, 1, 1)] = BLACK
    expect(isBoardFull(board)).toBe(true)
    expect(board.includes(EMPTY)).toBe(false)
  })

  it('hasLegalMove 能识别无合法落点的一方', () => {
    // 3 路棋盘中黑棋四个方向都被白棋包围，且落子均会自杀。
    const board = createBoard(3)
    board[pointIndex(3, 0, 0)] = BLACK
    board[pointIndex(3, 1, 0)] = WHITE
    board[pointIndex(3, 0, 1)] = WHITE
    board[pointIndex(3, 2, 1)] = WHITE
    board[pointIndex(3, 1, 2)] = WHITE

    expect(hasLegalMove(board, 3, BLACK, null)).toBe(false)
    expect(hasLegalMove(board, 3, WHITE, null)).toBe(true)
  })
})
