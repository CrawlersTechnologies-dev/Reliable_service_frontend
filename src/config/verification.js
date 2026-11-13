// Single source of truth for verification types, executive questionnaire fields,
// photo slots and dropdown options. The executive mobile app and the Node backend
// should import / mirror this same structure so the panel, app and report stay in sync.

export const AGENCY = {
  name: 'Reliable Services',
  tagline: 'Investigation Agency | RCU | Field Verification & Quality Assurance',
  reviewer: 'Narayan Swamy',
  reviewerTitle: 'Agency Manager',
  address: '# 302, 2nd Floor, Club Road, Court Circle, Hubli',
};

export const TAT_TYPES = {
  LOCAL: { key: 'LOCAL', label: 'Local', hours: 8 },
  OGL: { key: 'OGL', label: 'OGL', hours: 24 },
};

export const OUTCOMES = [
  { key: 'POSITIVE', label: 'Positive', short: '+ve', tone: 'green' },
  { key: 'NEGATIVE', label: 'Negative', short: '-ve', tone: 'red' },
  { key: 'RISK_ALERT', label: 'Risk Alert', short: 'Risk', tone: 'amber' },
  { key: 'CNV', label: 'CNV', short: 'CNV', tone: 'slate' },
  { key: 'REFER_TO_CREDIT', label: 'Refer to Credit', short: 'Refer', tone: 'blue' },
];

export const USER_STATUS = ['Active', 'Inactive', 'Suspended', 'Deleted'];
// field executives: only Active / Delete (a deleted executive cannot log in and is hidden from lists)
export const EXEC_STATUS = ['Active', 'Deleted'];

// Product dropdown in New case. "Other" lets the user type any product.
export const PRODUCTS = [
  'Home Loan',
  'Loan Against Property',
  'Personal Loan',
  'Business Loan',
  'Used Car Loan',
  'New Car Loan',
  'Two Wheeler Loan',
  'Commercial Vehicle Loan',
  'Tractor Loan',
  'Gold Loan',
  'Education Loan',
  'Consumer Durable Loan',
  'Credit Card',
  'Current Account',
  'Savings Account',
];
export const OTHER = 'Other';

export const DOCUMENT_NAMES = ['Khata', 'RTC', 'Salary Certificate', 'NDC', 'NOC', 'Other'];

// What the executive found when reaching the address (asked before the questionnaire)
export const VISIT_RESULTS = [
  { key: 'TRACED', label: 'Traced', hint: 'Address found — fill the full verification' },
  { key: 'UNTRACEABLE', label: 'Untraceable', hint: 'Address could not be found' },
  { key: 'REFUSED', label: 'Customer refused', hint: 'Customer / family refused the verification' },
  { key: 'REVISIT', label: 'Visit later', hint: 'Customer asked to come back later — the visit stays open' },
];

// Field executives work either as field officers or as samplers
export const EXEC_TYPES = [
  { key: 'FIELD_OFFICER', label: 'Field officer' },
  { key: 'SAMPLER', label: 'Sampler' },
];
export const SAMPLER_CATEGORIES = ['Full-time', 'Part-time'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Extra case details (client request)
export const CUSTOMER_PROFILES = ['Salaried', 'Self Employed', 'Agriculture', 'Contract Worker', 'Unemployed'];
export const SOURCING_CHANNELS = ['DSA', 'DST'];
export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const MAX_OTHER_NAMES = 3;

// 6-digit Indian PIN code
export const PINCODE_RE = /^[1-9]\d{5}$/;

const AREA = ['Village Area', 'Residential', 'Commercial', 'Industrial', 'Community Dominated Area', 'Slum Area'];
const OWNERSHIP = ['Owned', 'Rent', 'Lease'];
const NAME_BOARD = ['Displayed', 'Not displayed', 'Temporary name board'];
const SEEN = ['Seen', 'Not seen'];
const POLITICAL = ['No political background', 'Political link found'];
const FEEDBACK = ['Positive', 'Negative', 'Neutral'];
const CONSTITUTION = ['Proprietor', 'Partner', 'Director'];
const QR = ['Verified and found genuine', 'Not available'];

const notOwned = (f) => f.ownership && f.ownership !== 'Owned';

// field: { key, label, type: text|number|select|textarea, options?, showIf?(findings) }
export const VERIFICATION_TYPES = {
  RESIDENCE: {
    key: 'RESIDENCE',
    label: 'Residence',
    code: 'RV',
    tone: 'red',
    placeLabel: 'Residence address',
    fields: [
      { key: 'metPerson', label: 'Met person', type: 'text' },
      { key: 'relationship', label: 'Relationship', type: 'text' },
      { key: 'ownership', label: 'Ownership', type: 'select', options: OWNERSHIP },
      { key: 'rentAmount', label: 'Rent / lease amount', type: 'number', showIf: notOwned },
      { key: 'roofType', label: 'Type of roof', type: 'select', options: ['RCC', 'Cement Sheets', 'Metallic Steel', 'Wood'] },
      { key: 'yearsInStay', label: 'Years in stay', type: 'number' },
      { key: 'totalFamily', label: 'Total family', type: 'number' },
      { key: 'earningMembers', label: 'Earning members', type: 'number' },
      { key: 'totalEarning', label: 'Total earning (monthly)', type: 'number' },
      { key: 'residenceColour', label: 'Colour of residence', type: 'text' },
      { key: 'residenceSqft', label: 'Residence area (sq.ft)', type: 'number' },
      { key: 'residenceType', label: 'Type of residence', type: 'select', options: ['Independent House', 'Part of Independent', 'Tiled', 'Hutment', 'Flat', 'Chawl'] },
      { key: 'areaType', label: 'Type of area', type: 'select', options: AREA },
      { key: 'livingCondition', label: 'Living condition', type: 'select', options: ['Posh', 'Middle Class', 'Poor'] },
      { key: 'residenceProof', label: 'Proof of residence', type: 'select', options: ['Gas Bill', 'Tax Paid Receipt', 'E-Bill', 'Post Paid Bill', 'Digital Khata'] },
      { key: 'landmark', label: 'Landmark', type: 'text' },
      { key: 'neighbour', label: 'Neighbour (TPC)', type: 'text' },
      { key: 'neighbourFeedback', label: 'Neighbour feedback', type: 'select', options: FEEDBACK },
      { key: 'politicalLink', label: 'Political link', type: 'select', options: POLITICAL },
    ],
    photos: ['Complete house', 'Complete house', 'Executive + house selfie', 'Proof of residence', 'Extra 1', 'Extra 2'],
  },
  BUSINESS: {
    key: 'BUSINESS',
    label: 'Business',
    code: 'BV',
    tone: 'amber',
    placeLabel: 'Business name & address',
    fields: [
      { key: 'metPerson', label: 'Met person', type: 'text' },
      { key: 'relationship', label: 'Relationship', type: 'text' },
      { key: 'constitution', label: 'Prop / Part / Director', type: 'select', options: CONSTITUTION },
      { key: 'ownership', label: 'Premises', type: 'select', options: OWNERSHIP },
      { key: 'rentAmount', label: 'Rent / lease amount', type: 'number', showIf: notOwned },
      { key: 'areaType', label: 'Type of area', type: 'select', options: AREA },
      { key: 'yearsInBusiness', label: 'Years in business', type: 'number' },
      { key: 'businessSqft', label: 'Business area (sq.ft)', type: 'number' },
      { key: 'setup', label: 'Business setup', type: 'select', options: SEEN },
      { key: 'natureOfBusiness', label: 'Nature of business', type: 'text' },
      { key: 'stockSeen', label: 'Stock seen', type: 'select', options: ['Yes', 'No'] },
      { key: 'employeesClaimed', label: 'Employees claimed', type: 'number' },
      { key: 'employeesSeen', label: 'Employees seen', type: 'number' },
      { key: 'nameBoard', label: 'Name board', type: 'select', options: NAME_BOARD },
      { key: 'qrCode', label: 'QR code', type: 'select', options: QR },
      { key: 'businessProof', label: 'Proof of business', type: 'select', options: ['Collected', 'Not collected'] },
      { key: 'landmark', label: 'Landmark', type: 'text' },
      { key: 'neighbour', label: 'Neighbour (TPC)', type: 'text' },
      { key: 'neighbourFeedback', label: 'Neighbour feedback', type: 'select', options: FEEDBACK },
      { key: 'politicalLink', label: 'Political link', type: 'select', options: POLITICAL },
    ],
    photos: ['Complete business', 'Complete business', 'Executive + business selfie', 'Proof of business', 'QR code', 'Stocks'],
  },
  OFFICE: {
    key: 'OFFICE',
    label: 'Office (salaried)',
    code: 'OV',
    tone: 'violet',
    placeLabel: 'Company name & office address',
    fields: [
      { key: 'metPerson', label: 'Met person', type: 'text' },
      { key: 'metPersonDesignation', label: 'Met person designation', type: 'text' },
      { key: 'yearsAtOffice', label: 'Years at office', type: 'number' },
      { key: 'customerDesignation', label: 'Customer designation', type: 'text' },
      { key: 'totalStaff', label: 'Total staff', type: 'number' },
      { key: 'staffSeen', label: 'Total staff seen', type: 'number' },
      { key: 'officeSqft', label: 'Office area (sq.ft)', type: 'number' },
      { key: 'setup', label: 'Office setup', type: 'select', options: SEEN },
      { key: 'nameBoard', label: 'Office name board', type: 'select', options: ['Displayed', 'Not displayed'] },
      { key: 'natureOfCompany', label: 'Nature of company', type: 'text' },
      { key: 'areaType', label: 'Type of area', type: 'select', options: AREA },
      { key: 'landmark', label: 'Landmark', type: 'text' },
    ],
    photos: ['Complete office', 'Complete office', 'Executive + office selfie', 'Office ID card', 'Extra 1', 'Extra 2'],
  },
  PROPERTY: {
    key: 'PROPERTY',
    label: 'Property',
    code: 'PV',
    tone: 'teal',
    placeLabel: 'Property address',
    fields: [
      { key: 'metPerson', label: 'Met person', type: 'text' },
      { key: 'relationship', label: 'Relationship', type: 'text' },
      { key: 'ownerName', label: 'Property owner name', type: 'text' },
      { key: 'propertySqft', label: 'Property area (sq.ft)', type: 'number' },
      { key: 'nameBoard', label: 'Property name board', type: 'select', options: ['Displayed', 'Not displayed'] },
      { key: 'propertyType', label: 'Type of property', type: 'select', options: ['Open', 'Constructed'] },
      { key: 'constructedType', label: 'Constructed as', type: 'select', options: ['Commercial complex', 'Residence'], showIf: (f) => f.propertyType === 'Constructed' },
      { key: 'govtValue', label: 'Govt value (₹)', type: 'number' },
      { key: 'privateValue', label: 'Private value (₹)', type: 'number' },
      { key: 'neighbourCheck', label: 'Neighbours check', type: 'textarea' },
      { key: 'landmark', label: 'Landmark', type: 'text' },
    ],
    photos: ['Complete property', 'Complete property', 'Executive + property selfie', 'Proof / landmark', 'Property name board', 'Extra'],
  },
  DOCUMENT: {
    key: 'DOCUMENT',
    label: 'Document check',
    code: 'DV',
    tone: 'pink',
    isDocument: true, // allocated to a field executive, who verifies it at the issuing office
    hint: 'Field executive verifies the document at the issuing office',
    placeLabel: 'Issuing authority / office',
    fields: [
      { key: 'documentNo', label: 'Document No.', type: 'text' },
      { key: 'verifiedWith', label: 'Verified with (official name & designation)', type: 'text' },
      { key: 'details', label: 'Verification details', type: 'textarea' },
      { key: 'documentStatus', label: 'Document status', type: 'select', options: ['Genuine', 'Fake', 'Could not verify'] },
    ],
    photos: ['Issuing office', 'Executive + office selfie', 'Document / record seen', 'Office name board', 'Extra'],
  },
  INTERNAL_DOCUMENT: {
    key: 'INTERNAL_DOCUMENT',
    label: 'Internal check document',
    code: 'IC',
    tone: 'slate',
    internal: true, // checked in the office by Admin / OL — no field visit
    isDocument: true,
    hint: 'Checked in the office by Admin / OL — document type, number and details',
    placeLabel: 'Issuing authority / office',
    fields: [
      { key: 'documentNo', label: 'Document No.', type: 'text' },
      { key: 'details', label: 'Verification details', type: 'textarea' },
      { key: 'documentStatus', label: 'Document status', type: 'select', options: ['Genuine', 'Fake', 'Could not verify'] },
    ],
    photos: [],
  },
  RESI_CUM_OFFICE: {
    key: 'RESI_CUM_OFFICE',
    label: 'Resi-cum-office',
    code: 'RB',
    tone: 'blue',
    hint: 'Business run from the residence (same place)',
    placeLabel: 'Residence / business address',
    fields: [
      { key: 'metPerson', label: 'Met person', type: 'text' },
      { key: 'relationship', label: 'Relationship', type: 'text' },
      { key: 'constitution', label: 'Prop / Part / Director', type: 'select', options: CONSTITUTION },
      { key: 'resiCumOffice', label: 'Resi-cum-office', type: 'select', options: ['Yes', 'No'] },
      { key: 'entrance', label: 'Entrance', type: 'select', options: ['From residence main door', 'Separate door for business'] },
      { key: 'areaType', label: 'Type of area', type: 'select', options: AREA },
      { key: 'yearsInBusiness', label: 'Years in business', type: 'number' },
      { key: 'businessSqft', label: 'Business area (sq.ft)', type: 'number' },
      { key: 'setup', label: 'Business setup', type: 'select', options: SEEN },
      { key: 'natureOfBusiness', label: 'Nature of business', type: 'text' },
      { key: 'stockSeen', label: 'Stock seen', type: 'select', options: ['Yes', 'No'] },
      { key: 'employeesClaimed', label: 'Employees claimed', type: 'number' },
      { key: 'employeesSeen', label: 'Employees seen', type: 'number' },
      { key: 'nameBoard', label: 'Name board', type: 'select', options: NAME_BOARD },
      { key: 'qrCode', label: 'QR code', type: 'select', options: QR },
      { key: 'businessProof', label: 'Proof of business', type: 'select', options: ['Collected', 'Not collected'] },
      { key: 'landmark', label: 'Landmark', type: 'text' },
      { key: 'neighbour', label: 'Neighbour (TPC)', type: 'text' },
      { key: 'neighbourFeedback', label: 'Neighbour feedback', type: 'select', options: FEEDBACK },
      { key: 'politicalLink', label: 'Political link', type: 'select', options: POLITICAL },
    ],
    photos: ['Complete business', 'Complete business', 'Executive + business selfie', 'Proof of business', 'QR code', 'Stocks'],
  },
  BANK_STATEMENT: {
    key: 'BANK_STATEMENT',
    label: 'Bank statement',
    code: 'BS',
    tone: 'slate',
    internal: true, // handled by Admin / OL in the office — no executive, no field visit, no TAT photos
    hint: 'Handled internally by Admin / OL — no field executive',
    placeLabel: 'Statement bank / branch',
    fields: [
      { key: 'statementBank', label: 'Statement bank & branch', type: 'text' },
      { key: 'accountHolder', label: 'Account holder name', type: 'text' },
      { key: 'statementPeriod', label: 'Statement period', type: 'text' },
      { key: 'verifiedWith', label: 'Verified with (bank official, designation)', type: 'text' },
      { key: 'verificationMode', label: 'Verification mode', type: 'select', options: ['Branch visit', 'Phone call', 'Email', 'Online portal'] },
      { key: 'statementStatus', label: 'Statement', type: 'select', options: ['Genuine', 'Not genuine', 'Tampered', 'Could not verify'] },
      { key: 'averageBalance', label: 'Average monthly balance (₹)', type: 'number' },
      { key: 'chequeReturns', label: 'Cheque / ECS returns', type: 'number' },
      { key: 'salaryCredits', label: 'Salary / income credits seen', type: 'select', options: ['Yes, regular', 'Irregular', 'No'] },
    ],
    photos: [],
  },
};

export const TYPE_LIST = Object.values(VERIFICATION_TYPES);
export const typeOf = (key) => VERIFICATION_TYPES[key];

// Customer feedback questions (page 5 of the bank report).
export const DECLARATION_QUESTIONS = [
  { key: 'noMoney', title: 'No monetary solicitation', text: 'The field executive did not demand or collect any unauthorised money or fees.', titleKn: 'ಹಣದ ಬೇಡಿಕೆ ಇಲ್ಲ', textKn: 'ಕಾರ್ಯನಿರ್ವಾಹಕರು ಯಾವುದೇ ಅನಧಿಕೃತ ಹಣ ಅಥವಾ ಶುಲ್ಕವನ್ನು ಕೇಳಿಲ್ಲ ಅಥವಾ ಸಂಗ್ರಹಿಸಿಲ್ಲ.' },
  { key: 'noPhotos', title: 'No unauthorised photo requests', text: 'The field executive did not request personal photographs through a mobile device or any unauthorised means.', titleKn: 'ಫೋಟೋಗಳ ಬೇಡಿಕೆ ಇಲ್ಲ', textKn: 'ಮೊಬೈಲ್ ಮೂಲಕ ಯಾವುದೇ ವೈಯಕ್ತಿಕ ಫೋಟೋಗಳನ್ನು ಕೇಳಿಲ್ಲ ಅಥವಾ ಸಂಗ್ರಹಿಸಿಲ್ಲ.' },
  { key: 'noLoanPush', title: 'No third-party loan facilitation', text: 'The field executive did not pressure or influence me to take loans from other financial institutions.', titleKn: 'ಪರ್ಯಾಯ ಸಾಲದ ಪ್ರೇರಣೆ ಇಲ್ಲ', textKn: 'ಬೇರೆ ಹಣಕಾಸು ಸಂಸ್ಥೆಗಳಿಂದ ಸಾಲ ಪಡೆಯುವಂತೆ ಒತ್ತಡ ಹೇರಿಲ್ಲ ಅಥವಾ ಪ್ರೇರೇಪಿಸಿಲ್ಲ.' },
  { key: 'professional', title: 'Professional conduct', text: 'The field executive was polite and professional during the visit.', titleKn: 'ವೃತ್ತಿಪರ ನಡವಳಿಕೆ', textKn: 'ಕಾರ್ಯನಿರ್ವಾಹಕರ ನಡವಳಿಕೆಗೆ ಸಂಬಂಧಿಸಿದ ಗ್ರಾಹಕರ ಅಭಿಪ್ರಾಯವನ್ನು ದಾಖಲಿಸಲಾಗಿದೆ.' },
];

// Kannada text of the customer declaration (client's bilingual format)
export const DECLARATION_KN = {
  heading: 'ಗ್ರಾಹಕರ ದೃಢೀಕರಣ',
  intro: 'Reliable Services – Investigation Agency ವತಿಯಿಂದ ನಡೆಸಿದ ಕ್ಷೇತ್ರ ಪರಿಶೀಲನೆಯ ಸಂದರ್ಭದಲ್ಲಿ ಗ್ರಾಹಕರು / ಭೇಟಿಯಾದ ವ್ಯಕ್ತಿಯು ಕೆಳಗಿನ ಅಂಶಗಳನ್ನು ದೃಢೀಕರಿಸಿದ್ದಾರೆ:',
  closing: 'ಮೇಲಿನ ಮಾಹಿತಿಯು ಭೇಟಿಯ ಸಂದರ್ಭದಲ್ಲಿ ಗ್ರಾಹಕರು / ಭೇಟಿಯಾದ ವ್ಯಕ್ತಿಯು ನೀಡಿದ ದೃಢೀಕರಣವನ್ನು ಮಾತ್ರ ಆಧರಿಸಿದೆ.',
  acknowledgment: 'ಮೇಲಿನ ಮಾಹಿತಿಯನ್ನು ನಾನು ನೀಡಿದ ವಿವರಗಳ ಆಧಾರದ ಮೇಲೆ ದಾಖಲಿಸಲಾಗಿದೆ ಎಂದು ದೃಢೀಕರಿಸುತ್ತೇನೆ.',
  notConfirmed: 'ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ',
  confirmed: 'ದೃಢೀಕರಿಸಲಾಗಿದೆ',
  nocTitle: 'ನಿರಾಕ್ಷೇಪಣಾ ಪತ್ರ', // No Objection Certificate
};

export const QA_PARAMS = [
  { key: 'executiveInfo', label: 'Executive information', note: 'Mandatory fields reviewed' },
  { key: 'visitRemarks', label: 'Visit remarks', note: 'Compared with submitted case data' },
  { key: 'photographs', label: 'Photographs', note: 'Images checked for relevance / clarity' },
  { key: 'proof', label: 'Proof document', note: 'Document checked' },
  { key: 'declaration', label: 'Customer declaration', note: 'Digital confirmation reviewed' },
  { key: 'rating', label: 'Customer rating', note: 'Rating reviewed' },
];

