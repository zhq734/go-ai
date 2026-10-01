/**
 * 棋盘与气/提子规则测试。
 * 创建者：zhenghq
 */
import { describe, expect, it } from 'vitest'
import {
  BLACK,
  EMPTY,
  WHITE,
  countLiberties,
  createBoard,
  findGroup,
  isSuicide,
  placeStone,
  pointIndex,
  removeGroup,
} from '@/core/board'

/** 落子并返回新棋盘的测试辅助函数。 */
function put(board: ReturnType<typeof createBoard>, size: number, point: { x: number; y: number }, player: 1 | 2) {
  return placeStone(board, size, point, player).board
}

describe('board', () => {
  it('创建空棋盘', () => {
    const board = createBoard(9)
    expect(board.length).toBe(81)
    expect(board.every((p) => p === EMPTY)).toBe(true)
  })

  it('落子后可读取颜色', () => {
    const board = createBoard(9)
    const next = put(board, 9, { x: 4, y: 4 }, BLACK)
    expect(next[pointIndex(9, 4, 4)]).toBe(BLACK)
    // 原数组不被修改（不可变更新）
    expect(board[pointIndex(9, 4, 4)]).toBe(EMPTY)
  })

  it('统计单子的气', () => {
    const board = put(createBoard(9), 9, { x: 0, y: 0 }, BLACK)
    expect(countLiberties(board, 9, { x: 0, y: 0 })).toBe(2)
  })

  it('提掉被完全包围的单子', () => {
    let board = createBoard(5)
    board = put(board, 5, { x: 1, y: 1 }, WHITE)
    board = put(board, 5, { x: 1, y: 0 }, BLACK)
    board = put(board, 5, { x: 0, y: 1 }, BLACK)
    board = put(board, 5, { x: 2, y: 1 }, BLACK)
    const { board: after, captured } = placeStone(board, 5, { x: 1, y: 2 }, BLACK)
    expect(captured).toBe(1)
    expect(after[pointIndex(5, 1, 1)]).toBe(EMPTY)
  })

  it('提掉整块棋', () => {
    let board = createBoard(5)
    board = put(board, 5, { x: 1, y: 1 }, WHITE)
    board = put(board, 5, { x: 1, y: 2 }, WHITE)
    board = put(board, 5, { x: 1, y: 3 }, WHITE)
    board = put(board, 5, { x: 0, y: 1 }, BLACK)
    board = put(board, 5, { x: 0, y: 2 }, BLACK)
    board = put(board, 5, { x: 0, y: 3 }, BLACK)
    board = put(board, 5, { x: 1, y: 0 }, BLACK)
    board = put(board, 5, { x: 1, y: 4 }, BLACK)
    board = put(board, 5, { x: 2, y: 1 }, BLACK)
    board = put(board, 5, { x: 2, y: 3 }, BLACK)
    const { board: after, captured } = placeStone(board, 5, { x: 2, y: 2 }, BLACK)
    expect(captured).toBe(3)
    expect(after[pointIndex(5, 1, 1)]).toBe(EMPTY)
    expect(after[pointIndex(5, 1, 2)]).toBe(EMPTY)
    expect(after[pointIndex(5, 1, 3)]).toBe(EMPTY)
  })

  it('禁止自杀手', () => {
    let board = createBoard(5)
    board = put(board, 5, { x: 0, y: 1 }, WHITE)
    board = put(board, 5, { x: 1, y: 0 }, WHITE)
    board = put(board, 5, { x: 1, y: 2 }, WHITE)
    expect(isSuicide(board, 5, { x: 0, y: 0 }, BLACK)).toBe(true)
  })

  it('允许提子后自填的着法', () => {
    // 白方 1-1 单子仅剩一气在 (0,0)，黑方填 (0,0) 提子，自身仍有气
    let board = createBoard(5)
    board = put(board, 5, { x: 1, y: 1 }, WHITE)
    board = put(board, 5, { x: 0, y: 1 }, BLACK)
    board = put(board, 5, { x: 2, y: 1 }, BLACK)
    board = put(board, 5, { x: 1, y: 2 }, BLACK)
    expect(isSuicide(board, 5, { x: 0, y: 0 }, BLACK)).toBe(false)
  })

  it('findGroup 返回整块棋子与气', () => {
    let board = createBoard(9)
    board = put(board, 9, { x: 3, y: 3 }, BLACK)
    board = put(board, 9, { x: 4, y: 3 }, BLACK)
    const { stones, liberties } = findGroup(board, 9, { x: 3, y: 3 })
    expect(stones.size).toBe(2)
    expect(liberties.size).toBe(6)
  })

  it('removeGroup 清空整块棋', () => {
    let board = createBoard(9)
    board = put(board, 9, { x: 3, y: 3 }, BLACK)
    board = put(board, 9, { x: 4, y: 3 }, BLACK)
    const after = removeGroup(board, 9, { x: 3, y: 3 })
    expect(after[pointIndex(9, 3, 3)]).toBe(EMPTY)
    expect(after[pointIndex(9, 4, 3)]).toBe(EMPTY)
  })
})
