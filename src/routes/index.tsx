import { createFileRoute } from '@tanstack/react-router'

import { SumshiftGame } from '@/components/sumshift-game'

export const Route = createFileRoute('/')({
  component: SumshiftGame,
})
