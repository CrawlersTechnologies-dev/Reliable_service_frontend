// Turns the executive's questionnaire answers into the structured findings
// paragraphs used in the bank report (same wording style as the agency's templates).
import { pad2 } from './format';
import { VERIFICATION_TYPES } from '../config/verification';

const v = (x, fallback = '—') => (x === '' || x == null ? fallback : x);
const lower = (x) => (x ? String(x).toLowerCase() : '—');
const article = (word = '') => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const political = (f) =>
  f.politicalLink === 'Political link found'
    ? 'Applicant was reported as having a political link — refer the case for credit review.'
    : 'Applicant was reported as not having a political background.';
const tpc = (f) => (f.neighbour ? `TPC ${f.neighbour} confirmed with ${lower(v(f.neighbourFeedback, 'no'))} feedback.` : null);

export function buildRemarks(type, f = {}, leg = {}) {
  // Details entered by Admin / OL in the office may be partial, so no auto-written
  // sentences (they would state things that were never checked): the report shows
  // the filled answers as a table plus the remarks they typed.
  // When every answer was filled in, the full write-up is used as for a field visit.
  const extra = leg.manualRemarks ? [['Remarks', leg.manualRemarks]] : [];
  // internal check document: the remarks typed by operations are printed as written
  if (type === 'INTERNAL_DOCUMENT') return [...typeRemarks(type, f, leg), ...extra];
  if (leg.manual) {
    const t = VERIFICATION_TYPES[type];
    const complete = t?.fields.every((fd) => (fd.showIf && !fd.showIf(f)) || (f[fd.key] !== undefined && f[fd.key] !== ''));
    return complete ? [...typeRemarks(type, f, leg), ...extra] : extra;
  }
  return typeRemarks(type, f, leg);
}

function typeRemarks(type, f = {}, leg = {}) {
  const place = leg.address || 'the given address';
  switch (type) {
    case 'BANK_STATEMENT':
      return [
        ['Bank statement verification', `Statement of ${v(f.accountHolder)} held with ${v(f.statementBank, place)} for the period ${v(f.statementPeriod)} was verified by ${lower(f.verificationMode)} with ${v(f.verifiedWith)}.`],
        ['Result', `Statement reported as ${lower(f.statementStatus)}. Average monthly balance ₹${v(f.averageBalance)}; ${pad2(f.chequeReturns)} cheque / ECS returns; salary / income credits: ${lower(f.salaryCredits)}.`],
      ];
    case 'RESIDENCE':
      return [
        ['Residence verification', `The executive visited ${place} and met ${v(f.metPerson)} (${v(f.relationship)}), who confirmed that the applicant and family have been residing at the current residence in ${article(f.ownership)} ${lower(f.ownership)} house for approximately ${v(f.yearsInStay)} years.${f.rentAmount && f.ownership !== 'Owned' ? ` Monthly rent/lease is ₹${f.rentAmount}.` : ''}`],
        ['Property & occupancy', `The residence is ${article(f.residenceType)} ${lower(f.residenceType)} of about ${v(f.residenceSqft)} sq.ft with ${v(f.roofType)} roofing and a ${lower(f.residenceColour)} exterior, in a ${lower(f.areaType)} area. The family has ${pad2(f.totalFamily)} members, of whom ${pad2(f.earningMembers)} ${Number(f.earningMembers) === 1 ? 'is' : 'are'} earning. Living condition: ${lower(f.livingCondition)}.`],
        ['Residence proof', `${v(f.residenceProof)} was collected for confirmation. Nearest landmark is ${v(f.landmark)}.`],
        ['Neighbour verification', tpc(f) || 'Neighbour check not recorded.'],
        ['Political check', political(f)],
      ];
    case 'BUSINESS':
    case 'RESI_CUM_OFFICE': {
      const resi = type === 'RESI_CUM_OFFICE';
      return [
        ['Business verification', `The executive visited ${place}${resi ? ', found to be a resi-cum-office' : ''} in a ${lower(f.areaType)} area, and met ${v(f.metPerson)} (${v(f.relationship)}), who confirmed it is a ${f.constitution === 'Proprietor' ? 'proprietorship' : f.constitution === 'Partner' ? 'partnership' : 'company'} business running for ${v(f.yearsInBusiness)} years at the current address${resi ? `, entered ${lower(f.entrance)}` : ` from ${lower(f.ownership)} premises`}.`],
        ['Premises & operations', `Business area is around ${v(f.businessSqft)} sq.ft. Nature of business: ${v(f.natureOfBusiness)}. ${pad2(f.employeesClaimed)} employees claimed, ${pad2(f.employeesSeen)} seen. Business setup ${lower(f.setup)}, stock ${f.stockSeen === 'Yes' ? 'seen' : 'not seen'}, name board ${lower(f.nameBoard)}. Nearest landmark is ${v(f.landmark)}.`],
        ['QR code & proof', `QR code: ${lower(f.qrCode)}. Proof of business ${lower(f.businessProof)}.`],
        ['Neighbour verification', tpc(f) || 'Neighbour check not recorded.'],
        ['Political check', political(f)],
      ];
    }
    case 'OFFICE':
      return [
        ['Office verification', `The executive visited ${place} in a ${lower(f.areaType)} area and met ${v(f.metPerson)} (${v(f.metPersonDesignation)}), who confirmed the applicant is working as ${v(f.customerDesignation)} for ${v(f.yearsAtOffice)} years at this office.`],
        ['Office profile', `${pad2(f.totalStaff)} staff claimed, around ${pad2(f.staffSeen)} seen during the visit. Office premises about ${v(f.officeSqft)} sq.ft; nature of company: ${v(f.natureOfCompany)}. Office setup ${lower(f.setup)}, name board ${lower(f.nameBoard)}. Nearest landmark is ${v(f.landmark)}.`],
      ];
    case 'PROPERTY':
      return [
        ['Property verification', `The executive visited ${place} and met ${v(f.metPerson)} (${v(f.relationship)}). Property owner: ${v(f.ownerName)}. The property is ${lower(f.propertyType)}${f.constructedType ? ` (${lower(f.constructedType)})` : ''}, about ${v(f.propertySqft)} sq.ft, name board ${lower(f.nameBoard)}.`],
        ['Valuation', `Government value ₹${v(f.govtValue)}; private/market value ₹${v(f.privateValue)}.`],
        ['Neighbour check', `${v(f.neighbourCheck, 'Not recorded')}. Nearest landmark is ${v(f.landmark)}.`],
      ];
    // Field and internal document checks print the same way, under "Document check"
    case 'DOCUMENT': {
      const docNo = leg.documentNo || f.documentNo;
      const doc = `${v(leg.documentName, 'Document')}${docNo ? ` (No. ${docNo})` : ''}`;
      const met = f.metPerson ? ` Met ${f.metPerson}${f.metPersonDesignation ? ` (${f.metPersonDesignation})` : ''}.` : f.verifiedWith ? ` Checked with ${f.verifiedWith}.` : '';
      return [
        ['Document check', `${doc}: Verified the given document at ${place}.${met}${f.documentStatus ? ` Status: ${f.documentStatus}.` : ''}`],
        ...(f.feRemarks || f.details ? [['FE remarks', f.feRemarks || f.details]] : []),
      ];
    }
    case 'INTERNAL_DOCUMENT': {
      const docNo = leg.documentNo || f.documentNo;
      const doc = `${v(leg.documentName, 'Document')}${docNo ? ` (No. ${docNo})` : ''}`;
      return [['Document check', f.details ? `${doc}: ${f.details}${f.documentStatus ? ` Status: ${f.documentStatus}.` : ''}` : `${doc}: Verified the given document.${f.documentStatus ? ` Status: ${f.documentStatus}.` : ''}`]];
    }
    default:
      return [];
  }
}
