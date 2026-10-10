// Turns the executive's questionnaire answers into the structured findings
// paragraphs used in the bank report (same wording style as the agency's templates).
import { pad2 } from './format';

const v = (x, fallback = '—') => (x === '' || x == null ? fallback : x);
const lower = (x) => (x ? String(x).toLowerCase() : '—');
const article = (word = '') => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const political = (f) =>
  f.politicalLink === 'Political link found'
    ? 'Applicant was reported as having a political link — refer the case for credit review.'
    : 'Applicant was reported as not having a political background.';
const tpc = (f) => (f.neighbour ? `TPC ${f.neighbour} confirmed with ${lower(v(f.neighbourFeedback, 'no'))} feedback.` : null);

export function buildRemarks(type, f = {}, leg = {}) {
  const place = leg.address || 'the given address';
  switch (type) {
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
    case 'DOCUMENT':
      return [
        ['Document verification', `${v(leg.documentName, 'The document')} was verified with the issuing authority. The executive met ${v(f.metPerson)} (${v(f.designation)}).`],
        ['Result', `Document reported as ${lower(f.documentStatus)}. Issued by: ${v(f.issuedBy)}.`],
      ];
    default:
      return [];
  }
}
