export const EMERGENCY_NUMBERS = {
  // North America
  US: '911',
  CA: '911',
  MX: '911',
  
  // Europe
  GB: '999',
  DE: '112',
  FR: '112',
  IT: '112',
  ES: '112',
  NL: '112',
  BE: '112',
  AT: '112',
  CH: '112',
  SE: '112',
  NO: '112',
  DK: '112',
  FI: '112',
  PL: '112',
  
  // Asia
  IN: '112',
  CN: '110',
  JP: '110',
  KR: '112',
  SG: '999',
  MY: '999',
  TH: '191',
  ID: '112',
  PH: '911',
  VN: '113',
  PK: '15',
  BD: '999',
  
  // Middle East
  AE: '999',
  SA: '997',
  IL: '100',
  TR: '112',
  
  // Oceania
  AU: '000',
  NZ: '111',
  
  // Africa
  ZA: '10111',
  EG: '122',
  NG: '112',
  KE: '999',
  
  // South America
  BR: '190',
  AR: '911',
  CL: '133',
  CO: '123',
  PE: '105',
  
  // Default (EU standard)
  DEFAULT: '112'
};

export function getEmergencyNumber(countryCode) {
  return EMERGENCY_NUMBERS[countryCode?.toUpperCase()] || EMERGENCY_NUMBERS.DEFAULT;
}

export function getEmergencyNumberForLocation(latitude, longitude) {
  // This is a simplified version. For production, use a proper geocoding service
  // or a more comprehensive country detection library
  return EMERGENCY_NUMBERS.DEFAULT;
}
