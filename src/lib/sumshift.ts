export const SIZE = 4
export const OPENING_TARGET = 20
export const LINE_COUNT = SIZE * 2 + 2
export const LINE_INDICES = Array.from({ length: SIZE }, (_, index) => index)

export const DIFFICULTIES = [
  { name: 'Easy', shifts: 3 },
  { name: 'Classic', shifts: 6 },
  { name: 'Hard', shifts: 12 },
] as const

export type Difficulty = (typeof DIFFICULTIES)[number]['name']
export type Board = readonly number[]
export type Move = Readonly<{
  axis: 'row' | 'column'
  line: number
  direction: -1 | 1
}>

type Position = {
  board: Board
  link: { parent: Position; move: Move } | null
}

type Turn = {
  position: Position
  move: Move
  previous: Turn | null
}

type Puzzle = {
  difficulty: Difficulty
  target: number
  initial: Position
  position: Position
  turn: Turn | null
  moves: number
  motion: Move | null
}

export const SOLUTION: Board = [13, -2, -1, 10, 1, 8, 7, 4, 6, 3, 2, 9, 0, 11, 12, -3]

const SOLVED_POSITION: Position = { board: SOLUTION, link: null }
const TILE_OFFSETS = Array.from({ length: 16 }, (_, index) => index - 3)

const OPENING_MOVES: readonly Move[] = [
  { axis: 'row', line: 0, direction: 1 },
  { axis: 'row', line: 2, direction: -1 },
  { axis: 'column', line: 1, direction: 1 },
  { axis: 'column', line: 3, direction: -1 },
  { axis: 'row', line: 1, direction: 1 },
  { axis: 'row', line: 3, direction: 1 },
]

const LEGAL_MOVES: Move[] = (['row', 'column'] as const).flatMap((axis) =>
  LINE_INDICES.flatMap((line) =>
    ([-1, 1] as const).map((direction) => ({ axis, line, direction })),
  ),
)

export function shiftLine(board: Board, move: Move): Board {
  const next = [...board]
  const indexAt = (offset: number) =>
    move.axis === 'row' ? move.line * SIZE + offset : offset * SIZE + move.line

  for (const offset of LINE_INDICES) {
    const destination = (offset + move.direction + SIZE) % SIZE
    next[indexAt(destination)] = board[indexAt(offset)]
  }

  return next
}

function reverseMove(move: Move): Move {
  return { ...move, direction: move.direction === 1 ? -1 : 1 }
}

export function tally(board: Board, target: number) {
  const sum = (line: number[]) => line.reduce((total, value) => total + value, 0)
  const rows = LINE_INDICES.map((row) =>
    sum(LINE_INDICES.map((column) => board[row * SIZE + column])),
  )
  const columns = LINE_INDICES.map((column) =>
    sum(LINE_INDICES.map((row) => board[row * SIZE + column])),
  )
  const diagonals = [
    sum(LINE_INDICES.map((index) => board[index * SIZE + index])),
    sum(LINE_INDICES.map((index) => board[index * SIZE + SIZE - 1 - index])),
  ]

  return {
    rows,
    columns,
    diagonals,
    matched: [...rows, ...columns, ...diagonals].filter(
      (value) => value === target,
    ).length,
  }
}

function advance(position: Position, move: Move): Position {
  const board = shiftLine(position.board, move)

  for (let past: Position | null = position; past; past = past.link?.parent ?? null) {
    if (past.board.every((value, index) => value === board[index])) return past
  }

  return { board, link: { parent: position, move } }
}

function startPuzzle(
  difficulty: Difficulty,
  target: number,
  initial: Position,
): Puzzle {
  return {
    difficulty,
    target,
    initial,
    position: initial,
    turn: null,
    moves: 0,
    motion: null,
  }
}

export function createOpeningPuzzle(): Puzzle {
  return startPuzzle(
    'Classic',
    OPENING_TARGET,
    OPENING_MOVES.reduce(advance, SOLVED_POSITION),
  )
}

export function createPuzzle(
  difficulty: Difficulty,
  previousTarget: number,
): Puzzle {
  const offsets = TILE_OFFSETS.filter(
    (offset) => OPENING_TARGET + offset * SIZE !== previousTarget,
  )
  const offset = offsets[Math.floor(Math.random() * offsets.length)]
  const target = OPENING_TARGET + offset * SIZE
  const shifts = DIFFICULTIES.find((option) => option.name === difficulty)!.shifts
  let position: Position = {
    board: SOLUTION.map((value) => value + offset),
    link: null,
  }

  for (let step = 0; step < shifts; step += 1) {
    const candidates = LEGAL_MOVES.map((move) => advance(position, move)).filter(
      (next) =>
        next.link?.parent === position &&
        (step < shifts - 1 || tally(next.board, target).matched !== LINE_COUNT),
    )
    if (candidates.length === 0) break
    position = candidates[Math.floor(Math.random() * candidates.length)]
  }

  if (tally(position.board, target).matched === LINE_COUNT) {
    return createPuzzle(difficulty, previousTarget)
  }

  return startPuzzle(difficulty, target, position)
}

export function playMove(puzzle: Puzzle, move: Move): Puzzle {
  if (tally(puzzle.position.board, puzzle.target).matched === LINE_COUNT) {
    return puzzle
  }

  return {
    ...puzzle,
    position: advance(puzzle.position, move),
    turn: { position: puzzle.position, move, previous: puzzle.turn },
    moves: puzzle.moves + 1,
    motion: move,
  }
}

export function undoMove(puzzle: Puzzle): Puzzle {
  if (!puzzle.turn) return puzzle

  return {
    ...puzzle,
    position: puzzle.turn.position,
    turn: puzzle.turn.previous,
    moves: puzzle.moves - 1,
    motion: reverseMove(puzzle.turn.move),
  }
}

export function resetPuzzle(puzzle: Puzzle): Puzzle {
  return startPuzzle(puzzle.difficulty, puzzle.target, puzzle.initial)
}

export function getHint(puzzle: Puzzle): Move | null {
  return puzzle.position.link ? reverseMove(puzzle.position.link.move) : null
}

export function moveLabel(move: Move): string {
  const direction =
    move.axis === 'row'
      ? move.direction === 1 ? 'right' : 'left'
      : move.direction === 1 ? 'down' : 'up'

  return `Shift ${move.axis} ${move.line + 1} ${direction}`
}

export function formatNumber(value: number): string {
  return String(value).replace('-', '−')
}
