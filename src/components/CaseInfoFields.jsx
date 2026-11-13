// Customer + bank details of a case. Used on New case and in "Edit case details".
import { Field, Segmented } from './ui';
import Icon from './Icon';
import DedupeCheck from './DedupeCheck';
import { CUSTOMER_PROFILES, MAX_OTHER_NAMES, OTHER, PAN_RE, PRODUCTS, SOURCING_CHANNELS } from '../config/verification';
import { inr } from '../utils/format';

const digits = (v) => String(v || '').replace(/\D/g, '');

export const EMPTY_INFO = {
  bankerCaseId: '',
  branchName: '',
  branchCode: '',
  customerName: '',
  otherNames: [],
  product: '',
  productOther: '',
  loanAmount: '',
  contact: '',
  altContact: '',
  coApplicantName: '',
  coApplicantContact: '',
  dedupeCheck: '',
  pan: '',
  profile: '',
  sourcing: '',
  sourcingName: '',
};

// case from the API → form values
export function infoFromCase(c) {
  const known = PRODUCTS.includes(c.product);
  return {
    ...EMPTY_INFO,
    ...Object.fromEntries(Object.keys(EMPTY_INFO).map((k) => [k, c[k] ?? EMPTY_INFO[k]])),
    product: known ? c.product : c.product ? OTHER : '',
    productOther: known ? '' : c.product || '',
    loanAmount: c.loanAmount == null ? '' : String(c.loanAmount),
    otherNames: [...(c.otherNames || [])],
  };
}

export const productOf = (f) => (f.product === OTHER ? f.productOther.trim() : f.product);

export function validateInfo(f) {
  const e = {};
  if (!f.bankerCaseId.trim()) e.bankerCaseId = 'Enter the banker case ID';
  if (f.branchName.trim().length < 2) e.branchName = 'Enter the branch name';
  if (!f.customerName.trim()) e.customerName = 'Enter the customer name';
  if (f.otherNames.some((n) => n.trim().length < 2)) e.otherNames = 'Fill in or remove the empty name';
  if (!f.product) e.product = 'Choose the product';
  else if (f.product === OTHER && !f.productOther.trim()) e.product = 'Type the product name';
  const amt = Number(digits(f.loanAmount));
  if (!amt) e.loanAmount = 'Enter the loan amount';
  if (!/^\d{10}$/.test(digits(f.contact))) e.contact = 'Enter a 10-digit mobile number';
  if (f.altContact && !/^\d{10}$/.test(digits(f.altContact))) e.altContact = 'Enter a 10-digit mobile number';
  if (f.coApplicantContact && !/^\d{10}$/.test(digits(f.coApplicantContact))) e.coApplicantContact = 'Enter a 10-digit mobile number';
  if (!f.dedupeCheck) e.dedupeCheck = 'Choose Yes or No';
  if (f.pan && !PAN_RE.test(f.pan.trim().toUpperCase())) e.pan = 'PAN must look like ABCDE1234F';
  if (!f.profile) e.profile = 'Choose the customer profile';
  return e;
}

// form values → API body
export function infoPayload(f) {
  return {
    bankerCaseId: f.bankerCaseId.trim(),
    branchName: f.branchName.trim(),
    branchCode: f.branchCode.trim(),
    customerName: f.customerName.trim(),
    otherNames: f.otherNames.map((n) => n.trim()).filter(Boolean),
    product: productOf(f),
    loanAmount: Number(digits(f.loanAmount)),
    contact: digits(f.contact),
    altContact: digits(f.altContact),
    coApplicantName: f.coApplicantName.trim(),
    coApplicantContact: digits(f.coApplicantContact),
    dedupeCheck: f.dedupeCheck,
    pan: f.pan.trim().toUpperCase(),
    profile: f.profile,
    sourcing: f.sourcing,
    sourcingName: f.sourcingName.trim(),
  };
}

// "2500000" → "25,00,000" while typing
const groupINR = (v) => {
  const d = digits(v);
  return d ? Number(d).toLocaleString('en-IN') : '';
};

export default function CaseInfoFields({ form, setForm, errors = {}, caseId = '' }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e?.target ? e.target.value : e });
  const setName = (i, v) => setForm({ ...form, otherNames: form.otherNames.map((n, j) => (j === i ? v : n)) });
  const addName = () => setForm({ ...form, otherNames: [...form.otherNames, ''] });
  const removeName = (i) => setForm({ ...form, otherNames: form.otherNames.filter((_, j) => j !== i) });
  const amount = Number(digits(form.loanAmount));

  return (
    <>
      <Field label="Banker case ID" required error={errors.bankerCaseId}>
        <input value={form.bankerCaseId} onChange={set('bankerCaseId')} placeholder="Case / application ID from the bank" />
      </Field>
      <Field label="Branch name" required error={errors.branchName}>
        <input value={form.branchName} onChange={set('branchName')} placeholder="e.g. Vidyanagar, Hubballi" />
      </Field>
      <Field label="Branch code" error={errors.branchCode}>
        <input value={form.branchCode} onChange={set('branchCode')} placeholder="If the bank gives one" />
      </Field>
      <Field label="Customer name" required error={errors.customerName}>
        <input value={form.customerName} onChange={set('customerName')} placeholder="As per application" />
      </Field>

      <div className="field span-2 other-names">
        {form.otherNames.map((n, i) => (
          <div key={i} className="other-name">
            <span className="field-label">Additional name {i + 1}</span>
            <div className="other-name-row">
              <input value={n} onChange={(e) => setName(i, e.target.value)} placeholder="Co-borrower / guarantor / family member" autoFocus={!n} />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeName(i)} aria-label={`Remove name ${i + 1}`}>
                <Icon name="x" size={15} />
              </button>
            </div>
          </div>
        ))}
        {errors.otherNames && <span className="field-error">{errors.otherNames}</span>}
        {form.otherNames.length < MAX_OTHER_NAMES && (
          <button type="button" className="link-btn add-name" onClick={addName}>
            <Icon name="plus" size={15} /> Add another name {form.otherNames.length ? `(${MAX_OTHER_NAMES - form.otherNames.length} more)` : `(up to ${MAX_OTHER_NAMES})`}
          </button>
        )}
      </div>

      <Field label="Product name" required error={errors.product}>
        <select value={form.product} onChange={set('product')}>
          <option value="">Choose product</option>
          {PRODUCTS.map((p) => (
            <option key={p}>{p}</option>
          ))}
          <option value={OTHER}>Other (type it)</option>
        </select>
      </Field>
      {form.product === OTHER && (
        <Field label="Type the product" required>
          <input value={form.productOther} onChange={set('productOther')} placeholder="Product name" autoFocus />
        </Field>
      )}
      <Field label="Loan amount (₹)" required error={errors.loanAmount} hint={amount ? inr(amount) : 'Type the amount manually'}>
        <input inputMode="numeric" value={groupINR(form.loanAmount)} onChange={(e) => setForm({ ...form, loanAmount: digits(e.target.value) })} placeholder="e.g. 25,00,000" />
      </Field>
      <Field label="Contact number" required error={errors.contact}>
        <input inputMode="numeric" value={form.contact} onChange={set('contact')} placeholder="10-digit mobile" maxLength={14} />
      </Field>
      <Field label="Alternate contact number" error={errors.altContact} hint="Second number of the customer, if any">
        <input inputMode="numeric" value={form.altContact} onChange={set('altContact')} placeholder="10-digit mobile" maxLength={14} />
      </Field>
      <Field label="Dedupe check" required error={errors.dedupeCheck}>
        <Segmented
          value={form.dedupeCheck}
          onChange={set('dedupeCheck')}
          options={[
            { value: 'Yes', label: 'Yes' },
            { value: 'No', label: 'No' },
          ]}
        />
      </Field>
      <Field label="PAN number" error={errors.pan}>
        <input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} className="mono" />
      </Field>
      <DedupeCheck form={form} setForm={setForm} excludeId={caseId} />
      <Field label="Customer profile" required error={errors.profile}>
        <select value={form.profile} onChange={set('profile')}>
          <option value="">Choose</option>
          {CUSTOMER_PROFILES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      <Field label="DSA / DST">
        <select value={form.sourcing} onChange={set('sourcing')}>
          <option value="">Not given</option>
          {SOURCING_CHANNELS.map((p) => (
            <option key={p} value={p}>{p === 'DSA' ? 'DSA (Direct Selling Agent)' : 'DST (Direct Sales Team)'}</option>
          ))}
        </select>
      </Field>
      <Field label={form.sourcing ? `${form.sourcing} name` : 'DSA / DST name'}>
        <input value={form.sourcingName} onChange={set('sourcingName')} placeholder="Agent / team name" disabled={!form.sourcing} />
      </Field>
      <Field label="Co-applicant name" hint="If any">
        <input value={form.coApplicantName} onChange={set('coApplicantName')} placeholder="As per application" />
      </Field>
      <Field label="Co-applicant contact number" error={errors.coApplicantContact}>
        <input inputMode="numeric" value={form.coApplicantContact} onChange={set('coApplicantContact')} placeholder="10-digit mobile" maxLength={14} />
      </Field>
    </>
  );
}

// Read-only list of the details (case page + report)
export function caseInfoRows(c) {
  return [
    ['Banker case ID', c.bankerCaseId],
    ['Branch', [c.branchName, c.branchCode && `(${c.branchCode})`].filter(Boolean).join(' ')],
    ['Additional names', (c.otherNames || []).join(', ')],
    ['Loan amount', c.loanAmount ? inr(c.loanAmount) : ''],
    ['Alternate contact', c.altContact || ''],
    ['Dedupe check', c.dedupeCheck],
    ['PAN', c.pan],
    ['Customer profile', c.profile],
    ['DSA / DST', [c.sourcing, c.sourcingName && `— ${c.sourcingName}`].filter(Boolean).join(' ')],
  ];
}
