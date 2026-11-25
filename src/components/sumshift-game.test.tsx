import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { SumshiftGame } from './sumshift-game'

it('uses the new target throughout play and keeps it when resetting', async () => {
  const user = userEvent.setup()
  const { container } = render(<SumshiftGame />)
  const button = (name: string) => screen.getByRole('button', { name })
  const target = () =>
    within(screen.getByRole('region', { name: 'Target sum' })).getByText(
      /^\d+$/,
    ).textContent
  const tiles = () =>
    Array.from(
      screen.getByRole('group', { name: /^Number tiles/ }).children,
      (tile) => tile.textContent,
    )

  const openingTarget = target()
  await user.click(button('Easy'))
  const easyTarget = target()
  const easyTiles = tiles()
  expect(easyTarget).not.toBe(openingTarget)

  await user.click(button('New puzzle'))
  const newTarget = target()
  const newTiles = tiles()
  expect(newTarget).not.toBe(easyTarget)
  expect(new Set(newTiles).size).toBe(16)
  expect(new Set(newTiles)).not.toEqual(new Set(easyTiles))
  expect(screen.getByText(/Slide the tiles until/)).toHaveTextContent(
    `adds up to ${newTarget}.`,
  )

  await user.click(button('How to play'))
  expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
    new RegExp(`add up to ${newTarget} at the same time`),
  )
  await user.click(button('Back to the puzzle'))

  await user.click(button('Shift row 1 left'))
  await user.click(button('Reset'))
  expect(target()).toBe(newTarget)
  expect(tiles()).toEqual(newTiles)

  for (
    let step = 0;
    step < 3 && !button('Hint').hasAttribute('disabled');
    step += 1
  ) {
    await user.click(button('Hint'))
    const hintedShift =
      container.querySelector<HTMLButtonElement>('button[data-hint]')!
    await user.click(hintedShift)
  }

  expect(screen.getByText(`Every line adds up to ${newTarget}.`)).toBeVisible()
  expect(screen.getByText(/lines on target/).parentElement).toHaveTextContent(
    '10 / 10',
  )
  expect(container.querySelectorAll('[data-balanced="true"]')).toHaveLength(12)

  await user.click(button('Play again'))
  expect(target()).not.toBe(newTarget)
  expect(new Set(tiles())).not.toEqual(new Set(newTiles))
})
