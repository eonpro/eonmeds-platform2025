export function getHashtagType(tag: string): string {
  const lowerTag = tag.toLowerCase();
  
  // Specific hashtag mappings
  if (lowerTag === 'weightloss' || lowerTag === 'weight loss') {
    return 'weightloss';
  }
  if (lowerTag === 'webdirect' || lowerTag === 'web direct') {
    return 'webdirect';
  }
  if (lowerTag === 'laurazevallo' || lowerTag === 'laurazevallos' || lowerTag === 'laura zevallos') {
    return 'laurazevallo';
  }
  if (lowerTag === 'anasaavedra' || lowerTag === 'ana saavedra') {
    return 'anasaavedra';
  }
  if (lowerTag === 'internalrep' || lowerTag === 'internal rep') {
    return 'internalrep';
  }
  if (lowerTag === 'trt' || lowerTag === 'testosterone') {
    return 'trt';
  }
  if (lowerTag === 'peptides' || lowerTag === 'peptide') {
    return 'peptides';
  }
  if (lowerTag === 'hrt' || lowerTag === 'hormone replacement') {
    return 'hrt';
  }
  
  // Default for unknown tags
  return 'default';
}

export function getHashtagColor(tag: string): string {
  const type = getHashtagType(tag);
  
  const colorMap: { [key: string]: string } = {
    'weightloss': '#f97316', // Orange
    'webdirect': '#3b82f6',  // Blue
    'laurazevallo': '#a855f7', // Purple
    'anasaavedra': '#ec4899',  // Pink
    'internalrep': '#10b981',  // Green
    'trt': '#f59e0b',         // Amber
    'peptides': '#06b6d4',    // Cyan
    'hrt': '#8b5cf6',         // Violet
    'default': '#6b7280'      // Gray
  };
  
  return colorMap[type] || colorMap['default'];
}
