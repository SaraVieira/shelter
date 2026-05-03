export const MARKER = "<!-- coverage-tracker-comment -->";

export function findPreviousComment(
  comments: { body?: string }[]
): { body?: string } | undefined {
  return comments.find((c) => c.body?.includes(MARKER));
}
