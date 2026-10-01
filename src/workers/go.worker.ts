/**
 * AI 计算 Web Worker：把围棋搜索放到后台线程，保持界面流畅。
 * 创建者：zhenghq
 */
import { chooseMove, type SearchResult } from '@/core/ai'
import type { Board, Difficulty, Player, Point } from '@/core/types'

/** Worker 请求消息。 */
export interface GoRequest {
  requestId: number
  board: Board
  size: number
  player: Player
  difficulty: Difficulty
  koPoint: Point | null
  seed: number
}

/** Worker 响应消息。 */
export interface GoResponse {
  requestId: number
  result: SearchResult | null
  error?: string
}

self.onmessage = (event: MessageEvent<GoRequest>) => {
  const { requestId, board, size, player, difficulty, koPoint, seed } = event.data
  try {
    const result = chooseMove(board, size, player, difficulty, { koPoint, seed })
    const response: GoResponse = { requestId, result }
    ;(self as unknown as Worker).postMessage(response)
  } catch (error) {
    const response: GoResponse = {
      requestId,
      result: null,
      error: error instanceof Error ? error.message : 'AI 计算失败',
    }
    ;(self as unknown as Worker).postMessage(response)
  }
}
