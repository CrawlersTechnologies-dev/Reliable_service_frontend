// Demo data so every screen has something real-looking to show.
// Times are generated relative to "now" so TAT states (in TAT / out of TAT) stay meaningful.

const H = 3600 * 1000;
const ago = (hours) => new Date(Date.now() - hours * H).toISOString();
const daysAgo = (d) => {
  const t = new Date(Date.now() - d * 24 * H);
  return t.toISOString().slice(0, 10);
};
export const token = () => Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);

export function sampleFindings(type) {
  const base = {
    RESIDENCE: {
      metPerson: 'Basalingamma', relationship: 'Mother', ownership: 'Owned', roofType: 'RCC', yearsInStay: 30,
      totalFamily: 3, earningMembers: 1, totalEarning: 35000, residenceColour: 'White', residenceSqft: 1200,
      residenceType: 'Independent House', areaType: 'Residential', livingCondition: 'Middle Class',
      residenceProof: 'E-Bill', landmark: 'Hanuman Temple', neighbour: 'Shivanand', neighbourFeedback: 'Positive',
      politicalLink: 'No political background',
    },
    BUSINESS: {
      metPerson: 'Gopal', relationship: 'Self', constitution: 'Proprietor', ownership: 'Owned', areaType: 'Commercial',
      yearsInBusiness: 22, businessSqft: 1000, setup: 'Seen', natureOfBusiness: 'Tea Stall', stockSeen: 'Yes',
      employeesClaimed: 2, employeesSeen: 2, nameBoard: 'Displayed', qrCode: 'Verified and found genuine',
      businessProof: 'Collected', landmark: 'Near Temple', neighbour: 'Kumar', neighbourFeedback: 'Positive',
      politicalLink: 'No political background',
    },
    OFFICE: {
      metPerson: 'Hariprasad', metPersonDesignation: 'Human Resource', yearsAtOffice: 22, customerDesignation: 'Quality Manager',
      totalStaff: 25, staffSeen: 15, officeSqft: 2500, setup: 'Seen', nameBoard: 'Displayed',
      natureOfCompany: 'Manufacturing of steel', areaType: 'Commercial', landmark: 'Near Dargah',
    },
    PROPERTY: {
      metPerson: 'Ramesh K', relationship: 'Owner', ownerName: 'Ramesh K', propertySqft: 2400, nameBoard: 'Not displayed',
      propertyType: 'Constructed', constructedType: 'Residence', govtValue: 3800000, privateValue: 5200000,
      neighbourCheck: 'Two neighbours confirmed the owner has held the property for over 10 years', landmark: 'Opp. Govt School',
    },
    DOCUMENT: { metPerson: 'S. Patil', designation: 'Revenue Inspector', documentStatus: 'Genuine', issuedBy: 'S. Patil, Revenue Inspector' },
    RESI_CUM_OFFICE: {
      metPerson: 'Gopal', relationship: 'Self', constitution: 'Proprietor', resiCumOffice: 'Yes', entrance: 'From residence main door',
      areaType: 'Residential', yearsInBusiness: 22, businessSqft: 200, setup: 'Seen', natureOfBusiness: 'Saree sales',
      stockSeen: 'Yes', employeesClaimed: 0, employeesSeen: 0, nameBoard: 'Displayed', qrCode: 'Verified and found genuine',
      businessProof: 'Collected', landmark: 'Near Temple', neighbour: 'Vikram', neighbourFeedback: 'Positive',
      politicalLink: 'No political background',
    },
  };
  return { ...base[type] };
}

const banks = [
  { id: 'b_hdfc', name: 'HDFC Bank Ltd', code: 'HDFC', contactPerson: 'Rahul Menon', contactNumber: '9845012345', email: 'rcu.blr@hdfcbank.example', city: 'Bengaluru', status: 'Active', createdAt: daysAgo(120) },
  { id: 'b_axis', name: 'Axis Bank Ltd', code: 'AXIS', contactPerson: 'Priya Shetty', contactNumber: '9845098765', email: 'rcu@axisbank.example', city: 'Hubballi', status: 'Active', createdAt: daysAgo(110) },
  { id: 'b_icici', name: 'ICICI Bank Ltd', code: 'ICICI', contactPerson: 'Sandeep Rao', contactNumber: '9886011122', email: 'verify@icici.example', city: 'Bengaluru', status: 'Active', createdAt: daysAgo(90) },
  { id: 'b_bajaj', name: 'Bajaj Finance Ltd', code: 'BAJAJ', contactPerson: 'Meera Kulkarni', contactNumber: '9900112233', email: 'fcu@bajaj.example', city: 'Davanagere', status: 'Active', createdAt: daysAgo(60) },
  { id: 'b_sbi', name: 'State Bank of India', code: 'SBI', contactPerson: 'Anil Hegde', contactNumber: '9480123456', email: 'rcu@sbi.example', city: 'Kalaburagi', status: 'Active', createdAt: daysAgo(30) },
];

const users = [
  { id: 'u_admin', role: 'ADMIN', employeeId: 'ADM-001', name: 'Anjum Admin', email: 'admin@reliable.in', mobile: '9900000001', designation: 'Supervisor', status: 'Active', password: 'admin123' },
  { id: 'u_ol1', role: 'OL', employeeId: 'OL-001', name: 'Kavya Reddy', email: 'kavya@reliable.in', mobile: '9900000011', designation: 'Operations', doj: daysAgo(400), status: 'Active', password: 'ol123' },
  { id: 'u_ol2', role: 'OL', employeeId: 'OL-002', name: 'Imran Pasha', email: 'imran@reliable.in', mobile: '9900000012', designation: 'Operations', doj: daysAgo(200), status: 'Active', password: 'ol123' },
];

const executives = [
  { id: 'e1', employeeId: 'FE-001', name: 'Mahesh Kumbar', mobile: '9741000001', altMobile: '9741100001', email: 'mahesh@reliable.in', address: '14, Vidyanagar, Hubballi 580021', location: 'Hubballi', doj: daysAgo(500), status: 'Active' },
  { id: 'e2', employeeId: 'FE-002', name: 'Santosh Biradar', mobile: '9741000002', altMobile: '', email: 'santosh@reliable.in', address: 'Aland Road, Kalaburagi 585101', location: 'Kalaburagi', doj: daysAgo(380), status: 'Active' },
  { id: 'e3', employeeId: 'FE-003', name: 'Prakash Naik', mobile: '9741000003', altMobile: '9741100003', email: 'prakash@reliable.in', address: 'PJ Extension, Davanagere 577002', location: 'Davanagere', doj: daysAgo(300), status: 'Active' },
  { id: 'e4', employeeId: 'FE-004', name: 'Ravi Teja', mobile: '9741000004', altMobile: '', email: 'ravi@reliable.in', address: 'BTM 2nd Stage, Bengaluru 560076', location: 'Bengaluru', doj: daysAgo(250), status: 'Active' },
  { id: 'e5', employeeId: 'FE-005', name: 'Shilpa Desai', mobile: '9741000005', altMobile: '', email: 'shilpa@reliable.in', address: 'Tilakwadi, Belagavi 590006', location: 'Belagavi', doj: daysAgo(150), status: 'Active' },
  { id: 'e6', employeeId: 'FE-006', name: 'Nagaraj H', mobile: '9741000006', altMobile: '', email: 'nagaraj@reliable.in', address: 'Saptapur, Dharwad 580001', location: 'Dharwad', doj: daysAgo(90), status: 'Suspended' },
].map((e) => ({ ...e, role: 'EXECUTIVE', designation: 'Field Executive' }));

const coords = {
  Hubballi: [15.3647, 75.124], Kalaburagi: [17.3297, 76.8343], Davanagere: [14.4644, 75.9218],
  Bengaluru: [12.9716, 77.5946], Belagavi: [15.8497, 74.4977], Dharwad: [15.4589, 75.0078],
};

let legSeq = 0;
function leg(type, city, exec, opts = {}) {
  const [lat, lng] = coords[city];
  const jitter = () => (Math.random() - 0.5) * 0.02;
  const la = (lat + jitter()).toFixed(6);
  const ln = (lng + jitter()).toFixed(6);
  const status = opts.submittedAt ? 'SUBMITTED' : opts.startedAt ? 'IN_PROGRESS' : 'ASSIGNED';
  return {
    id: `l${++legSeq}`,
    type,
    address: opts.address || `No ${10 + legSeq}, ${legSeq}nd Cross, ${city}`,
    lat: la,
    lng: ln,
    mapLink: `https://www.google.com/maps/search/?api=1&query=${la},${ln}`,
    fromPlace: opts.from || `${city} office`,
    toPlace: opts.to || city,
    km: opts.km ?? 8 + legSeq,
    contact: '9999999999',
    trigger: opts.trigger || '',
    executiveId: exec,
    status,
    startedAt: opts.startedAt || null,
    submittedAt: opts.submittedAt || null,
    findings: opts.submittedAt ? sampleFindings(type) : {},
    photos: opts.submittedAt ? [true, true, true, true, opts.extras ?? false, false] : [],
    documentName: opts.documentName || '',
    attachments: opts.attachments || [],
    contactPerson: opts.contactPerson || '',
  };
}

const allPass = { executiveInfo: true, visitRemarks: true, photographs: true, proof: true, declaration: true, rating: true };

function mkCase(n, hoursAgo, bankId, customerName, product, tatType, legs, extra = {}) {
  const createdAt = ago(hoursAgo);
  const yymm = createdAt.slice(2, 4) + createdAt.slice(5, 7);
  return {
    id: `c${n}`,
    caseNo: `RS-${yymm}-${String(n).padStart(4, '0')}`,
    createdAt,
    bankId,
    customerName,
    product,
    contact: '9999999999',
    tatType,
    createdBy: n % 3 === 0 ? { id: 'u_ol1', name: 'Kavya Reddy', role: 'OL' } : { id: 'u_admin', name: 'Anjum Admin', role: 'ADMIN' },
    legs,
    outcome: null,
    qaRemarks: '',
    qaChecks: {},
    outcomeBy: null,
    outcomeAt: null,
    feedbackToken: token(),
    feedback: null,
    ...extra,
  };
}

const goodFeedback = (hoursAgo, rating = 5) => ({
  rating,
  noMoney: true,
  noPhotos: true,
  noLoanPush: true,
  professional: true,
  comments: 'Executive was on time and polite.',
  respondentName: 'Basalingamma',
  submittedAt: ago(hoursAgo),
});

function closed(outcome, hoursAgo, remarks = 'All documents and visit details cross-checked with field photos.') {
  return { outcome, qaRemarks: remarks, qaChecks: allPass, outcomeBy: { id: 'u_ol1', name: 'Kavya Reddy', role: 'OL' }, outcomeAt: ago(hoursAgo) };
}

export function buildSeed() {
  legSeq = 0;
  const cases = [
    mkCase(1, 30, 'b_hdfc', 'Narayan Swamy', 'Used Car Loan', 'OGL', [
      leg('RESIDENCE', 'Kalaburagi', 'e2', { address: 'H.No E/9/1574, Aland Road, Near Hanuman Devalaya, Kalaburagi 585101', startedAt: ago(23), submittedAt: ago(20), trigger: 'Check property belongs to applicant or uncle', extras: true }),
      leg('BUSINESS', 'Hubballi', 'e1', { address: 'M/s Raghuveer Enterprises, Shop #22, 2nd floor, Hubballi', startedAt: ago(9), submittedAt: ago(7), trigger: 'Business profile doubt & political link — check properly' }),
    ], { ...closed('POSITIVE', 5), feedback: goodFeedback(18) }),
    mkCase(2, 3, 'b_hdfc', 'Lakshmi Prasad', 'Personal Loan', 'LOCAL', [
      leg('RESIDENCE', 'Hubballi', 'e1', { address: 'No 25, 2nd Cross, Gokul Road, Hubballi', trigger: 'Check whether customer stays with parents' }),
    ]),
    mkCase(3, 11, 'b_axis', 'Mohammed Rafiq', 'Home Loan', 'LOCAL', [
      leg('DOCUMENT', 'Davanagere', 'e3', { address: 'Taluk Office, Davanagere', startedAt: ago(4), documentName: 'Khata', trigger: 'Doubt on font alignment — check who issued the document', contactPerson: '9999999999', attachments: [{ name: 'khata_page1.jpg', type: 'image/jpeg', size: 182000 }, { name: 'khata_page2.jpg', type: 'image/jpeg', size: 176000 }, { name: 'khata_page3.jpg', type: 'image/jpeg', size: 169000 }, { name: 'rtc.pdf', type: 'application/pdf', size: 402000 }, { name: 'tax_receipt.jpg', type: 'image/jpeg', size: 121000 }, { name: 'sale_deed.pdf', type: 'application/pdf', size: 889000 }] }),
    ]),
    mkCase(4, 10, 'b_icici', 'Deepa Joshi', 'Personal Loan', 'OGL', [
      leg('OFFICE', 'Bengaluru', 'e4', { address: 'M/s Reliable Steel Works, Peenya Industrial Area, Bengaluru', trigger: 'Customer may have resigned long back — check properly' }),
    ]),
    mkCase(5, 9.5, 'b_bajaj', 'Suresh Gowda', 'Business Loan', 'LOCAL', [
      leg('BUSINESS', 'Davanagere', 'e3', { address: 'M/s Rehan Enterprises, No 52, 5th Block, Davanagere', startedAt: ago(1), trigger: 'Verify stock and employees count' }),
    ]),
    mkCase(6, 20, 'b_sbi', 'Anitha Kulkarni', 'Loan Against Property', 'OGL', [
      leg('PROPERTY', 'Belagavi', 'e5', { address: 'Sy No 112/3, Tilakwadi, Belagavi', startedAt: ago(4), submittedAt: ago(2) }),
    ]),
    mkCase(7, 6, 'b_hdfc', 'Gopal Rao', 'Business Loan', 'LOCAL', [
      leg('RESI_CUM_OFFICE', 'Hubballi', 'e1', { address: 'Raghuveer Sarees, Keshwapur, Hubballi', startedAt: ago(2.5), submittedAt: ago(1) }),
    ]),
    mkCase(8, 40, 'b_axis', 'Vinay Hiremath', 'Used Car Loan', 'OGL', [
      leg('RESIDENCE', 'Belagavi', 'e5', { startedAt: ago(32), submittedAt: ago(30) }),
      leg('OFFICE', 'Bengaluru', 'e4', { address: 'Infotech Solutions, Whitefield, Bengaluru', startedAt: ago(3), from: 'Bengaluru office', to: 'Whitefield', km: 22 }),
    ]),
    mkCase(9, 50, 'b_icici', 'Rekha Patil', 'Two Wheeler Loan', 'LOCAL', [
      leg('RESIDENCE', 'Kalaburagi', 'e2', { startedAt: ago(42), submittedAt: ago(38) }),
    ], { ...closed('NEGATIVE', 36, 'Met person could not confirm stay; neighbour feedback negative.') }),
    mkCase(10, 96, 'b_bajaj', 'Imtiyaz Khan', 'Personal Loan', 'LOCAL', [
      leg('RESIDENCE', 'Davanagere', 'e3', { startedAt: ago(93), submittedAt: ago(91) }),
    ], { ...closed('RISK_ALERT', 88, 'Political link reported by neighbour. Refer to bank risk team.'), feedback: goodFeedback(90, 4) }),
    mkCase(11, 120, 'b_hdfc', 'Shreya Bhat', 'New Car Loan', 'OGL', [
      leg('BUSINESS', 'Dharwad', 'e1', { startedAt: ago(112), submittedAt: ago(108) }),
    ], { ...closed('POSITIVE', 100), feedback: goodFeedback(104) }),
    mkCase(12, 1, 'b_sbi', 'Basavaraj M', 'Home Loan', 'LOCAL', [
      leg('RESIDENCE', 'Kalaburagi', 'e2', { trigger: 'Confirm years at residence' }),
    ]),
    mkCase(13, 168, 'b_axis', 'Farzana Begum', 'Personal Loan', 'LOCAL', [
      leg('OFFICE', 'Hubballi', 'e1', { startedAt: ago(164), submittedAt: ago(158) }),
    ], { ...closed('REFER_TO_CREDIT', 150, 'Employment confirmed, salary slip mismatch — refer to credit.') }),
    mkCase(14, 190, 'b_icici', 'Kiran Shetty', 'Business Loan', 'LOCAL', [
      leg('BUSINESS', 'Bengaluru', 'e4', { startedAt: ago(186), submittedAt: ago(183) }),
    ], { ...closed('CNV', 180, 'Business premises locked on two visits, customer not reachable.') }),
  ];

  // Sampling logins: daily app logins of each executive (last 7 days).
  const logins = [];
  let lid = 0;
  executives.forEach((e, ei) => {
    for (let d = 0; d < 7; d++) {
      if (e.status === 'Suspended' && d < 3) continue;
      if ((d + ei) % 6 === 5) continue; // a day off now and then
      const start = new Date();
      start.setDate(start.getDate() - d);
      start.setHours(8 + (ei % 3), 5 + ((d * 13 + ei * 7) % 50), 0, 0);
      const hours = 7 + ((d + ei) % 4) + 0.25 * (ei % 3);
      const end = new Date(start.getTime() + hours * H);
      const [lat, lng] = coords[e.location];
      const loggedOut = end.getTime() < Date.now();
      logins.push({
        id: `s${++lid}`,
        executiveId: e.id,
        loginAt: start.toISOString(),
        logoutAt: loggedOut ? end.toISOString() : null,
        device: ['Android · Redmi Note 12', 'Android · Samsung M34', 'Android · Vivo Y27', 'Android · Realme 11'][ei % 4],
        location: e.location,
        lat: (lat + 0.003 * d).toFixed(5),
        lng: (lng - 0.002 * d).toFixed(5),
        visits: 2 + ((d + ei) % 4),
      });
    }
  });

  return { banks, users: [...users, ...executives], cases, logins, seq: 14 };
}
