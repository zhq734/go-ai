/**
 * 终局结果摘要测试：胜负文案、比分展示与情绪配色。
 * 创建者：zhenghq
 */
import { describe, expect, it } from 'vitest'
import { BLACK, WHITE } from '@/core/board'
import { createGame, finishGame, passMove, resignGame } from '@/core/game'
import { summarizeResult, type ResultContext, type ResultSummary } from '@/core/result'

/**
 * 调用摘要函数并断言非空，便于测试中直接取字段。
 * @param state 对局状态。
 * @param context 对局上下文。
 * @returns 非空的终局摘要。
 */
function summarize(state: Parameters<typeof summarizeResult>[0], context: ResultContext): ResultSummary {
  const summary = summarizeResult(state, context)
  if (!summary) throw new Error('终局摘要不应为空')
  return summary
}

/** 人机模式：人类执黑。 */
const AI_BLACK: ResultContext = { mode: 'ai', humanColor: BLACK }
/** 人机模式：人类执白。 */
const AI_WHITE: ResultContext = { mode: 'ai', humanColor: WHITE }
/** 双人对弈模式。 */
const PVP: ResultContext = { mode: 'pvp', humanColor: BLACK }

/**
 * 构造一盘黑棋占据全盘、白棋仅剩一子的终局。
 * @returns 数子终局后的状态。
 */
function blackSweepState() {
  const base = createGame(9)
  const board = base.board.slice()
  board.fill(BLACK)
  board[0] = WHITE
  return finishGame({ ...base, board }, 'score')
}

describe('summarizeResult', () => {
  it('对方认输时给出胜利弹窗文案', () => {
    const state = resignGame(createGame(9), WHITE).state
    const summary = summarize(state, AI_BLACK)
    expect(summary.tone).toBe('win')
    expect(summary.title).toBe('你赢了！')
    expect(summary.reason).toBe('AI 中盘认输')
    expect(summary.eyebrow).toBe('对局结束')
  })

  it('自己认输时给出失败弹窗文案', () => {
    const state = resignGame(createGame(9), BLACK).state
    const summary = summarize(state, AI_BLACK)
    expect(summary.tone).toBe('lose')
    expect(summary.title).toBe('你输了')
    expect(summary.reason).toBe('你中盘认输')
  })

  it('人类执白时黑棋数子获胜判为失败', () => {
    const summary = summarize(blackSweepState(), AI_WHITE)
    expect(summary.tone).toBe('lose')
    expect(summary.title).toBe('你输了')
    expect(summary.reason).toContain('数子')
  })

  it('人类执黑时数子获胜判为胜利', () => {
    const summary = summarize(blackSweepState(), AI_BLACK)
    expect(summary.tone).toBe('win')
    expect(summary.title).toBe('你赢了！')
    expect(summary.stats.some((item) => item.label === '黑棋' && item.highlight === true)).toBe(true)
  })

  it('双人模式给出胜方颜色而非人称', () => {
    const summary = summarize(blackSweepState(), PVP)
    expect(summary.title).toBe('黑棋胜')
    expect(summary.tone).toBe('win')
  })

  it('双方同分时判为和棋', () => {
    const state = finishGame(createGame(9, 0), 'score')
    const summary = summarize(state, PVP)
    expect(summary.tone).toBe('draw')
    expect(summary.title).toBe('和棋')
  })

  it('数子终局展示双方比分、贴目与手数', () => {
    const state = passMove(passMove(createGame(9)).state).state
    const summary = summarize(state, PVP)
    const labels = summary.stats.map((item) => item.label)
    expect(labels).toContain('黑棋')
    expect(labels).toContain('白棋')
    expect(labels).toContain('贴目')
    expect(labels).toContain('手数')
    expect(summary.stats.find((item) => item.label === '贴目')?.value).toBe('7.5')
  })

  it('认输终局不展示比分而展示手数与提子', () => {
    const state = resignGame(createGame(9), WHITE).state
    const summary = summarize(state, AI_BLACK)
    const labels = summary.stats.map((item) => item.label)
    expect(labels).not.toContain('贴目')
    expect(labels).toContain('手数')
    expect(summary.footnote).toContain('认输')
  })
})
