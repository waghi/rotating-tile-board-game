import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Check,
  CircleHelp,
  LayoutGrid,
  Lightbulb,
  MoveHorizontal,
  RotateCcw,
  Shuffle,
  Sparkles,
  Undo2,
} from 'lucide-react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  createOpeningPuzzle,
  createPuzzle,
  DIFFICULTIES,
  formatNumber,
  getHint,
  LINE_COUNT,
  LINE_INDICES,
  moveLabel,
  playMove,
  resetPuzzle,
  SIZE,
  tally,
  undoMove,
} from '@/lib/sumshift'
import type { Board, Difficulty, Move } from '@/lib/sumshift'

type Totals = ReturnType<typeof tally>

const TRACK_SEGMENTS = Array.from({ length: LINE_COUNT }, (_, index) => index)

function ShiftButton({
  move,
  placement,
  hint,
  disabled,
  onMove,
}: {
  move: Move
  placement: CSSProperties
  hint: Move | null
  disabled: boolean
  onMove: (move: Move) => void
}) {
  const Icon =
    move.axis === 'row'
      ? move.direction === -1 ? ArrowLeft : ArrowRight
      : move.direction === -1 ? ArrowUp : ArrowDown
  const highlighted =
    hint?.axis === move.axis && hint.line === move.line && hint.direction === move.direction

  return (
    <button
      className="shift-control"
      type="button"
      style={placement}
      data-hint={highlighted ? '' : undefined}
      disabled={disabled}
      aria-label={moveLabel(move)}
      title={moveLabel(move)}
      onClick={() => onMove(move)}
    >
      <Icon aria-hidden="true" />
    </button>
  )
}

function LineTotal({
  value,
  target,
  label,
  placement,
}: {
  value: number
  target: number
  label: string
  placement?: CSSProperties
}) {
  return (
    <span className="line-total" data-balanced={value === target} style={placement}>
      <span className="sr-only">{label}: </span>
      {formatNumber(value)}
      {value === target && <span className="sr-only">, on target</span>}
    </span>
  )
}

function TileBoard({
  board,
  target,
  totals,
  motion,
  hint,
  solved,
  onMove,
}: {
  board: Board
  target: number
  totals: Totals
  motion: Move | null
  hint: Move | null
  solved: boolean
  onMove: (move: Move) => void
}) {
  const gesture = useRef<{ pointer: number; index: number; x: number; y: number } | null>(null)

  function beginSwipe(event: PointerEvent<HTMLDivElement>) {
    if (solved || !event.isPrimary || event.button !== 0) return
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-tile-index]')
    if (!target) return

    gesture.current = {
      pointer: event.pointerId,
      index: Number(target.dataset.tileIndex),
      x: event.clientX,
      y: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current
    if (!start || start.pointer !== event.pointerId) return
    gesture.current = null

    const horizontal = event.clientX - start.x
    const vertical = event.clientY - start.y
    if (Math.max(Math.abs(horizontal), Math.abs(vertical)) < 24) return

    if (Math.abs(horizontal) > Math.abs(vertical)) {
      onMove({ axis: 'row', line: Math.floor(start.index / SIZE), direction: horizontal > 0 ? 1 : -1 })
    } else {
      onMove({ axis: 'column', line: start.index % SIZE, direction: vertical > 0 ? 1 : -1 })
    }
  }

  return (
    <div className="board-stage">
      <div className="board-matrix">
        <div
          className="tile-grid"
          role="group"
          aria-label="Number tiles, read left to right by row"
          data-moving={motion ? '' : undefined}
          data-solved={solved ? '' : undefined}
          onPointerDown={beginSwipe}
          onPointerUp={finishSwipe}
          onLostPointerCapture={() => { gesture.current = null }}
        >
          {board.map((value, index) => {
            const row = Math.floor(index / SIZE)
            const column = index % SIZE
            const wrapsTo = motion?.direction === 1 ? 0 : SIZE - 1
            const wraps = motion?.axis === 'row'
              ? row === motion.line && column === wrapsTo
              : motion?.axis === 'column' && column === motion.line && row === wrapsTo
            const hinted = hint && (hint.axis === 'row' ? hint.line === row : hint.line === column)

            return (
              <div
                className="number-tile"
                key={value}
                data-tile-index={index}
                data-negative={value < 0 ? '' : undefined}
                data-hinted={hinted ? '' : undefined}
                data-wrap={wraps ? motion?.axis : undefined}
                style={{ '--column': column, '--row': row, '--direction': motion?.direction } as CSSProperties}
              >
                {formatNumber(value)}
              </div>
            )
          })}
        </div>

        {LINE_INDICES.map((line) => (
          <ShiftButton
            key={`up-${line}`}
            move={{ axis: 'column', line, direction: -1 }}
            placement={{ gridColumn: line + 2, gridRow: 1 }}
            hint={hint}
            disabled={solved}
            onMove={onMove}
          />
        ))}
        <span className="sum-label" style={{ gridColumn: 7, gridRow: 1 }} aria-hidden="true">Σ</span>

        {LINE_INDICES.map((line) => (
          <div className="board-line" key={`row-${line}`}>
            <ShiftButton
              move={{ axis: 'row', line, direction: -1 }}
              placement={{ gridColumn: 1, gridRow: line + 2 }}
              hint={hint}
              disabled={solved}
              onMove={onMove}
            />
            <ShiftButton
              move={{ axis: 'row', line, direction: 1 }}
              placement={{ gridColumn: 6, gridRow: line + 2 }}
              hint={hint}
              disabled={solved}
              onMove={onMove}
            />
            <LineTotal
              value={totals.rows[line]}
              target={target}
              label={`Row ${line + 1} total`}
              placement={{ gridColumn: 7, gridRow: line + 2 }}
            />
          </div>
        ))}

        {LINE_INDICES.map((line) => (
          <div className="board-line" key={`column-${line}`}>
            <ShiftButton
              move={{ axis: 'column', line, direction: 1 }}
              placement={{ gridColumn: line + 2, gridRow: 6 }}
              hint={hint}
              disabled={solved}
              onMove={onMove}
            />
            <LineTotal
              value={totals.columns[line]}
              target={target}
              label={`Column ${line + 1} total`}
              placement={{ gridColumn: line + 2, gridRow: 7 }}
            />
          </div>
        ))}
        <span className="sum-label" style={{ gridColumn: 1, gridRow: 7 }} aria-hidden="true">Σ</span>
      </div>
    </div>
  )
}

function HelpDialog({ target }: { target: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="help-button" type="button"><CircleHelp aria-hidden="true" /> How to play</button>
      </DialogTrigger>
      <DialogContent className="sumshift-dialog">
        <div className="eyebrow"><LayoutGrid aria-hidden="true" /> The rules</div>
        <DialogTitle className="help-title">How to play</DialogTitle>
        <DialogDescription className="help-description">
          Make a magic square: every row, column, and both diagonals must add up
          to {formatNumber(target)} at the same time. Each new puzzle has a
          different target and a new set of tiles.
        </DialogDescription>
        <ol className="help-steps">
          <li><span>01</span><div><strong>Shift a line.</strong> Press an arrow or swipe a tile to slide its whole row or column one space.</div></li>
          <li><span>02</span><div><strong>Watch the edges.</strong> The tile that slides off one side wraps around to the other.</div></li>
          <li><span>03</span><div><strong>Match the totals.</strong> Check row sums on the right, column sums below, and both diagonal sums next to their direction arrows.</div></li>
        </ol>
        <DialogClose asChild>
          <button type="button" className="primary-button"><Check aria-hidden="true" /> Back to the puzzle</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

function TargetIllustration() {
  return (
    <svg className="target-illustration" viewBox="0 0 128 128" fill="none" aria-hidden="true">
      <g transform="rotate(-13 64 64)">
        <rect x="22" y="22" width="84" height="84" rx="9" fill="#2e281c" stroke="#886c40" />
        <path d="M43 23v82m21-82v82m21-82v82M23 43h82M23 64h82M23 85h82" stroke="#6d5736" />
        <path d="M23 43h82v21H23z" fill="#f6ca79" fillOpacity=".15" />
        <path d="m32 32 64 64" stroke="#e6b967" strokeDasharray="2 5" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="47" y="47" width="13" height="13" rx="3" fill="#f6ca79" />
        <rect x="68" y="47" width="13" height="13" rx="3" fill="#bd944e" />
        <rect x="68" y="68" width="13" height="13" rx="3" fill="#9f7d46" />
        <rect x="89" y="47" width="13" height="13" rx="3" fill="#896b3b" />
      </g>
      <path d="M110 14v12m-6-6h12M12 94v8m-4-4h8" stroke="#f6ca79" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="108" cy="109" r="2" fill="#9f7d46" />
    </svg>
  )
}

function DiagonalTotals({ values, target }: { values: number[]; target: number }) {
  return (
    <div className="diagonal-list">
      <div className="diagonal-line">
        <span><ArrowDownRight aria-hidden="true" /> Main diagonal</span>
        <LineTotal label="Main diagonal total" value={values[0]} target={target} />
      </div>
      <div className="diagonal-line">
        <span><ArrowUpRight aria-hidden="true" /> Other diagonal</span>
        <LineTotal label="Other diagonal total" value={values[1]} target={target} />
      </div>
    </div>
  )
}

export function SumshiftGame() {
  const [game, setGame] = useState(createOpeningPuzzle)
  const [showHint, setShowHint] = useState(false)
  const totals = tally(game.position.board, game.target)
  const targetLabel = formatNumber(game.target)
  const solved = totals.matched === LINE_COUNT
  const hint = showHint && !solved ? getHint(game) : null

  function shift(move: Move) {
    setGame((current) => playMove(current, move))
    setShowHint(false)
  }

  function undo() {
    setGame(undoMove)
    setShowHint(false)
  }

  function reset() {
    setGame(resetPuzzle)
    setShowHint(false)
  }

  function newPuzzle(difficulty: Difficulty) {
    setGame(createPuzzle(difficulty, game.target))
    setShowHint(false)
  }

  return (
    <div className="sumshift-shell">
      <header className="site-header">
        <div className="site-width header-inner">
          <div className="wordmark"><img src="/sumshift.svg" alt="" width="36" height="36" /> sumshift<span>.</span></div>
          <HelpDialog target={game.target} />
        </div>
      </header>

      <main className="site-width game-main">
        <section className="game-intro" aria-labelledby="game-title">
          <div className="eyebrow intro-eyebrow"><span /> The magic square puzzle</div>
          <h1 id="game-title">Make it add up<span>.</span></h1>
          <p>
            Slide the tiles until every row, column, and diagonal adds up to{' '}
            <strong>{targetLabel}</strong>.
          </p>
        </section>

        <div className="game-layout">
          <section className="game-panel board-panel" aria-labelledby="board-title">
            <div className="board-heading">
              <h2 id="board-title">Puzzle board</h2>
              <span className="board-tag"><LayoutGrid aria-hidden="true" /> {SIZE} × {SIZE} grid</span>
            </div>
            <div className="board-field">
              <TileBoard
                board={game.position.board}
                target={game.target}
                totals={totals}
                motion={game.motion}
                hint={hint}
                solved={solved}
                onMove={shift}
              />
              <div className="mobile-diagonals">
                <DiagonalTotals values={totals.diagonals} target={game.target} />
              </div>
              <p className="board-guide" role="status" data-hint={hint ? '' : undefined}>
                {hint ? <Lightbulb aria-hidden="true" /> : solved ? <Check aria-hidden="true" /> : <MoveHorizontal aria-hidden="true" />}
                {hint
                  ? `Try this: ${moveLabel(hint).toLowerCase()}.`
                  : solved
                    ? `Every line adds up to ${targetLabel}.`
                    : 'Use the arrows or swipe. Tiles wrap at the edges.'}
              </p>
            </div>
            <div className="board-toolbar">
              <button type="button" className="action-button" onClick={undo} disabled={!game.turn}><Undo2 aria-hidden="true" /> Undo</button>
              <button type="button" className="action-button" onClick={reset} disabled={!game.turn}><RotateCcw aria-hidden="true" /> Reset</button>
              <button type="button" className="action-button hint-button" onClick={() => setShowHint(!showHint)} disabled={solved} aria-pressed={showHint}><Lightbulb aria-hidden="true" /> Hint</button>
            </div>
          </section>

          <aside className="game-sidebar" aria-label="Puzzle stats and options">
            <section className="game-panel target-panel" aria-labelledby="target-title">
              <TargetIllustration />
              <h2 className="eyebrow" id="target-title">Target sum</h2>
              <div className="target-number" aria-live="polite">
                {targetLabel}
              </div>
              <p>The number every line must reach.</p>
            </section>

            <section className="game-panel tracker-panel" aria-labelledby="tracker-title">
              <div className="tracker-heading">
                <h2 id="tracker-title">Line tracker</h2>
                <span className="tracker-score" aria-live="polite"><strong>{totals.matched}</strong> / {LINE_COUNT}<span className="sr-only"> lines on target</span></span>
              </div>
              <div className="tracker-segments" aria-hidden="true">
                {TRACK_SEGMENTS.map((segment) => <span key={segment} data-filled={segment < totals.matched} />)}
              </div>
              <div className="sidebar-diagonals">
                <DiagonalTotals values={totals.diagonals} target={game.target} />
              </div>
            </section>

            <section className="game-panel settings-panel" aria-label="Moves and difficulty">
              <div className="moves-tracker">
                <h2>Moves</h2>
                <span>{String(game.moves).padStart(2, '0')}</span>
              </div>
              <div className="difficulty-label" id="difficulty-label">Difficulty</div>
              <div className="difficulty-controls" role="group" aria-labelledby="difficulty-label">
                {DIFFICULTIES.map(({ name }) => (
                  <button key={name} type="button" aria-pressed={name === game.difficulty} onClick={() => { if (name !== game.difficulty) newPuzzle(name) }}>{name}</button>
                ))}
              </div>
            </section>

            {solved && (
              <div className="win-note" role="status">
                <Sparkles aria-hidden="true" />
                <div><strong>Perfect balance!</strong><p>All {LINE_COUNT} lines matched in {game.moves} {game.moves === 1 ? 'move' : 'moves'}.</p></div>
              </div>
            )}
            <button type="button" className="primary-button new-puzzle-button" onClick={() => newPuzzle(game.difficulty)}><Shuffle aria-hidden="true" /> {solved ? 'Play again' : 'New puzzle'}</button>
          </aside>
        </div>

        <footer className="game-footer">
          <span>SUMSHIFT <span className="footer-dot">/</span> MAGIC SQUARE</span>
          <span>{SIZE * SIZE} tiles. {LINE_COUNT} lines. One target.</span>
        </footer>
      </main>
    </div>
  )
}
