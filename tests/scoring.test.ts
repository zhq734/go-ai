/**
 * 中国规则数子法终局判定测试。
 * 创建者：zhenghq
 */
import { describe, expect, it } from 'vitest'
import { BLACK, EMPTY, WHITE, createBoard, placeStone, pointIndex } from '@/core/board'
import { scoreChinese } from '@/core/scoring'

/** 落子并返回新棋盘的测试辅助函数。 */
function put(board: ReturnType<typeof createBoard>, size: number, point: { x: number; y: number }, player: 1 | 2) {
  return placeStone(board, size, point, player).board
}

describe('scoreChinese', () => {
  it('空棋盘归黑（贴目后黑落后）', () => {
    const result = scoreChinese(createBoard(9), 9, 7.5)
    // 空盘没有任何被围住的空点，全部为中性点。
    expect(result.black).toBe(0)
    expect(result.white).toBeCloseTo(7.5)
    expect(result.neutral).toBe(81)
    expect(result.winner).toBe(WHITE)
  })

  it('黑占中央全部空点为黑地', () => {
    let board = createBoard(9)
    board = put(board, 9, { x: 4, y: 4 }, BLACK)
    const result = scoreChinese(board, 9, 7.5)
    // 黑 1 子 + 80 空点；白 0 子 + 贴目
    expect(result.black).toBe(81)
    expect(result.white).toBe(7.5)
    expect(result.winner).toBe(BLACK)
  })

  it('白子包围的黑空点计给黑方', () => {
    let board = createBoard(5)
    // 黑子 (0,0)，其余空点都与它相连，故全归黑
    board = put(board, 5, { x: 0, y: 0 }, BLACK)
    const result = scoreChinese(board, 5, 0)
    expect(result.black).toBe(25)
    expect(result.white).toBe(0)
  })

  it('双方各自围空', () => {
    let board = createBoard(5)
    // 黑竖线 x=1、白竖线 x=3，中间一列为双方共有中性点。
    for (let y = 0; y < 5; y += 1) {
      board = put(board, 5, { x: 1, y }, BLACK)
      board = put(board, 5, { x: 3, y }, WHITE)
    }
    const result = scoreChinese(board, 5, 0)
    expect(result.blackTerritory).toBe(5)
    expect(result.whiteTerritory).toBe(5)
    expect(result.neutral).toBe(5)
    expect(result.black).toBe(10)
    expect(result.white).toBe(10)
    expect(result.winner).toBe('D')
  })

  it('单子独占全盘时归该方', () => {
    let board = createBoard(3)
    board = put(board, 3, { x: 1, y: 1 }, BLACK)
    const result = scoreChinese(board, 3, 8)
    expect(result.black).toBe(9)
    expect(result.white).toBe(8)
    expect(result.winner).toBe(BLACK)
    expect(board[pointIndex(3, 1, 1)]).toBe(BLACK)
    expect(board.filter((p) => p === EMPTY).length).toBe(8)
  })
})
