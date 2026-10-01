/**
 * AI Worker 封装：请求配对、超时保护与生命周期管理。
 * 创建者：zhenghq
 */
import { onBeforeUnmount, ref } from 'vue'
import type { SearchResult } from '@/core/ai'
import type { Board, Difficulty, Player, Point } from '@/core/types'
import type { GoRequest, GoResponse } from '@/workers/go.worker'

/** AI 思考请求参数。 */
export interface ThinkParams {
  board: Board
  size: number
  player: Player
  difficulty: Difficulty
  koPoint: Point | null
}

/**
 * 创建并管理 AI Worker。
 * @returns 思考方法、运行状态与最近一次搜索统计。
 */
export function useGoWorker() {
  const thinking = ref(false)
  const lastStats = ref<SearchResult['stats'] | null>(null)
  const error = ref<string | null>(null)

  let worker: Worker | null = null
  let seq = 0
  let pending: {
    id: number
    resolve: (result: SearchResult | null) => void
    reject: (error: Error) => void
  } | null = null

  /**
   * 惰性创建 Worker。
   * @returns Worker 实例；环境不支持时返回 null。
   */
  function ensureWorker(): Worker | null {
    if (worker) return worker
    if (typeof Worker === 'undefined') return null
    try {
      worker = new Worker(new URL('../workers/go.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (event: MessageEvent<GoResponse>) => {
        const { requestId, result, error: workerError } = event.data
        if (!pending || pending.id !== requestId) return
        const { resolve, reject } = pending
        pending = null
        thinking.value = false
        if (workerError) {
          error.value = workerError
          reject(new Error(workerError))
          return
        }
        if (result) lastStats.value = result.stats
        resolve(result)
      }
      worker.onerror = (event) => {
        const { reject } = pending ?? {}
        pending = null
        thinking.value = false
        error.value = event.message || 'AI 线程异常'
        reject?.(new Error(error.value))
      }
      return worker
    } catch {
      worker = null
      return null
    }
  }

  /**
   * 请求 AI 计算下一步。
   * @param params 局面与难度参数。
   * @returns 搜索结果；Worker 不可用或出错时返回 null。
   */
  function think(params: ThinkParams): Promise<SearchResult | null> {
    error.value = null
    const instance = ensureWorker()
    if (!instance) return Promise.resolve(null)

    // 丢弃过期请求，保证同一时间只有一个搜索任务。
    pending = null
    thinking.value = true
    seq += 1
    const requestId = seq
    const message: GoRequest = { requestId, seed: (Date.now() ^ (seq * 2654435761)) >>> 0, ...params }

    return new Promise<SearchResult | null>((resolve, reject) => {
      pending = { id: requestId, resolve, reject }
      instance.postMessage(message)
    }).catch(() => null)
  }

  /** 取消当前请求（不销毁线程，便于复用）。 */
  function cancel(): void {
    pending = null
    thinking.value = false
  }

  onBeforeUnmount(() => {
    cancel()
    worker?.terminate()
    worker = null
  })

  return { thinking, lastStats, error, think, cancel }
}
