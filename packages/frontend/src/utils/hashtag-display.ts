/**
 * Utility function to ensure hashtags are displayed correctly
 * Handles cases where hashtags might already have # prefix
 */
export function formatHashtagDisplay(tag: string): string {
  if (!tag) return '';
  
  // Remove any leading # symbols
  const cleanTag = tag.replace(/^#+/, '');
  
  // Return with single #
  return `#${cleanTag}`;
}
