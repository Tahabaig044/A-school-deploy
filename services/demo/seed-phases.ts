/**
 * Pure sequencing for the seed: phase weights, progress arithmetic, and resume
 * indexing.
 *
 * Split out from `seed-runner.ts` for the same reason `lifecycle.ts` is separate from
 * `transition.ts`: `seed-runner.ts` imports `@/lib/prisma`, which builds a `pg` Pool
 * at module load and throws when `DATABASE_URL` is unset. Keeping the arithmetic here
 * means the rules about how far a run has got can be tested without a database.
 */

/** One step of the seed. Phases run in the order given. */
export type SeedPhase<TContext> = {
  /** Stable identifier, stored in `DemoTenant.seedStep` so a resume knows where it stopped. */
  name: string
  /** Share of total progress this phase represents, e.g. 0.2. Need not sum to 1. */
  weight: number
  /**
   * A phase that reaches outside the database, such as creating Supabase Auth users.
   *
   * These are excluded from the default run by `scripts/demo-seed.ts` and invoked
   * deliberately, because they need a service-role key and they are the only phase
   * whose effects cannot be rolled back by dropping rows. A phase must opt in here
   * rather than the runner guessing, so that adding one is a visible act.
   */
  runsOutOfBand?: boolean
  run: (context: TContext) => Promise<void>
}

/** The phases a plain run should execute: everything not marked out of band. */
export function inBandPhases<TContext>(
  phases: readonly SeedPhase<TContext>[],
): readonly SeedPhase<TContext>[] {
  return phases.filter((phase) => !phase.runsOutOfBand)
}

/** The phases that need explicit invocation, e.g. persona provisioning. */
export function outOfBandPhases<TContext>(
  phases: readonly SeedPhase<TContext>[],
): readonly SeedPhase<TContext>[] {
  return phases.filter((phase) => phase.runsOutOfBand)
}

/**
 * `seedProgress` once `completedCount` phases have finished and the current phase is
 * `phaseProgress` percent of the way through.
 *
 * Returns a value in 0..100. Weights are normalised, so a phase list summing to 8
 * behaves identically to one summing to 1 — the alternative is a progress bar that
 * silently stops at 40% because someone renumbered the weights.
 */
export function progressAfter(
  weights: readonly number[],
  completedCount: number,
  phaseProgress: number,
): number {
  if (weights.length === 0) return 100

  const total = weights.reduce((sum, weight) => sum + weight, 0)
  if (total <= 0) return 100

  const completedWeight = weights.slice(0, completedCount).reduce((sum, weight) => sum + weight, 0)

  const currentWeight = weights[completedCount] ?? 0
  const within = clampPercent(phaseProgress) / 100

  return Math.min(100, Math.round(((completedWeight + currentWeight * within) / total) * 100))
}

/** Clamps a reported phase progress into 0..100, treating nonsense as 0. */
function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, value))
}

/**
 * Where to resume from, given the last recorded `seedStep`.
 *
 * `seedStep` holds the phase that was *running*, not the last one that finished, so
 * the returned index points at the interrupted phase and it runs again. An
 * unrecognised step restarts from the beginning, because resuming at a position that
 * no longer exists in the phase list would skip work that never happened.
 */
export function resumeIndex<TContext>(
  phases: readonly SeedPhase<TContext>[],
  lastStep: string | null,
): number {
  if (!lastStep) return 0

  const index = phases.findIndex((phase) => phase.name === lastStep)
  if (index === -1) return 0

  return index
}
