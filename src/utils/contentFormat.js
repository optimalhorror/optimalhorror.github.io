// Parse content from JSON format: "\nName=[content]" -> "content"
// For events, the format is "\nCurrent event=[content]"
export function parseContent(raw, name, type) {
  if (!raw) return '';

  // Events use "Current event" as the key, not the event name
  const key = type === 'event' ? 'Current event' : name;

  // Try to extract content from "\nKey=[...]" format
  const pattern = new RegExp(`^\\s*\\n?${escapeRegex(key)}\\s*=\\s*\\[(.*)\\]\\s*$`, 's');
  const match = raw.match(pattern);

  if (match) {
    return match[1];
  }

  // Also try without the name (just "[...]")
  const bracketMatch = raw.match(/^\s*\n?\[(.*)]\s*$/s);
  if (bracketMatch) {
    return bracketMatch[1];
  }

  // Return as-is if no pattern matched
  return raw;
}

// Format content for JSON: "content" -> "\nName=[content]"
// For events, the format is "\nCurrent event=[content]"
export function formatContent(content, name, type) {
  if (!content) return '';
  const key = type === 'event' ? 'Current event' : name;
  return `\n${key}=[${content}]`;
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
