import { describe, expect, it, vi } from 'vitest'
import {
  createOpeningPuzzle,
  createPuzzle,
  DIFFICULTIES,
  getHint,
  LINE_COUNT,
  OPENING_TARGET,
  playMove,
  resetPuzzle,
  shiftLine,
  SOLUTION,
  tally,
  undoMove,
} from './sumshift'

describe('Sumshift', () => {
  it('uses 16 unique integers and checks both diagonals alongside the rows and columns', () => {
    expect(new Set(SOLUTION).size).toBe(16)
    expect(SOLUTION.every(Number.isInteger)).toBe(true)
    const lineTargets = Array(4).fill(OPENING_TARGET)
    expect(tally(SOLUTION, OPENING_TARGET)).toEqual({
      rows: lineTargets,
      columns: lineTargets,
      diagonals: [OPENING_TARGET, OPENING_TARGET],
      matched: LINE_COUNT,
    })

    const oppositeRows = [
      ...SOLUTION.slice(4, 8),
      ...SOLUTION.slice(0, 4),
      ...SOLUTION.slice(8),
    ]
    const totals = tally(oppositeRows, OPENING_TARGET)
    expect(totals.rows).toEqual(lineTargets)
    expect(totals.columns).toEqual(lineTargets)
    expect(totals.matched).toBeLessThan(LINE_COUNT)
  })

  it('wraps both axes without changing the tile set', () => {
    const row = shiftLine(SOLUTION, { axis: 'row', line: 0, direction: 1 })
    expect(row.slice(0, 4)).toEqual([10, 13, -2, -1])
    expect(row.slice(4)).toEqual(SOLUTION.slice(4))

    const column = shiftLine(SOLUTION, {
      axis: 'column',
      line: 3,
      direction: -1,
    })
    expect([column[3], column[7], column[11], column[15]]).toEqual([
      4, 9, -3, 10,
    ])
    expect(new Set(column)).toEqual(new Set(SOLUTION))
  })

  it('restores the previous board with Undo and the opening board with Reset', () => {
    const initial = createOpeningPuzzle()
    const first = playMove(initial, { axis: 'row', line: 0, direction: -1 })
    const second = playMove(first, { axis: 'column', line: 2, direction: 1 })

    expect(second.moves).toBe(2)
    expect(undoMove(second).position.board).toEqual(first.position.board)
    expect(undoMove(second).moves).toBe(1)
    expect(resetPuzzle(second)).toEqual(initial)
  })

  it('changes the target and tile set even when the random draw repeats', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const opening = createOpeningPuzzle()
      const first = createPuzzle('Classic', opening.target)
      const second = createPuzzle('Classic', first.target)

      expect(first.target).not.toBe(opening.target)
      expect(second.target).not.toBe(first.target)
      expect(new Set(first.position.board)).not.toEqual(
        new Set(opening.position.board),
      )
      expect(new Set(second.position.board)).not.toEqual(
        new Set(first.position.board),
      )
    } finally {
      random.mockRestore()
    }
  })

  it.each(DIFFICULTIES)(
    'starts $name with unique integers and reaches its new target through hints',
    ({ name, shifts }) => {
      const initial = createPuzzle(name, OPENING_TARGET)
      const { target } = initial
      const tiles = new Set(initial.position.board)

      expect(tiles.size).toBe(16)
      expect(initial.position.board.every(Number.isInteger)).toBe(true)
      expect(target).not.toBe(OPENING_TARGET)
      expect(tally(initial.position.board, target).matched).toBeLessThan(
        LINE_COUNT,
      )

      const extraMove = { axis: 'row', line: 0, direction: -1 } as const
      let puzzle = playMove(initial, extraMove)
      expect(resetPuzzle(puzzle)).toEqual(initial)
      for (let step = 0; step <= shifts; step += 1) {
        if (tally(puzzle.position.board, target).matched === LINE_COUNT) break
        const hint = getHint(puzzle)
        expect(hint).not.toBeNull()
        if (hint) puzzle = playMove(puzzle, hint)
      }

      expect(new Set(puzzle.position.board)).toEqual(tiles)
      expect(tally(puzzle.position.board, target)).toEqual({
        rows: [target, target, target, target],
        columns: [target, target, target, target],
        diagonals: [target, target],
        matched: LINE_COUNT,
      })
      expect(playMove(puzzle, extraMove)).toBe(puzzle)
    },
  )
})
