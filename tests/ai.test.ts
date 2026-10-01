/**
 * 围棋 AI 决策测试：提子、救子、合法性与搜索统计。
 * 创建者：zhenghq
 */
import { describe, expect, it } from 'vitest'
import { BLACK, WHITE, createBoard, isLegalMove, placeStone, pointIndex } from '@/core/board'
import { chooseMove, generateCandidates } from '@/core/ai'
import type { Difficulty } from '@/core/types'

/** 落子并返回新棋盘的测试辅助函数。 */
function put(board: ReturnType<typeof createBoard>, size: number, point: { x: number; y: number }, player: 1 | 2) {
  return placeStone(board, size, point, player).board
}

const LEVELS: Difficulty[] = ['easy', 'normal', 'hard', 'expert']

describe('ai', () => {
  it('候选点为空且都合法', () => {
    let board = createBoard(9)
    board = put(board, 9, { x: 4, y: 4 }, BLACK)
    const candidates = generateCandidates(board, 9, WHITE, null)
    expect(candidates.length).toBeGreaterThan(0)
    for (const move of candidates) {
      expect(isLegalMove(board, 9, move, WHITE)).toBe(true)
    }
  })

  it('空棋盘时选择天元附近', () => {
    const board = createBoard(9)
    const result = chooseMove(board, 9, BLACK, 'normal', { koPoint: null, seed: 1 })
    expect(result).not.toBeNull()
    expect(result?.point).toEqual({ x: 4, y: 4 })
  })

  it('能提掉对方只剩一气的子', () => {
    let board = createBoard(5)
    board = put(board, 5, { x: 1, y: 1 }, WHITE)
    board = put(board, 5, { x: 0, y: 1 }, BLACK)
    board = put(board, 5, { x: 2, y: 1 }, BLACK)
    board = put(board, 5, { x: 1, y: 2 }, BLACK)
    const result = chooseMove(board, 5, BLACK, 'hard', { koPoint: null, seed: 7 })
    expect(result?.point).toEqual({ x: 1, y: 0 })
    expect(result?.captured).toBe(1)
  })

  it('能救出自己只剩一气的棋', () => {
    let board = createBoard(5)
    board = put(board, 5, { x: 2, y: 2 }, BLACK)
    board = put(board, 5, { x: 1, y: 2 }, WHITE)
    board = put(board, 5, { x: 3, y: 2 }, WHITE)
    board = put(board, 5, { x: 2, y: 1 }, WHITE)
    const result = chooseMove(board, 5, BLACK, 'hard', { koPoint: null, seed: 3 })
    expect(result?.point).toEqual({ x: 2, y: 3 })
  })

  it('不会选择打劫禁着点', () => {
    let board = createBoard(5)
    board = put(board, 5, { x: 0, y: 1 }, BLACK)
    board = put(board, 5, { x: 2, y: 1 }, BLACK)
    board = put(board, 5, { x: 1, y: 0 }, BLACK)
    board = put(board, 5, { x: 1, y: 2 }, WHITE)
    board = put(board, 5, { x: 2, y: 2 }, WHITE)
    board = put(board, 5, { x: 2, y: 0 }, WHITE)
    board = put(board, 5, { x: 3, y: 1 }, WHITE)
    const koPoint = { x: 1, y: 1 }
    const result = chooseMove(board, 5, WHITE, 'normal', { koPoint, seed: 5 })
    expect(result).not.toBeNull()
    expect(result?.point).not.toEqual(koPoint)
  })

  it('不同难度返回合法着法与搜索统计', () => {
    let board = createBoard(9)
    board = put(board, 9, { x: 4, y: 4 }, BLACK)
    board = put(board, 9, { x: 5, y: 5 }, WHITE)
    for (const level of LEVELS) {
      const result = chooseMove(board, 9, BLACK, level, { koPoint: null, seed: 11 })
      expect(result).not.toBeNull()
      expect(isLegalMove(board, 9, result!.point, BLACK)).toBe(true)
      expect(result!.stats.nodes).toBeGreaterThan(0)
      expect(result!.stats.iterations).toBeGreaterThan(0)
    }
  })

  it('棋盘下满时返回 null', () => {
    const board = createBoard(2)
    board[pointIndex(2, 0, 0)] = BLACK
    board[pointIndex(2, 0, 1)] = WHITE
    board[pointIndex(2, 1, 0)] = WHITE
    board[pointIndex(2, 1, 1)] = BLACK
    expect(chooseMove(board, 2, BLACK, 'normal', { koPoint: null, seed: 1 })).toBeNull()
  })
})
