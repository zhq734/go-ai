/**
 * 终局结果摘要：把对局状态翻译成可直接渲染的弹窗文案、比分与情绪配色。
 * 创建者：zhenghq
 */
import { BLACK, WHITE, type Player } from '@/core/board'
import { playerName } from '@/core/game'
import type { GameState } from '@/core/types'

/** 结果情绪：胜利、失败、和棋。 */
export type ResultTone = 'win' | 'lose' | 'draw'

/** 弹窗中的一项数据。 */
export interface ResultStat {
  /** 数据名称。 */
  label: string
  /** 数据取值（已格式化）。 */
  value: string
  /** 是否为高亮项（通常是胜方）。 */
  highlight?: boolean
}

/** 终局弹窗摘要。 */
export interface ResultSummary {
  /** 顶部小标题。 */
  eyebrow: string
  /** 主标题，例如“你赢了！”。 */
  title: string
  /** 副标题，说明胜负原因与差距。 */
  reason: string
  /** 底部补充说明。 */
  footnote: string
  /** 情绪配色，用于弹窗强调色。 */
  tone: ResultTone
  /** 比分、贴目、手数等数据项。 */
  stats: ResultStat[]
}

/** 计算摘要所需的对局上下文。 */
export interface ResultContext {
  /** 对局模式：人机对战 / 本地双人。 */
  mode: 'ai' | 'pvp'
  /** 人类玩家执子颜色（双人模式下仅用于占位）。 */
  humanColor: Player
}

/**
 * 把终局状态整理成弹窗摘要。
 * @param state 已结束的对局状态。
 * @param context 对局模式与人类执子颜色。
 * @returns 弹窗摘要；未结束时返回 null。
 */
export function summarizeResult(state: GameState, context: ResultContext): ResultSummary | null {
  if (state.status !== 'scored' || state.winner === null) return null
  const winner = state.winner
  const isAiMode = context.mode === 'ai'
  const humanWon = winner !== 'D' && winner === context.humanColor
  const tone: ResultTone = winner === 'D' ? 'draw' : isAiMode ? (humanWon ? 'win' : 'lose') : 'win'
  const title = buildTitle(winner, isAiMode, humanWon)
  const reason = buildReason(state, winner, isAiMode, humanWon)
  const footnote =
    state.endReason === 'resign'
      ? '本局因中盘认输结束，不计入数子比分。'
      : `中国规则数子法，白方贴目 ${state.komi} 目。`
  return {
    eyebrow: '对局结束',
    title,
    reason,
    footnote,
    tone,
    stats: buildStats(state, winner),
  }
}

/**
 * 生成主标题。
 * @param winner 胜方颜色或和棋标记。
 * @param isAiMode 是否为人机对战。
 * @param humanWon 人类是否获胜。
 * @returns 主标题文案。
 */
function buildTitle(winner: Player | 'D', isAiMode: boolean, humanWon: boolean): string {
  if (winner === 'D') return '和棋'
  if (!isAiMode) return `${playerName(winner)}胜`
  return humanWon ? '你赢了！' : '你输了'
}

/**
 * 生成胜负原因说明。
 * @param state 对局状态。
 * @param winner 胜方颜色或和棋标记。
 * @param isAiMode 是否为人机对战。
 * @param humanWon 人类是否获胜。
 * @returns 副标题文案。
 */
function buildReason(state: GameState, winner: Player | 'D', isAiMode: boolean, humanWon: boolean): string {
  if (state.endReason === 'resign') {
    if (winner === 'D') return '双方中盘认输'
    const loser: Player = winner === BLACK ? WHITE : BLACK
    if (!isAiMode) return `${playerName(loser)}中盘认输`
    return humanWon ? 'AI 中盘认输' : '你中盘认输'
  }
  if (winner === 'D') return '数子终局，双方同分'
  const score = state.score
  const margin = score ? Math.abs(score.black - score.white) : 0
  const winnerText = isAiMode ? (humanWon ? '你' : 'AI') : playerName(winner)
  return `数子终局，${winnerText}胜 ${margin.toFixed(1)} 子`
}

/**
 * 生成弹窗数据项。
 * @param state 对局状态。
 * @param winner 胜方颜色或和棋标记。
 * @returns 数据项列表。
 */
function buildStats(state: GameState, winner: Player | 'D'): ResultStat[] {
  const highlight = (player: Player): boolean => winner === player
  if (state.endReason === 'resign' || !state.score) {
    return [
      { label: '手数', value: String(state.moves.length) },
      { label: '黑棋提子', value: String(state.captures.black) },
      { label: '白棋提子', value: String(state.captures.white) },
    ]
  }
  return [
    { label: '黑棋', value: state.score.black.toFixed(1), highlight: highlight(BLACK) },
    { label: '白棋', value: state.score.white.toFixed(1), highlight: highlight(WHITE) },
    { label: '贴目', value: String(state.komi) },
    { label: '手数', value: String(state.moves.length) },
  ]
}
