// STUB (WP39 worktree only): the WP36 track builds this file from the same
// shared contract; this copy exists so the worktree typechecks alone and is
// replaced at merge. In-memory singleton, never storage: nothing is stored
// before LOOKS RIGHT.
export interface OnboardAnswers {
  q1: string | null;
  q1f: string | null;
  q2: string[];
  q2extra: string | null;
  q2f: string[];
  q2fextra: string | null;
  q3: string | null;
  q4: string | null;
  q5: string[];
}

let held: OnboardAnswers | null = null;

export function saveOnboardAnswers(a: OnboardAnswers): void {
  held = a;
}

export function takeOnboardAnswers(): OnboardAnswers | null {
  const a = held;
  held = null;
  return a;
}
