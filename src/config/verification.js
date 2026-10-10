// Single source of truth for verification types, executive questionnaire fields,
// photo slots and dropdown options. The executive mobile app and the Node backend
// should import / mirror this same structure so the panel, app and report stay in sync.

export const AGENCY = {
  name: 'Reliable Services',
  tagline: 'Investigation Agency | RCU | Field Verification & Quality Assurance',
  reviewer: 'Narayan Swamy',
  reviewerTitle: 'Agency Manager',
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

export const USER_STATUS = ['Active', 'Inactive', 'Suspended'];

export const PRODUCTS = [
  'Used Car Loan',
  'New Car Loan',
  'Personal Loan',
  'Home Loan',
  'Loan Against Property',
  'Business Loan',
  'Two Wheeler Loan',
  'Credit Card',
];

export const DOCUMENT_NAMES = ['Khata', 'RTC', 'Salary Certificate', 'NDC', 'NOC', 'Other'];

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
    label: 'Document',
    code: 'DV',
    tone: 'pink',
    placeLabel: 'Issuing authority address',
    isDocument: true,
    fields: [
      { key: 'metPerson', label: 'Met person', type: 'text' },
      { key: 'designation', label: 'Designation', type: 'text' },
      { key: 'documentStatus', label: 'Document', type: 'select', options: ['Genuine', 'Fake'] },
      { key: 'issuedBy', label: 'Issued by (name & designation)', type: 'text' },
    ],
    photos: ['Authority (complete)', 'Authority (complete)', 'Executive + authority selfie', 'Records photo', 'Extra 1', 'Extra 2'],
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
};

export const TYPE_LIST = Object.values(VERIFICATION_TYPES);
export const typeOf = (key) => VERIFICATION_TYPES[key];

// Customer feedback questions (page 5 of the bank report).
export const DECLARATION_QUESTIONS = [
  { key: 'noMoney', title: 'No monetary solicitation', text: 'The field executive did not demand or collect any unauthorised money or fees.' },
  { key: 'noPhotos', title: 'No unauthorised photo requests', text: 'The field executive did not request personal photographs through a mobile device or any unauthorised means.' },
  { key: 'noLoanPush', title: 'No third-party loan facilitation', text: 'The field executive did not pressure or influence me to take loans from other financial institutions.' },
  { key: 'professional', title: 'Professional conduct', text: 'The field executive was polite and professional during the visit.' },
];

export const QA_PARAMS = [
  { key: 'executiveInfo', label: 'Executive information', note: 'Mandatory fields reviewed' },
  { key: 'visitRemarks', label: 'Visit remarks', note: 'Compared with submitted case data' },
  { key: 'photographs', label: 'Photographs', note: 'Images checked for relevance / clarity' },
  { key: 'proof', label: 'Proof document', note: 'Document checked' },
  { key: 'declaration', label: 'Customer declaration', note: 'Digital confirmation reviewed' },
  { key: 'rating', label: 'Customer rating', note: 'Rating reviewed' },
];

