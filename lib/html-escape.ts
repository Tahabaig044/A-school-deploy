const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
}

const HTML_ESCAPE_REGEX = /[&<>"']/g

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value).replace(HTML_ESCAPE_REGEX, (char) => HTML_ESCAPE_MAP[char])
}
