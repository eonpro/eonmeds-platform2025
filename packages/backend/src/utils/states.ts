// State name to abbreviation mapping
export const stateAbbreviations: { [key: string]: string } = {
  // Full state names
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
  'washington dc': 'DC',
  'washington d.c.': 'DC',

  // Spanish state names (common ones)
  'nueva york': 'NY',
  'nueva jersey': 'NJ',
  'nuevo mexico': 'NM',
  'carolina del norte': 'NC',
  'carolina del sur': 'SC',
  'dakota del norte': 'ND',
  'dakota del sur': 'SD',
  'virginia occidental': 'WV',

  // Common variations
  calif: 'CA',
  'calif.': 'CA',
  mass: 'MA',
  'mass.': 'MA',
  conn: 'CT',
  'conn.': 'CT',
  wash: 'WA',
  'wash.': 'WA',
};

// Reverse mapping for display
export const stateNames: { [key: string]: string } = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

/**
 * Convert state name to abbreviation
 * @param stateName - Full state name or existing abbreviation
 * @returns State abbreviation or original value if not found
 */
export function getStateAbbreviation(stateName: string | null | undefined): string {
  if (!stateName) return '';

  // If already an abbreviation (2 characters), return as-is
  if (stateName.length === 2) {
    return stateName.toUpperCase();
  }

  // Clean and normalize the input
  const normalized = stateName.trim().toLowerCase();

  // Check if it's a known state name
  const abbreviation = stateAbbreviations[normalized];
  if (abbreviation) {
    return abbreviation;
  }

  // If not found, return original (might be international)
  return stateName;
}

/**
 * Get full state name from abbreviation
 * @param abbreviation - State abbreviation
 * @returns Full state name or original value if not found
 */
export function getStateName(abbreviation: string | null | undefined): string {
  if (!abbreviation) return '';

  const upperAbbr = abbreviation.toUpperCase();
  return stateNames[upperAbbr] || abbreviation;
}
