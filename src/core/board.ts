/**
 * 围棋棋盘数据模型：不可变更新、连通块、气与提子。
 * 创建者：zhenghq
 */

/** 空点。 */
export const EMPTY = 0
/** 黑棋。 */
export const BLACK = 1
/** 白棋。 */
export const WHITE = 2

/** 棋子颜色（黑/白）。 */
export type Player = typeof BLACK | typeof WHITE
/** 棋盘单元格取值（空/黑/白）。 */
export type Cell = typeof EMPTY | Player
/** 棋盘：一维扁平数组，索引为 y * size + x。 */
export type Board = Uint8Array
/** 棋盘坐标点。 */
export interface Point {
  x: number
  y: number
}

/** 四邻方向偏移。 */
const NEIGHBOR_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
]

/**
 * 创建空棋盘。
 * @param size 棋盘边长（路数）。
 * @returns 全空的棋盘数组。
 */
export function createBoard(size: number): Board {
  return new Uint8Array(size * size)
}

/**
 * 复制棋盘，保证状态不可变。
 * @param board 源棋盘。
 * @returns 棋盘副本。
 */
export function cloneBoard(board: Board): Board {
  return board.slice()
}

/**
 * 把二维坐标转换为扁平索引。
 * @param size 棋盘边长。
 * @param x 横坐标。
 * @param y 纵坐标。
 * @returns 一维数组下标。
 */
export function pointIndex(size: number, x: number, y: number): number {
  return y * size + x
}

/**
 * 把扁平索引还原为二维坐标。
 * @param size 棋盘边长。
 * @param index 一维下标。
 * @returns 坐标点。
 */
export function indexToPoint(size: number, index: number): Point {
  return { x: index % size, y: Math.floor(index / size) }
}

/**
 * 判断坐标是否在棋盘内。
 * @param size 棋盘边长。
 * @param x 横坐标。
 * @param y 纵坐标。
 * @returns 是否合法。
 */
export function isOnBoard(size: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < size && y < size
}

/**
 * 取得某个下标的所有合法邻点下标。
 * @param size 棋盘边长。
 * @param index 一维下标。
 * @returns 邻点下标数组。
 */
export function neighbors(size: number, index: number): number[] {
  const x = index % size
  const y = Math.floor(index / size)
  const result: number[] = []
  for (const [dx, dy] of NEIGHBOR_OFFSETS) {
    const nx = x + dx
    const ny = y + dy
    if (isOnBoard(size, nx, ny)) result.push(pointIndex(size, nx, ny))
  }
  return result
}

/**
 * 取相反颜色。
 * @param player 当前颜色。
 * @returns 对方颜色。
 */
export function opponent(player: Player): Player {
  return player === BLACK ? WHITE : BLACK
}

/**
 * 广度优先收集同色连通块与其全部气。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param point 块内任意一点。
 * @returns 棋子下标集合与气点下标集合。
 */
export function findGroup(
  board: Board,
  size: number,
  point: Point,
): { stones: Set<number>; liberties: Set<number> } {
  const start = pointIndex(size, point.x, point.y)
  const color = board[start]
  const stones = new Set<number>()
  const liberties = new Set<number>()
  if (color === EMPTY) return { stones, liberties }

  const stack: number[] = [start]
  stones.add(start)
  while (stack.length > 0) {
    const current = stack.pop() as number
    for (const next of neighbors(size, current)) {
      const value = board[next]
      if (value === EMPTY) {
        liberties.add(next)
      } else if (value === color && !stones.has(next)) {
        stones.add(next)
        stack.push(next)
      }
    }
  }
  return { stones, liberties }
}

/**
 * 统计某块棋的气数。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param point 块内任意一点。
 * @returns 气的数量；空点返回 0。
 */
export function countLiberties(board: Board, size: number, point: Point): number {
  return findGroup(board, size, point).liberties.size
}

/**
 * 清空一整块棋。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param point 块内任意一点。
 * @returns 清空该块后的新棋盘。
 */
export function removeGroup(board: Board, size: number, point: Point): Board {
  const next = cloneBoard(board)
  const { stones } = findGroup(board, size, point)
  for (const index of stones) next[index] = EMPTY
  return next
}

/**
 * 落子并自动提掉对方无气块（不校验自杀手，由调用方判断）。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param point 落子点。
 * @param player 落子方颜色。
 * @returns 新棋盘与被提子数量。
 */
export function placeStone(
  board: Board,
  size: number,
  point: Point,
  player: Player,
): { board: Board; captured: number } {
  const index = pointIndex(size, point.x, point.y)
  const next = cloneBoard(board)
  if (next[index] !== EMPTY) return { board: next, captured: 0 }

  next[index] = player
  const enemy = opponent(player)
  let captured = 0
  for (const neighbor of neighbors(size, index)) {
    if (next[neighbor] !== enemy) continue
    const group = findGroup(next, size, indexToPoint(size, neighbor))
    if (group.liberties.size === 0) {
      for (const stone of group.stones) next[stone] = EMPTY
      captured += group.stones.size
    }
  }
  return { board: next, captured }
}

/**
 * 判断某手是否为自杀手。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param point 落子点。
 * @param player 落子方颜色。
 * @returns 若落子后本方块无气且未提子则为 true。
 */
export function isSuicide(board: Board, size: number, point: Point, player: Player): boolean {
  const index = pointIndex(size, point.x, point.y)
  if (board[index] !== EMPTY) return false
  const { board: next, captured } = placeStone(board, size, point, player)
  if (captured > 0) return false
  return findGroup(next, size, point).liberties.size === 0
}

/**
 * 判断某手是否合法（空点且非自杀）。
 * @param board 棋盘。
 * @param size 棋盘边长。
 * @param point 落子点。
 * @param player 落子方颜色。
 * @returns 是否可落子。
 */
export function isLegalMove(board: Board, size: number, point: Point, player: Player): boolean {
  const index = pointIndex(size, point.x, point.y)
  if (index < 0 || index >= board.length) return false
  if (board[index] !== EMPTY) return false
  return !isSuicide(board, size, point, player)
}

/**
 * 统计棋盘上的棋子数量。
 * @param board 棋盘。
 * @param player 可选颜色；省略时统计全部棋子。
 * @returns 棋子数量。
 */
export function countStones(board: Board, player?: Player): number {
  let total = 0
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] !== EMPTY && (player === undefined || board[i] === player)) total += 1
  }
  return total
}

/**
 * 判断棋盘是否已满。
 * @param board 棋盘。
 * @returns 是否无空点。
 */
export function isFull(board: Board): boolean {
  return !board.includes(EMPTY)
}

/**
 * 生成棋盘的可读字符串键，用于劫争与置换表。
 * @param board 棋盘。
 * @returns 以颜色数字拼接的字符串。
 */
export function boardKey(board: Board): string {
  return board.join('')
}
