/**
 * AI 自我对弈冒烟测试：连续数十手不产生非法状态，且能正常进入终局或达到手数上限。
 * 创建者：zhenghq
 */
import { describe, expect, it } from 'vitest'
import { chooseMove } from '@/core/ai'
import { BLACK, EMPTY } from '@/core/board'
import { createGame, passMove, playMove } from '@/core/game'

describe('selfplay', () => {
  it('9 路自我对弈 40 手保持合法', () => {
    let state = createGame(9)
    for (let i = 0; i < 40 && state.status === 'playing'; i += 1) {
      const player = state.currentPlayer
      const result = chooseMove(state.board, state.size, player, 'easy', { koPoint: state.koPoint, seed: i + 1 })
      if (!result) {
        state = passMove(state).state
        continue
      }
      const applied = playMove(state, result.point)
      expect(applied.error).toBeUndefined()
      expect(applied.state.board[result.point.y * state.size + result.point.x]).not.toBe(EMPTY)
      state = applied.state
    }
    expect(state.moves.length).toBeGreaterThanOrEqual(10)
    expect(state.board.includes(BLACK)).toBe(true)
  })
})
