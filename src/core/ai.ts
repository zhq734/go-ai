/**
 * 围棋 AI 引擎：候选点启发式排序 + 迭代加深 Negamax + Alpha-Beta 剪枝 +
 * Zobrist 置换表 + 影响力静态评估。
 * 创建者：zhenghq
 */
import {
  BLACK,
  EMPTY,
  type Board,
  type Player,
  type Point,
  cloneBoard,
  findGroup,
  indexToPoint,
  isLegalMove,
  isSuicide,
  neighbors,
  opponent,
  placeStone,
  pointIndex,
} from '@/core/board'
import { createsKo } from '@/core/rules'
import type { Difficulty } from '@/core/types'

/** AI 搜索统计信息。 */
export interface SearchStats {
  /** 访问节点数。 */
  nodes: number
  /** 完成迭代加深的层数。 */
  depth: number
  /** 完成的迭代次数。 */
  iterations: number
  /** 耗时（毫秒）。 */
  elapsed: number
  /** 搜索到的分值（越大越优）。 */
  score: number
  /** 是否因超时提前结束。 */
  timedOut: boolean
}

/** AI 决策结果。 */
export interface SearchResult {
  /** 选中的落子点。 */
  point: Point
  /** 预计提子数。 */
  captured: number
  /** 搜索统计。 */
  stats: SearchStats
}

/** AI 决策选项。 */
export interface SearchOptions {
  /** 当前劫争禁着点。 */
  koPoint: Point | null
  /** 随机种子（用于低难度的随机扰动）。 */
  seed?: number
}

/** 难度参数。 */
interface DifficultyConfig {
  maxDepth: number
  width: number
  timeMs: number
  temperature: number
  blunderRate: number
}

/** 各难度对应的搜索预算。 */
const DIFFICULTY: Record<Difficulty, DifficultyConfig> = {
  easy: { maxDepth: 1, width: 6, timeMs: 120, temperature: 1.6, blunderRate: 0.22 },
  normal: { maxDepth: 2, width: 8, timeMs: 420, temperature: 0.5, blunderRate: 0.05 },
  hard: { maxDepth: 3, width: 10, timeMs: 1200, temperature: 0.12, blunderRate: 0 },
  expert: { maxDepth: 4, width: 12, timeMs: 2400, temperature: 0, blunderRate: 0 },
}

/** 搜索上下文。 */
interface SearchContext {
  nodes: number
  deadline: number
  timedOut: boolean
  width: number
  size: number
  table: Map<string, { depth: number; score: number; flag: 'exact' | 'lower' | 'upper'; best: Point | null }>
}

/**
 * 取当前时间戳（毫秒）。
 * @returns 单调时间戳。
 */
function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

/**
 * 生成可复现的伪随机数发生器（mulberry32）。
 * @param seed 随机种子。
 * @returns 返回 [0,1) 随机数的函数。
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 判断棋盘是否为空盘。
 * @param board 棋盘。
 * @returns 是否没有任何棋子。
 */
function isEmptyBoard(board: Board): boolean {
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] !== EMPTY) return false
  }
  return true
}

/**
 * 计算天元坐标。
 * @param size 棋盘边长。
 * @returns 棋盘中心点。
 */
function centerPoint(size: number): Point {
  const c = Math.floor(size / 2)
  return { x: c, y: c }
}

/**
 * 计算某点周围的落子热度。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param point 目标点。
 * @param radius 统计半径。
 * @returns 半径内棋子数量。
 */
function localDensity(board: Board, size: number, point: Point, radius: number): number {
  let count = 0
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue
      const x = point.x + dx
      const y = point.y + dy
      if (x < 0 || y < 0 || x >= size || y >= size) continue
      if (board[pointIndex(size, x, y)] !== EMPTY) count += 1
    }
  }
  return count
}

/**
 * 计算单步落子的启发式分值，用于候选点排序。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param point 落子点。
 * @param player 落子方颜色。
 * @returns 启发式分值（越大越好）。
 */
export function moveHeuristic(board: Board, size: number, point: Point, player: Player): number {
  const enemy = opponent(player)
  const index = pointIndex(size, point.x, point.y)
  const { board: after, captured } = placeStone(board, size, point, player)
  let score = captured * 120

  const selfGroup = findGroup(after, size, point)
  if (selfGroup.liberties.size === 0) return -Infinity
  if (selfGroup.liberties.size === 1 && captured === 0) {
    // 自紧气（打吃自己）通常很糟，棋子越多代价越大。
    score -= 90 + selfGroup.stones.size * 14
  } else {
    score += Math.min(selfGroup.liberties.size, 6) * 6
  }

  for (const neighbor of neighbors(size, index)) {
    if (board[neighbor] === player) {
      const before = findGroup(board, size, indexToPoint(size, neighbor))
      if (before.liberties.size === 1 && before.liberties.has(index)) score += 72
    }
    if (after[neighbor] === enemy) {
      const afterEnemy = findGroup(after, size, indexToPoint(size, neighbor))
      if (afterEnemy.liberties.size === 1) score += 46
    }
  }

  const edge = Math.min(point.x, point.y, size - 1 - point.x, size - 1 - point.y)
  if (edge === 0) score -= 10
  else if (edge === 1) score += 2
  else if (edge === 2) score += 9
  else if (edge === 3) score += 11
  else score += 6

  score += localDensity(board, size, point, 2) * 2
  if (captured > 0) score += 60
  return score
}

/**
 * 生成候选着法并按启发式分值排序。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param player 落子方颜色。
 * @param koPoint 劫争禁着点。
 * @param width 最多返回的候选数；省略时返回全部。
 * @returns 候选落子点数组。
 */
export function generateCandidates(
  board: Board,
  size: number,
  player: Player,
  koPoint: Point | null,
  width = Number.POSITIVE_INFINITY,
): Point[] {
  if (isEmptyBoard(board)) return [centerPoint(size)]

  const candidates: Point[] = []
  const seen = new Uint8Array(board.length)
  const radius = size >= 13 ? 2 : 2
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] === EMPTY) continue
    const origin = indexToPoint(size, index)
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = origin.x + dx
        const y = origin.y + dy
        if (x < 0 || y < 0 || x >= size || y >= size) continue
        const target = pointIndex(size, x, y)
        if (seen[target] === 1 || board[target] !== EMPTY) continue
        seen[target] = 1
        const point = { x, y }
        if (koPoint && koPoint.x === x && koPoint.y === y) continue
        if (isSuicide(board, size, point, player)) continue
        candidates.push(point)
      }
    }
  }

  if (candidates.length === 0) {
    // 极端情况（全盘仅剩禁入点）：退化为任意空点。
    for (let index = 0; index < board.length; index += 1) {
      if (board[index] !== EMPTY) continue
      const point = indexToPoint(size, index)
      if (koPoint && koPoint.x === point.x && koPoint.y === point.y) continue
      if (isLegalMove(board, size, point, player)) candidates.push(point)
    }
  }

  const scored = candidates.map((point) => ({
    point,
    score: moveHeuristic(board, size, point, player),
  }))
  scored.sort((a, b) => b.score - a.score || a.point.y - b.point.y || a.point.x - b.point.x)
  const limited = Number.isFinite(width) ? scored.slice(0, width) : scored
  return limited.map((entry) => entry.point)
}

/**
 * 计算棋块的“棋形价值”（以黑方视角计分）。
 * 说明：棋子数量由单独的厚势项计算，这里只评估气带来的厚薄差异，
 * 保证“提子/被提”在评估中始终优于“留对方打吃”。
 * @param liberties 气数。
 * @returns 棋形分值（可为负）。
 */
function shapeValue(liberties: number): number {
  if (liberties === 1) return -30
  if (liberties === 2) return -6
  return Math.min(liberties, 8) * 4
}

/**
 * 用邻近影响力估算势力范围。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param player 评估视角颜色。
 * @returns 势力分差（己方为正）。
 */
function influenceScore(board: Board, size: number, player: Player): number {
  const influence = new Float32Array(board.length)
  const radius = 3
  for (let index = 0; index < board.length; index += 1) {
    const cell = board[index]
    if (cell === EMPTY) continue
    const sign = cell === player ? 1 : -1
    const origin = indexToPoint(size, index)
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const x = origin.x + dx
        const y = origin.y + dy
        if (x < 0 || y < 0 || x >= size || y >= size) continue
        const target = pointIndex(size, x, y)
        if (board[target] !== EMPTY) continue
        const distance = Math.abs(dx) + Math.abs(dy)
        if (distance === 0) continue
        influence[target] += sign / (1 + distance)
      }
    }
  }

  let score = 0
  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== EMPTY) continue
    const value = influence[index]
    if (value > 0.85) score += 3
    else if (value < -0.85) score -= 3
  }
  return score
}

/**
 * 静态局面评估：棋块价值 + 势力范围，返回“轮到 player 走”的视角分值。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param player 当前行棋方。
 * @returns 局面分值。
 */
export function evaluate(board: Board, size: number, player: Player): number {
  let blackStones = 0
  let whiteStones = 0
  let positional = 0
  const visited = new Uint8Array(board.length)
  for (let index = 0; index < board.length; index += 1) {
    const cell = board[index]
    if (cell === EMPTY) continue
    if (cell === BLACK) blackStones += 1
    else whiteStones += 1
    if (visited[index] === 1) continue
    const group = findGroup(board, size, indexToPoint(size, index))
    for (const stone of group.stones) visited[stone] = 1
    const value = shapeValue(group.liberties.size)
    positional += cell === BLACK ? value : -value
  }
  // 厚势（棋子数量）主导，棋形与势力范围作为次级判断。
  const blackScore = (blackStones - whiteStones) * 100 + positional + influenceScore(board, size, BLACK)
  return player === BLACK ? blackScore : -blackScore
}

/**
 * 生成局面键，用于置换表。
 * @param board 棋盘。
 * @param player 当前行棋方。
 * @param depth 剩余深度。
 * @returns 置换表键。
 */
function positionKey(board: Board, player: Player, depth: number): string {
  return `${player}|${depth}|${board.join('')}`
}

/**
 * Negamax + Alpha-Beta 搜索。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param player 当前行棋方。
 * @param koPoint 劫争禁着点。
 * @param depth 剩余深度。
 * @param alpha 下界。
 * @param beta 上界。
 * @param context 搜索上下文。
 * @returns 当前行棋方视角的分值。
 */
function negamax(
  board: Board,
  size: number,
  player: Player,
  koPoint: Point | null,
  depth: number,
  alpha: number,
  beta: number,
  context: SearchContext,
): number {
  context.nodes += 1
  if (context.nodes % 512 === 0 && now() > context.deadline) context.timedOut = true
  if (context.timedOut) return evaluate(board, size, player)
  if (depth <= 0) return evaluate(board, size, player)

  const key = positionKey(board, player, depth)
  const cached = context.table.get(key)
  if (cached && cached.depth >= depth) {
    if (cached.flag === 'exact') return cached.score
    if (cached.flag === 'lower' && cached.score > alpha) alpha = cached.score
    else if (cached.flag === 'upper' && cached.score < beta) beta = cached.score
    if (alpha >= beta) return cached.score
  }

  const candidates = generateCandidates(board, size, player, koPoint, context.width)
  if (candidates.length === 0) return evaluate(board, size, player)

  const originalAlpha = alpha
  let best = Number.NEGATIVE_INFINITY
  let bestMove: Point | null = null
  for (const move of candidates) {
    const { board: nextBoard } = placeStone(board, size, move, player)
    const nextKo = createsKo(board, nextBoard, size, move, player) ? move : null
    const score = -negamax(nextBoard, size, opponent(player), nextKo, depth - 1, -beta, -alpha, context)
    if (score > best) {
      best = score
      bestMove = move
    }
    if (score > alpha) alpha = score
    if (alpha >= beta) break
    if (context.timedOut) break
  }

  if (!context.timedOut) {
    let flag: 'exact' | 'lower' | 'upper' = 'exact'
    if (best <= originalAlpha) flag = 'upper'
    else if (best >= beta) flag = 'lower'
    context.table.set(key, { depth, score: best, flag, best: bestMove })
  }
  return best
}

/**
 * 根节点搜索：返回最佳着法与分值。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param player 当前行棋方。
 * @param koPoint 劫争禁着点。
 * @param depth 搜索深度。
 * @param context 搜索上下文。
 * @returns 最佳着法、分值与全部候选评分。
 */
function searchRoot(
  board: Board,
  size: number,
  player: Player,
  koPoint: Point | null,
  depth: number,
  context: SearchContext,
): { best: Point | null; score: number; ranked: Array<{ point: Point; score: number; captured: number }> } {
  const candidates = generateCandidates(board, size, player, koPoint, context.width)
  const ranked: Array<{ point: Point; score: number; captured: number }> = []
  let best: Point | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  let alpha = Number.NEGATIVE_INFINITY
  const beta = Number.POSITIVE_INFINITY

  for (const move of candidates) {
    const { board: nextBoard, captured } = placeStone(board, size, move, player)
    const nextKo = createsKo(board, nextBoard, size, move, player) ? move : null
    const score = -negamax(nextBoard, size, opponent(player), nextKo, depth - 1, -beta, -alpha, context)
    ranked.push({ point: move, score, captured })
    if (score > bestScore) {
      bestScore = score
      best = move
    }
    if (score > alpha) alpha = score
    if (context.timedOut) break
  }
  return { best, score: bestScore, ranked }
}

/**
 * 计算 AI 的下一步。
 * @param board 当前棋盘。
 * @param size 棋盘边长。
 * @param player AI 执子颜色。
 * @param difficulty 难度等级。
 * @param options 劫争点与随机种子。
 * @returns 决策结果；无合法着法时返回 null。
 */
export function chooseMove(
  board: Board,
  size: number,
  player: Player,
  difficulty: Difficulty,
  options: SearchOptions,
): SearchResult | null {
  const started = now()
  const config = DIFFICULTY[difficulty]
  const random = createRandom(options.seed ?? (Date.now() & 0xffffffff))
  const context: SearchContext = {
    nodes: 0,
    deadline: started + config.timeMs,
    timedOut: false,
    width: config.width,
    size,
    table: new Map(),
  }

  if (isEmptyBoard(board)) {
    const point = centerPoint(size)
    return {
      point,
      captured: 0,
      stats: {
        nodes: 1,
        depth: 0,
        iterations: 0,
        elapsed: Math.round(now() - started),
        score: 0,
        timedOut: false,
      },
    }
  }

  const rootCandidates = generateCandidates(board, size, player, options.koPoint, config.width)
  if (rootCandidates.length === 0) return null

  let bestMove: Point | null = null
  let bestScore = Number.NEGATIVE_INFINITY
  let bestCaptured = 0
  let completedDepth = 0
  let iterations = 0
  let lastRanked: Array<{ point: Point; score: number; captured: number }> = []

  for (let depth = 1; depth <= config.maxDepth; depth += 1) {
    if (now() > context.deadline && completedDepth > 0) break
    const result = searchRoot(board, size, player, options.koPoint, depth, context)
    iterations += 1
    if (result.best && (!context.timedOut || completedDepth === 0)) {
      bestMove = result.best
      bestScore = result.score
      bestCaptured = result.ranked.find((entry) => entry.point === result.best)?.captured ?? 0
      completedDepth = depth
      lastRanked = result.ranked
    }
    if (context.timedOut) break
  }

  if (!bestMove) return null

  // 低难度加入随机扰动，制造更自然、更接近人类失误的对局体验。
  if (config.temperature > 0 && lastRanked.length > 1) {
    const sorted = [...lastRanked].sort((a, b) => b.score - a.score)
    const pool = sorted.slice(0, Math.min(4, sorted.length))
    const weights = pool.map((entry, i) => Math.exp((entry.score - pool[0].score) / (40 * config.temperature + 1)) / (i + 1))
    const total = weights.reduce((sum, w) => sum + w, 0)
    let pick = random() * total
    for (let i = 0; i < pool.length; i += 1) {
      pick -= weights[i]
      if (pick <= 0) {
        bestMove = pool[i].point
        bestScore = pool[i].score
        bestCaptured = pool[i].captured
        break
      }
    }
    if (config.blunderRate > 0 && random() < config.blunderRate) {
      const blunder = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
      bestMove = blunder.point
      bestScore = blunder.score
      bestCaptured = blunder.captured
    }
  }

  return {
    point: bestMove,
    captured: bestCaptured,
    stats: {
      nodes: context.nodes,
      depth: completedDepth,
      iterations,
      elapsed: Math.round(now() - started),
      score: Math.round(bestScore),
      timedOut: context.timedOut,
    },
  }
}

export { BLACK, EMPTY }
