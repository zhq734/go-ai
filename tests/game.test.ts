/**
 * 对局流程测试：落子、停一手终局、认输、悔棋与非法着法提示。
 * 创建者：zhenghq
 */
import { describe, expect, it } from 'vitest'
import { BLACK, WHITE } from '@/core/board'
import { createGame, formatPoint, passMove, playMove, resignGame, undoMove } from '@/core/game'

describe('game', () => {
  it('黑先落子后轮到白方', () => {
    const state = createGame(9)
    const result = playMove(state, { x: 4, y: 4 })
    expect(result.error).toBeUndefined()
    expect(result.state.currentPlayer).toBe(WHITE)
    expect(result.state.moves).toHaveLength(1)
  })

  it('重复落子返回错误且不改变状态', () => {
    const state = playMove(createGame(9), { x: 4, y: 4 }).state
    const result = playMove(state, { x: 4, y: 4 })
    expect(result.error).toBe('该点已有棋子')
    expect(result.state).toBe(state)
  })

  it('越界落子被拒绝', () => {
    const state = createGame(9)
    expect(playMove(state, { x: 9, y: 0 }).error).toBe('落子超出棋盘范围')
  })

  it('连续两次停一手进入数子终局', () => {
    const first = passMove(createGame(9))
    expect(first.state.status).toBe('playing')
    const second = passMove(first.state)
    expect(second.state.status).toBe('scored')
    expect(second.state.score).not.toBeNull()
  })

  it('认输判对方获胜', () => {
    const result = resignGame(createGame(9), BLACK)
    expect(result.state.status).toBe('scored')
    expect(result.state.winner).toBe(WHITE)
    expect(result.state.endReason).toBe('resign')
  })

  it('悔棋回到上一手之前', () => {
    const first = playMove(createGame(9), { x: 4, y: 4 }).state
    const second = playMove(first, { x: 3, y: 3 }).state
    const back = undoMove(second)
    expect(back.moves).toHaveLength(1)
    expect(back.currentPlayer).toBe(WHITE)
    expect(undoMove(back).moves).toHaveLength(0)
  })

  it('坐标格式化跳过 I 并自下而上编号', () => {
    // 棋盘坐标 (3,3) 在 9 路盘为第 4 列、自下往上第 6 行。
    expect(formatPoint({ x: 3, y: 3 }, 9)).toBe('D6')
    expect(formatPoint({ x: 8, y: 0 }, 9)).toBe('J9')
    expect(formatPoint(null, 9)).toBe('停一手')
  })
})
