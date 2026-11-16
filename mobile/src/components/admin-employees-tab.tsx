import {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, Pressable, ScrollView, Switch, TextInput, View} from 'react-native';
import {Text} from './typography';
import {ErrorPanel, Loading} from './ui';
import {api} from '../lib/api';
import {useTheme} from '../lib/theme';
import {
  calculateSalaryBreakdown,
  formatInrWhole,
  type EmployeeStatus,
  type EmploymentType,
  type SalaryBreakdown,
} from '../../../shared/hr-payroll';

export interface MobileEmployeeRecord {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  designation: string;
  division: string;
  employment_type: EmploymentType;
  work_location: string;
  joining_date: string;
  probation_months: number;
  notice_period_days: number;
  exit_date: string | null;
  last_working_day: string | null;
  annual_ctc_inr: number;
  pf_applicable: boolean;
  pt_applicable: boolean;
  pf_capped: boolean;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

interface EmployeesListResponse {
  items: MobileEmployeeRecord[];
  summary: {
    total: number;
    active: number;
    relieved: number;
    active_annual_ctc_inr: number;
  };
  suggested_next_code: string;
}

type LetterKind = 'appointment' | 'salary' | 'relieving';

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  permanent: 'Permanent Full-Time',
  probation: 'Probationary Full-Time',
  fixed_term: 'Fixed-Term Contract',
  intern: 'Internship / Trainee',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function escapeHtml(raw: string | number | null | undefined): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildAnnexureHtml({
  emp,
  breakdown,
  issueDate,
  refNo,
  signatoryName,
  signatoryTitle,
  title,
  pageLabel,
  pageBreak,
}: {
  emp: MobileEmployeeRecord;
  breakdown: SalaryBreakdown;
  issueDate: string;
  refNo: string;
  signatoryName: string;
  signatoryTitle: string;
  title: string;
  pageLabel: string;
  pageBreak: boolean;
}): string {
  return `
    <article class="sheet ${pageBreak ? 'page-break' : ''}">
      <header class="letterhead">
        <div>
          <div class="brand-mark">VISTRAH</div>
          <div class="brand-legal">Vistrah Groups Pvt Ltd</div>
        </div>
        <div class="letterhead-right">
          <strong>Vistrah Groups Pvt Ltd</strong>
          <div>Bengaluru, Karnataka, India</div>
          <div>https://vistrah.in &middot; info@vistrah.in</div>
        </div>
      </header>
      <div class="ref-strip">
        <span><strong>Ref:</strong> ${escapeHtml(refNo)}</span>
        <span><strong>Date:</strong> ${escapeHtml(formatLongDate(issueDate))}</span>
      </div>
      <h2 class="doc-heading">${escapeHtml(title)}</h2>
      <div class="meta-grid">
        <div class="meta-cell"><span>Employee Name &amp; Code</span><strong>${escapeHtml(emp.full_name)} (${escapeHtml(emp.employee_code)})</strong></div>
        <div class="meta-cell"><span>Designation &amp; Division</span><strong>${escapeHtml(emp.designation)} &middot; ${escapeHtml(emp.division)}</strong></div>
        <div class="meta-cell"><span>Employment Type &amp; Posting</span><strong>${escapeHtml(EMPLOYMENT_LABELS[emp.employment_type])} &middot; ${escapeHtml(emp.work_location)}</strong></div>
        <div class="meta-cell"><span>Effective / Joining Date</span><strong>${escapeHtml(formatLongDate(emp.joining_date))}</strong></div>
      </div>
      <table class="ctc-table">
        <thead>
          <tr><th>Compensation / Statutory Component</th><th>Monthly (INR)</th><th>Annual (INR)</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Basic Salary</strong> <span class="muted">(${escapeHtml(breakdown.basicShareOfCtcPct)}% of Total CTC &middot; 2026 Wage Code &gt;= 50% rule)</span></td><td>${escapeHtml(formatInrWhole(breakdown.earnings.basic.monthlyInr))}</td><td>${escapeHtml(formatInrWhole(breakdown.earnings.basic.annualInr))}</td></tr>
          <tr><td><strong>House Rent Allowance (HRA)</strong> <span class="muted">(50% of Basic Salary)</span></td><td>${escapeHtml(formatInrWhole(breakdown.earnings.hra.monthlyInr))}</td><td>${escapeHtml(formatInrWhole(breakdown.earnings.hra.annualInr))}</td></tr>
          <tr><td><strong>Special &amp; Flexible Allowance</strong> <span class="muted">(Balancing fixed allowance)</span></td><td>${escapeHtml(formatInrWhole(breakdown.earnings.specialAllowance.monthlyInr))}</td><td>${escapeHtml(formatInrWhole(breakdown.earnings.specialAllowance.annualInr))}</td></tr>
          <tr class="band"><td>Gross Fixed Remuneration (A)</td><td>${escapeHtml(formatInrWhole(breakdown.gross.monthlyInr))}</td><td>${escapeHtml(formatInrWhole(breakdown.gross.annualInr))}</td></tr>
          <tr><td><strong>Employer Provident Fund (EPF — 12%)</strong> <span class="muted">(${escapeHtml(breakdown.employerContributions.employerPf.note)})</span></td><td>${escapeHtml(formatInrWhole(breakdown.employerContributions.employerPf.monthlyInr))}</td><td>${escapeHtml(formatInrWhole(breakdown.employerContributions.employerPf.annualInr))}</td></tr>
          <tr class="total"><td>Total Cost to Company — CTC (A + Employer EPF)</td><td>${escapeHtml(formatInrWhole(breakdown.totalCtc.monthlyInr))}</td><td>${escapeHtml(formatInrWhole(breakdown.totalCtc.annualInr))}</td></tr>
          <tr><td>Less: Employee Provident Fund Deduction (12%) <span class="muted">(${escapeHtml(breakdown.deductions.employeePf.note)})</span></td><td>&minus;${escapeHtml(formatInrWhole(breakdown.deductions.employeePf.monthlyInr))}</td><td>&minus;${escapeHtml(formatInrWhole(breakdown.deductions.employeePf.annualInr))}</td></tr>
          <tr><td>Less: Karnataka Professional Tax (PT) <span class="muted">(${escapeHtml(breakdown.deductions.professionalTax.note)})</span></td><td>&minus;${escapeHtml(formatInrWhole(breakdown.deductions.professionalTax.monthlyInr))}</td><td>&minus;${escapeHtml(formatInrWhole(breakdown.deductions.professionalTax.annualInr))}</td></tr>
          <tr class="band"><td>Total Statutory Deductions (Pre-TDS)</td><td>&minus;${escapeHtml(formatInrWhole(breakdown.deductions.totalMonthlyInr))}</td><td>&minus;${escapeHtml(formatInrWhole(breakdown.deductions.totalAnnualInr))}</td></tr>
          <tr class="total"><td>Estimated Net In-Hand Salary (Take-Home before Income Tax TDS)</td><td>${escapeHtml(formatInrWhole(breakdown.netInHand.monthlyInr))}</td><td>${escapeHtml(formatInrWhole(breakdown.netInHand.annualInr))}</td></tr>
        </tbody>
      </table>
      <p class="clause"><strong>Statutory Notes:</strong> (1) Basic Salary is maintained at &gt;= 50% of total remuneration in accordance with India’s Code on Wages. (2) Income Tax (TDS) applies per chosen tax regime. (3) Gratuity and social security benefits apply per the Code on Social Security.</p>
      <div class="sig-grid">
        <div><strong>For Vistrah Groups Pvt Ltd</strong><div class="sig-space"></div><strong>${escapeHtml(signatoryName)}</strong><div>${escapeHtml(signatoryTitle)}</div></div>
        <div><strong>Acknowledged by Employee</strong><div class="sig-space"></div><strong>${escapeHtml(emp.full_name)}</strong><div>Employee ID: ${escapeHtml(emp.employee_code)}</div></div>
      </div>
      <footer class="sheet-footer">
        <span>Vistrah Groups Pvt Ltd &middot; Confidential HR Compensation Record</span>
        <span>${escapeHtml(pageLabel)} &middot; ${escapeHtml(refNo)}</span>
      </footer>
    </article>
  `;
}

function buildPrintableHtmlDocument({
  emp,
  breakdown,
  kind,
  issueDate,
  signatoryName,
  signatoryTitle,
}: {
  emp: MobileEmployeeRecord;
  breakdown: SalaryBreakdown;
  kind: LetterKind;
  issueDate: string;
  signatoryName: string;
  signatoryTitle: string;
}): string {
  const year = (issueDate || todayIso()).slice(0, 4);
  const docCode = kind === 'appointment' ? 'APPT' : kind === 'salary' ? 'CTC' : 'REL';
  const refNo = `VISTRAH/HR/${year}/${emp.employee_code}/${docCode}`;
  const effectiveLwd = emp.last_working_day || emp.exit_date;

  let bodyHtml = '';
  if (kind === 'appointment') {
    const probationText =
      emp.probation_months > 0
        ? `You will serve an initial probationary period of <strong>${escapeHtml(emp.probation_months)} month(s)</strong> from your joining date. `
        : 'No initial probationary period applies to this appointment. ';
    const pfText = emp.pf_applicable
      ? 'Statutory Employees’ Provident Fund (EPF — 12% employer &amp; 12% employee contribution) applies as shown in Annexure A. '
      : 'EPF is currently marked non-applicable per statutory threshold/opt-out declaration. ';
    const esiText = breakdown.esiApplicableNote
      ? 'As monthly gross wages are within ₹21,000, statutory ESIC coverage applies per ESIC regulations. '
      : 'ESIC does not apply as monthly gross remuneration exceeds the ₹21,000 statutory threshold. ';

    bodyHtml = `
      <article class="sheet">
        <header class="letterhead">
          <div>
            <div class="brand-mark">VISTRAH</div>
            <div class="brand-legal">Vistrah Groups Pvt Ltd</div>
          </div>
          <div class="letterhead-right">
            <strong>Vistrah Groups Pvt Ltd</strong>
            <div>Bengaluru, Karnataka, India</div>
            <div>https://vistrah.in &middot; info@vistrah.in</div>
          </div>
        </header>
        <div class="ref-strip">
          <span><strong>Ref:</strong> ${escapeHtml(refNo)}</span>
          <span><strong>Date:</strong> ${escapeHtml(formatLongDate(issueDate))}</span>
        </div>
        <div class="recipient">
          <div><strong>To,</strong></div>
          <div><strong>${escapeHtml(emp.full_name)}</strong> (${escapeHtml(emp.employee_code)})</div>
          ${emp.address ? `<div>${escapeHtml(emp.address)}</div>` : ''}
          <div>${escapeHtml(emp.email)}${emp.phone ? ` &middot; ${escapeHtml(emp.phone)}` : ''}</div>
        </div>
        <h2 class="doc-heading">Letter of Appointment — ${escapeHtml(emp.designation)} (${escapeHtml(emp.division)})</h2>
        <p>Dear ${escapeHtml(emp.full_name)},</p>
        <p>We are pleased to appoint you with <strong>Vistrah Groups Pvt Ltd</strong> on the terms and statutory conditions set out below:</p>
        <div class="clauses">
          <div class="clause"><strong>01. Legal Employer &amp; Corporate Identity:</strong> Your employment is with <strong>Vistrah Groups Pvt Ltd</strong> (https://vistrah.in), headquartered in Bengaluru, Karnataka, India. Employee ID: <strong>${escapeHtml(emp.employee_code)}</strong>.</div>
          <div class="clause"><strong>02. Designation, Division &amp; Category:</strong> Appointed as <strong>${escapeHtml(emp.designation)}</strong> in the <strong>${escapeHtml(emp.division)}</strong> division under <strong>${escapeHtml(EMPLOYMENT_LABELS[emp.employment_type])}</strong> engagement.</div>
          <div class="clause"><strong>03. Date of Joining &amp; Work Location:</strong> Effective <strong>${escapeHtml(formatLongDate(emp.joining_date))}</strong> at <strong>${escapeHtml(emp.work_location)}</strong>, subject to lawful operational mobility within India.</div>
          <div class="clause"><strong>04. Working Hours &amp; Weekly Rest:</strong> Standard <strong>8 hours per day</strong> and <strong>48 hours per week</strong> with paid weekly rest, governed by the Karnataka Shops &amp; Commercial Establishments Act and OSH &amp; Working Conditions Code.</div>
          <div class="clause"><strong>05. Leave Policy &amp; Paid Holidays:</strong> Entitled to statutory Earned Leave (1 day per 20 days worked), Casual/Sick Leave, Maternity/Parental benefits, and Karnataka National &amp; Festival Holidays.</div>
          <div class="clause"><strong>06. Probation &amp; Symmetrical Notice Period:</strong> ${probationText}Either party (Vistrah Groups Pvt Ltd or Employee) may terminate employment via symmetrical <strong>${escapeHtml(emp.notice_period_days)} days</strong> written notice or proportionate salary in lieu thereof.</div>
          <div class="clause"><strong>07. Two (2) Working-Day Full &amp; Final Settlement:</strong> Under the Code on Wages, upon resignation, tenure completion, or separation, all earned wages payable shall be settled within <strong>two (2) working days</strong> from your confirmed Last Working Day upon asset handover.</div>
          <div class="clause"><strong>08. Remuneration (50% Basic Wage Rule) &amp; Statutory Benefits:</strong> Annual CTC is <strong>${escapeHtml(formatInrWhole(breakdown.totalCtc.annualInr))}</strong> per annum (Annexure A), with Basic Salary &gt;= 50% of total remuneration. ${pfText}${esiText}Karnataka PT and TDS apply per law.</div>
          <div class="clause"><strong>09. Confidentiality, DPDP Act 2023 &amp; IP Assignment:</strong> Strict confidentiality and personal data stewardship under the DPDP Act, 2023 apply. All work-product IP created during employment vests exclusively in <strong>Vistrah Groups Pvt Ltd</strong>. Jurisdiction: Bengaluru, Karnataka.</div>
        </div>
        <div class="sig-grid">
          <div><strong>For Vistrah Groups Pvt Ltd</strong><div class="sig-space"></div><strong>${escapeHtml(signatoryName)}</strong><div>${escapeHtml(signatoryTitle)}</div></div>
          <div><strong>Employee Acceptance &amp; Declaration</strong><div class="sig-space"></div><strong>${escapeHtml(emp.full_name)}</strong><div>Employee ID: ${escapeHtml(emp.employee_code)} &middot; Date: _____________</div></div>
        </div>
        <footer class="sheet-footer">
          <span>Vistrah Groups Pvt Ltd &middot; Bengaluru, Karnataka, India</span>
          <span>Page 1 of 2 &middot; ${escapeHtml(refNo)}</span>
        </footer>
      </article>
      ${buildAnnexureHtml({
        emp,
        breakdown,
        issueDate,
        refNo: `${refNo}-ANNEX-A`,
        signatoryName,
        signatoryTitle,
        title: 'Annexure A — Compensation & Statutory CTC Structure',
        pageLabel: 'Page 2 of 2',
        pageBreak: true,
      })}
    `;
  } else if (kind === 'salary') {
    bodyHtml = buildAnnexureHtml({
      emp,
      breakdown,
      issueDate,
      refNo,
      signatoryName,
      signatoryTitle,
      title: 'Compensation & Statutory CTC Breakdown Statement',
      pageLabel: 'Page 1 of 1',
      pageBreak: false,
    });
  } else {
    bodyHtml = `
      <article class="sheet">
        <header class="letterhead">
          <div>
            <div class="brand-mark">VISTRAH</div>
            <div class="brand-legal">Vistrah Groups Pvt Ltd</div>
          </div>
          <div class="letterhead-right">
            <strong>Vistrah Groups Pvt Ltd</strong>
            <div>Bengaluru, Karnataka, India</div>
            <div>https://vistrah.in &middot; info@vistrah.in</div>
          </div>
        </header>
        <div class="ref-strip">
          <span><strong>Ref:</strong> ${escapeHtml(refNo)}</span>
          <span><strong>Date of Issue:</strong> ${escapeHtml(formatLongDate(issueDate))}</span>
        </div>
        <div class="recipient">
          <div><strong>${escapeHtml(emp.full_name)}</strong></div>
          <div>Employee Code: ${escapeHtml(emp.employee_code)}</div>
          ${emp.address ? `<div>${escapeHtml(emp.address)}</div>` : ''}
          <div>${escapeHtml(emp.email)}</div>
        </div>
        <h2 class="doc-heading">Relieving Letter &amp; Experience Certificate</h2>
        <p><strong>TO WHOMSOEVER IT MAY CONCERN</strong></p>
        <div class="meta-grid">
          <div class="meta-cell"><span>Employee Name &amp; ID</span><strong>${escapeHtml(emp.full_name)} (${escapeHtml(emp.employee_code)})</strong></div>
          <div class="meta-cell"><span>Last Held Designation</span><strong>${escapeHtml(emp.designation)}</strong></div>
          <div class="meta-cell"><span>Division &amp; Location</span><strong>${escapeHtml(emp.division)} &middot; ${escapeHtml(emp.work_location)}</strong></div>
          <div class="meta-cell"><span>Employment Category</span><strong>${escapeHtml(EMPLOYMENT_LABELS[emp.employment_type])}</strong></div>
          <div class="meta-cell"><span>Date of Joining</span><strong>${escapeHtml(formatLongDate(emp.joining_date))}</strong></div>
          <div class="meta-cell"><span>Last Working Day</span><strong>${escapeHtml(effectiveLwd ? formatLongDate(effectiveLwd) : 'Pending Clearance Date')}</strong></div>
        </div>
        <div class="clauses">
          <p class="clause">This is to certify that <strong>${escapeHtml(emp.full_name)}</strong> (Employee Code: <strong>${escapeHtml(emp.employee_code)}</strong>) was employed with <strong>Vistrah Groups Pvt Ltd</strong> from <strong>${escapeHtml(formatLongDate(emp.joining_date))}</strong> to <strong>${escapeHtml(effectiveLwd ? formatLongDate(effectiveLwd) : '[Last Working Day]')}</strong>, last holding the designation of <strong>${escapeHtml(emp.designation)}</strong> in the <strong>${escapeHtml(emp.division)}</strong> division at <strong>${escapeHtml(emp.work_location)}</strong>.</p>
          <p class="clause">We confirm formal completion of handover of duties, company assets, and credentials, and certify that ${escapeHtml(emp.full_name)} stands relieved effective close of business hours on <strong>${escapeHtml(effectiveLwd ? formatLongDate(effectiveLwd) : '[Last Working Day]')}</strong>, with Full &amp; Final settlement processed under Code on Wages norms and zero pending dues.</p>
          <p class="clause">During this tenure with <strong>Vistrah Groups Pvt Ltd</strong>, ${escapeHtml(emp.full_name)} demonstrated professionalism, sincerity, and diligence. We wish every success in future endeavours.</p>
        </div>
        <div class="sig-grid">
          <div><strong>For Vistrah Groups Pvt Ltd</strong><div class="sig-space"></div><strong>${escapeHtml(signatoryName)}</strong><div>${escapeHtml(signatoryTitle)}</div></div>
          <div><strong>Corporate Seal / Stamp</strong><div class="sig-space"></div><div>Vistrah Groups Pvt Ltd &middot; Bengaluru</div><div>Issued: ${escapeHtml(formatLongDate(issueDate))}</div></div>
        </div>
        <footer class="sheet-footer">
          <span>Vistrah Groups Pvt Ltd &middot; https://vistrah.in &middot; Bengaluru, Karnataka</span>
          <span>Page 1 of 1 &middot; ${escapeHtml(refNo)}</span>
        </footer>
      </article>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(emp.employee_code)} — ${escapeHtml(kind.toUpperCase())} — Vistrah Groups Pvt Ltd</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #fff; color: #0f172a; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 9.4pt; line-height: 1.46; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sheet { width: 100%; max-width: 190mm; margin: 0 auto; }
    .page-break { break-before: page; page-break-before: always; padding-top: 2mm; }
    .letterhead { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
    .brand-mark { font-size: 16pt; font-weight: 800; letter-spacing: -0.03em; }
    .brand-legal { font-size: 7.5pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #334155; }
    .letterhead-right { text-align: right; font-size: 8pt; color: #334155; }
    .ref-strip { display: flex; justify-content: space-between; font-size: 8.5pt; color: #334155; margin-bottom: 10px; font-variant-numeric: tabular-nums; }
    .recipient { margin-bottom: 10px; font-size: 9pt; }
    .doc-heading { font-size: 11.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: -0.02em; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin: 8px 0 10px; }
    .clauses { display: flex; flex-direction: column; gap: 7px; margin: 8px 0 14px; }
    .clause { font-size: 8.9pt; color: #1e293b; margin: 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; margin: 8px 0 12px; font-size: 8.5pt; }
    .meta-cell { padding: 6px 9px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
    .meta-cell:nth-child(2n) { border-right: 0; }
    .meta-cell span { display: block; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
    .ctc-table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 8.5pt; font-variant-numeric: tabular-nums; }
    .ctc-table th, .ctc-table td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right; }
    .ctc-table th:first-child, .ctc-table td:first-child { text-align: left; }
    .ctc-table th { background: #f1f5f9; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.05em; }
    .ctc-table tr.band td { background: #f8fafc; font-weight: 600; }
    .ctc-table tr.total td { background: #ecf5f1; font-weight: 700; }
    .muted { color: #475569; font-weight: 400; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 18px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 8.5pt; }
    .sig-space { height: 32px; border-bottom: 1px dashed #94a3b8; margin-bottom: 4px; }
    .sheet-footer { margin-top: 14px; padding-top: 6px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 7.25pt; color: #475569; }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

function triggerWebA4Print(htmlDoc: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc || !iframe.contentWindow) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(htmlDoc);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 3000);
  }, 200);
}

export function AdminEmployeesTab() {
  const {mode} = useTheme();
  const isDark = mode === 'dark';
  const surface = isDark ? '#1e293b' : '#ffffff';
  const subtle = isDark ? '#0f172a' : '#f8fafc';
  const border = isDark ? '#334155' : '#e2e8f0';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const accent = isDark ? '#10b981' : '#173f35';

  const [items, setItems] = useState<MobileEmployeeRecord[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    relieved: 0,
    active_annual_ctc_inr: 0,
  });
  const [suggestedCode, setSuggestedCode] = useState('VST-EMP-001');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'relieved'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [viewMode, setViewMode] = useState<'directory' | 'form' | 'letter'>('directory');
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form fields
  const [employeeCode, setEmployeeCode] = useState('VST-EMP-001');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [designation, setDesignation] = useState('');
  const [division, setDivision] = useState('Platform Engineering');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('permanent');
  const [workLocation, setWorkLocation] = useState('Bengaluru, Karnataka');
  const [joiningDate, setJoiningDate] = useState(todayIso());
  const [probationMonths, setProbationMonths] = useState('3');
  const [noticePeriodDays, setNoticePeriodDays] = useState('30');
  const [exitDate, setExitDate] = useState('');
  const [lastWorkingDay, setLastWorkingDay] = useState('');
  const [annualCtcStr, setAnnualCtcStr] = useState('600000');
  const [pfApplicable, setPfApplicable] = useState(true);
  const [ptApplicable, setPtApplicable] = useState(true);
  const [pfCapped, setPfCapped] = useState(true);
  const [empStatus, setEmpStatus] = useState<EmployeeStatus>('active');

  // Letter preview state
  const [letterEmployeeId, setLetterEmployeeId] = useState<number | null>(null);
  const [letterKind, setLetterKind] = useState<LetterKind>('appointment');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [signatoryName, setSignatoryName] = useState('Authorized Signatory');
  const [signatoryTitle, setSignatoryTitle] = useState(
    'Human Resources · Vistrah Groups Pvt Ltd',
  );

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<EmployeesListResponse>(
        `/admin/employees?status=${encodeURIComponent(statusFilter)}&q=${encodeURIComponent(
          search.trim(),
        )}`,
      );
      setItems(res.items || []);
      setSummary(res.summary);
      setSuggestedCode(res.suggested_next_code || 'VST-EMP-001');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const formBreakdown = useMemo(
    () =>
      calculateSalaryBreakdown(Math.max(0, Number(annualCtcStr) || 0), {
        pfApplicable,
        ptApplicable,
        pfCapped,
      }),
    [annualCtcStr, pfApplicable, ptApplicable, pfCapped],
  );

  const activeLetterEmp = useMemo(
    () => items.find(i => i.id === letterEmployeeId) ?? null,
    [items, letterEmployeeId],
  );

  const letterBreakdown = useMemo(() => {
    if (!activeLetterEmp) return null;
    return calculateSalaryBreakdown(activeLetterEmp.annual_ctc_inr, {
      pfApplicable: activeLetterEmp.pf_applicable,
      ptApplicable: activeLetterEmp.pt_applicable,
      pfCapped: activeLetterEmp.pf_capped,
    });
  }, [activeLetterEmp]);

  function openCreate() {
    setError('');
    setNotice('');
    setEditingId(null);
    setEmployeeCode(suggestedCode);
    setFullName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setDesignation('');
    setDivision('Platform Engineering');
    setEmploymentType('permanent');
    setWorkLocation('Bengaluru, Karnataka');
    setJoiningDate(todayIso());
    setProbationMonths('3');
    setNoticePeriodDays('30');
    setExitDate('');
    setLastWorkingDay('');
    setAnnualCtcStr('600000');
    setPfApplicable(true);
    setPtApplicable(true);
    setPfCapped(true);
    setEmpStatus('active');
    setViewMode('form');
  }

  function openEdit(emp: MobileEmployeeRecord) {
    setError('');
    setNotice('');
    setEditingId(emp.id);
    setEmployeeCode(emp.employee_code);
    setFullName(emp.full_name);
    setEmail(emp.email);
    setPhone(emp.phone || '');
    setAddress(emp.address || '');
    setDesignation(emp.designation);
    setDivision(emp.division);
    setEmploymentType(emp.employment_type);
    setWorkLocation(emp.work_location);
    setJoiningDate(emp.joining_date);
    setProbationMonths(String(emp.probation_months));
    setNoticePeriodDays(String(emp.notice_period_days));
    setExitDate(emp.exit_date || '');
    setLastWorkingDay(emp.last_working_day || '');
    setAnnualCtcStr(String(emp.annual_ctc_inr));
    setPfApplicable(emp.pf_applicable);
    setPtApplicable(emp.pt_applicable);
    setPfCapped(emp.pf_capped ?? true);
    setEmpStatus(emp.status);
    setViewMode('form');
  }

  function openLetter(emp: MobileEmployeeRecord, kind: LetterKind) {
    setError('');
    setNotice('');
    setLetterEmployeeId(emp.id);
    setLetterKind(kind);
    setViewMode('letter');
  }

  async function saveEmployee() {
    if (!fullName.trim() || !email.trim() || !designation.trim() || !division.trim()) {
      setError('Full Name, Email, Designation, and Division are required.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        employee_code: employeeCode.trim().toUpperCase() || null,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        designation: designation.trim(),
        division: division.trim(),
        employment_type: employmentType,
        work_location: workLocation.trim() || 'Bengaluru, Karnataka',
        joining_date: joiningDate,
        probation_months: Math.max(0, Number(probationMonths) || 0),
        notice_period_days: Math.max(0, Number(noticePeriodDays) || 0),
        exit_date: exitDate.trim() || null,
        last_working_day: lastWorkingDay.trim() || null,
        annual_ctc_inr: Math.max(0, Math.round(Number(annualCtcStr) || 0)),
        pf_applicable: pfApplicable,
        pt_applicable: ptApplicable,
        pf_capped: pfCapped,
        status: empStatus,
      };
      if (editingId !== null) {
        await api(`/admin/employees/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setNotice(`Updated employee ${payload.employee_code || ''}.`);
      } else {
        const created = await api<MobileEmployeeRecord>('/admin/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setNotice(`Created employee ${created.employee_code} (${created.full_name}).`);
      }
      await loadEmployees();
      setViewMode('directory');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteEmployee(emp: MobileEmployeeRecord) {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/employees/${emp.id}`, {method: 'DELETE'});
      setNotice(`Removed employee ${emp.employee_code}.`);
      await loadEmployees();
      setViewMode('directory');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: border,
    borderRadius: 8,
    backgroundColor: subtle,
    color: textPrimary,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 13,
  } as const;

  // ---------------------------------------------------------------------------
  // 1. LETTERHEAD PREVIEW + PRINT / SAVE A4 PDF VIEW
  // ---------------------------------------------------------------------------
  if (viewMode === 'letter' && activeLetterEmp && letterBreakdown) {
    const effectiveLwd = activeLetterEmp.last_working_day || activeLetterEmp.exit_date;
    return (
      <View style={{gap: 12}}>
        <View
          style={{
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
            gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <Pressable
              onPress={() => setViewMode('directory')}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: border,
              }}
            >
              <Text style={{color: textPrimary, fontSize: 12, fontWeight: '600'}}>
                ← Back to Employees
              </Text>
            </Pressable>

            <View style={{flexDirection: 'row', gap: 8}}>
              <Pressable
                onPress={() => openEdit(activeLetterEmp)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: border,
                }}
              >
                <Text style={{color: textPrimary, fontSize: 12, fontWeight: '600'}}>
                  Edit Record
                </Text>
              </Pressable>

              {Platform.OS === 'web' && (
                <Pressable
                  onPress={() =>
                    triggerWebA4Print(
                      buildPrintableHtmlDocument({
                        emp: activeLetterEmp,
                        breakdown: letterBreakdown,
                        kind: letterKind,
                        issueDate,
                        signatoryName,
                        signatoryTitle,
                      }),
                    )
                  }
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    backgroundColor: accent,
                  }}
                >
                  <Text style={{color: '#ffffff', fontSize: 12, fontWeight: '700'}}>
                    Print / Save A4 PDF
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{gap: 6}}
          >
            {(
              [
                {id: 'appointment', label: 'Appointment + CTC'},
                {id: 'salary', label: 'Salary Annexure'},
                {id: 'relieving', label: 'Relieving & Experience'},
              ] as const
            ).map(t => {
              const active = letterKind === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setLetterKind(t.id)}
                  style={{
                    paddingVertical: 7,
                    paddingHorizontal: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: active ? accent : border,
                    backgroundColor: active ? accent : subtle,
                  }}
                >
                  <Text
                    style={{
                      color: active ? '#fff' : textPrimary,
                      fontSize: 12,
                      fontWeight: '600',
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
            <View style={{flex: 1, minWidth: 130, gap: 4}}>
              <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>
                Issue Date (YYYY-MM-DD)
              </Text>
              <TextInput
                value={issueDate}
                onChangeText={setIssueDate}
                style={inputStyle}
                placeholder="2026-11-16"
                placeholderTextColor={textSecondary}
              />
            </View>
            <View style={{flex: 1, minWidth: 150, gap: 4}}>
              <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>
                Signatory Name
              </Text>
              <TextInput
                value={signatoryName}
                onChangeText={setSignatoryName}
                style={inputStyle}
                placeholderTextColor={textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Clean Letterhead Preview Card */}
        <View
          style={{
            padding: 18,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#cbd5e1',
            backgroundColor: '#ffffff',
            gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              borderBottomWidth: 1.5,
              borderBottomColor: '#0f172a',
              paddingBottom: 10,
            }}
          >
            <View>
              <Text style={{color: '#0f172a', fontSize: 18, fontWeight: '800'}}>
                VISTRAH
              </Text>
              <Text
                style={{
                  color: '#475569',
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 1,
                }}
              >
                VISTRAH GROUPS PVT LTD
              </Text>
            </View>
            <View style={{alignItems: 'flex-end'}}>
              <Text style={{color: '#0f172a', fontSize: 11, fontWeight: '700'}}>
                Bengaluru, Karnataka, India
              </Text>
              <Text style={{color: '#475569', fontSize: 11}}>
                https://vistrah.in · info@vistrah.in
              </Text>
            </View>
          </View>

          <Text style={{color: '#0f172a', fontSize: 14, fontWeight: '700'}}>
            {letterKind === 'appointment'
              ? `LETTER OF APPOINTMENT — ${activeLetterEmp.designation.toUpperCase()}`
              : letterKind === 'salary'
                ? 'COMPENSATION & STATUTORY CTC BREAKDOWN'
                : 'RELIEVING LETTER & EXPERIENCE CERTIFICATE'}
          </Text>

          <Text style={{color: '#334155', fontSize: 12, lineHeight: 18}}>
            Employee: {activeLetterEmp.full_name} ({activeLetterEmp.employee_code}) ·{' '}
            {activeLetterEmp.division} · {EMPLOYMENT_LABELS[activeLetterEmp.employment_type]} ·
            Joined {formatLongDate(activeLetterEmp.joining_date)}
            {effectiveLwd ? ` · LWD ${formatLongDate(effectiveLwd)}` : ''}
          </Text>

          {letterKind === 'appointment' && (
            <View style={{gap: 6}}>
              <Text style={{color: '#1e293b', fontSize: 12, lineHeight: 18}}>
                • Includes all 9 mandatory Indian Labour Code clauses: Legal employer Vistrah
                Groups Pvt Ltd, Designation &amp; Division, Joining Date &amp; Location, 8h/day
                &amp; 48h/week Working Hours, Earned/Casual/Sick Leave,{' '}
                {activeLetterEmp.probation_months}m Probation &amp; symmetrical{' '}
                {activeLetterEmp.notice_period_days}-day Notice, 2-working-day F&amp;F wage
                settlement, 50% Basic Wage Code + EPF/ESIC/PT disclosures, and DPDP 2023 + IP
                assignment + Page 2 Annexure A.
              </Text>
            </View>
          )}

          {letterKind === 'relieving' && (
            <Text style={{color: '#1e293b', fontSize: 12, lineHeight: 18}}>
              Certifies that {activeLetterEmp.full_name} ({activeLetterEmp.employee_code}) served
              as {activeLetterEmp.designation} ({activeLetterEmp.division}) from{' '}
              {formatLongDate(activeLetterEmp.joining_date)} to{' '}
              {effectiveLwd ? formatLongDate(effectiveLwd) : '[Set Last Working Day]'}, with full
              handover clearance and Code on Wages F&amp;F settlement.
            </Text>
          )}

          {(letterKind === 'appointment' || letterKind === 'salary') && (
            <View
              style={{
                borderWidth: 1,
                borderColor: '#cbd5e1',
                borderRadius: 8,
                padding: 12,
                gap: 6,
                backgroundColor: '#f8fafc',
              }}
            >
              <Text
                style={{
                  color: '#0f172a',
                  fontSize: 12,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }}
              >
                CTC Breakdown ({letterBreakdown.basicShareOfCtcPct}% Basic Wage Rule)
              </Text>
              <Text style={{color: '#334155', fontSize: 12, fontVariant: ['tabular-nums']}}>
                Basic: {formatInrWhole(letterBreakdown.earnings.basic.monthlyInr)}/mo (
                {formatInrWhole(letterBreakdown.earnings.basic.annualInr)}/yr)
              </Text>
              <Text style={{color: '#334155', fontSize: 12, fontVariant: ['tabular-nums']}}>
                HRA: {formatInrWhole(letterBreakdown.earnings.hra.monthlyInr)}/mo · Special:{' '}
                {formatInrWhole(letterBreakdown.earnings.specialAllowance.monthlyInr)}/mo
              </Text>
              <Text style={{color: '#0f172a', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums']}}>
                Gross: {formatInrWhole(letterBreakdown.gross.monthlyInr)}/mo (
                {formatInrWhole(letterBreakdown.gross.annualInr)}/yr)
              </Text>
              <Text style={{color: '#334155', fontSize: 12, fontVariant: ['tabular-nums']}}>
                Employer PF: {formatInrWhole(letterBreakdown.employerContributions.employerPf.monthlyInr)}/mo · Employee PF: −{formatInrWhole(letterBreakdown.deductions.employeePf.monthlyInr)}/mo · PT: −{formatInrWhole(letterBreakdown.deductions.professionalTax.monthlyInr)}/mo
              </Text>
              <Text style={{color: '#14532d', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums']}}>
                Net In-Hand: {formatInrWhole(letterBreakdown.netInHand.monthlyInr)}/mo · Total CTC:{' '}
                {formatInrWhole(letterBreakdown.totalCtc.annualInr)}/yr
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. ADD / EDIT FORM + LIVE 2026 CTC BREAKDOWN PREVIEW
  // ---------------------------------------------------------------------------
  if (viewMode === 'form') {
    return (
      <View style={{gap: 12}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Pressable
            onPress={() => setViewMode('directory')}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: surface,
            }}
          >
            <Text style={{color: textPrimary, fontSize: 12, fontWeight: '600'}}>
              ← Back to Directory
            </Text>
          </Pressable>
          <Text style={{color: textSecondary, fontSize: 12, fontWeight: '700'}}>
            {editingId !== null ? `Editing ${employeeCode}` : `New Record (${employeeCode})`}
          </Text>
        </View>

        {Boolean(error) && <ErrorPanel error={error} />}

        {/* Live CTC Calculator Card */}
        <View
          style={{
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
            gap: 6,
          }}
        >
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{color: textPrimary, fontSize: 14, fontWeight: '700'}}>
              2026 Indian Labour Code CTC Preview
            </Text>
            <Text style={{color: accent, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums']}}>
              Basic {formBreakdown.basicShareOfCtcPct}% CTC
            </Text>
          </View>
          <Text style={{color: textSecondary, fontSize: 12, fontVariant: ['tabular-nums']}}>
            Basic: {formatInrWhole(formBreakdown.earnings.basic.monthlyInr)}/mo · HRA:{' '}
            {formatInrWhole(formBreakdown.earnings.hra.monthlyInr)}/mo · Special:{' '}
            {formatInrWhole(formBreakdown.earnings.specialAllowance.monthlyInr)}/mo
          </Text>
          <Text style={{color: textPrimary, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums']}}>
            Gross: {formatInrWhole(formBreakdown.gross.monthlyInr)}/mo · Deductions: −
            {formatInrWhole(formBreakdown.deductions.totalMonthlyInr)}/mo · Net In-Hand:{' '}
            {formatInrWhole(formBreakdown.netInHand.monthlyInr)}/mo (
            {formatInrWhole(formBreakdown.totalCtc.annualInr)}/yr CTC)
          </Text>
        </View>

        {/* Form Card */}
        <View
          style={{
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
            gap: 10,
          }}
        >
          <Text style={{color: textPrimary, fontSize: 15, fontWeight: '700'}}>
            {editingId !== null ? 'Edit Employee Profile' : 'Add Internal Employee'}
          </Text>

          <View style={{gap: 4}}>
            <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Employee Code</Text>
            <TextInput value={employeeCode} onChangeText={t => setEmployeeCode(t.toUpperCase())} style={inputStyle} />
          </View>

          <View style={{gap: 4}}>
            <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Full Legal Name *</Text>
            <TextInput value={fullName} onChangeText={setFullName} placeholder="e.g. Aarav Rao" placeholderTextColor={textSecondary} style={inputStyle} />
          </View>

          <View style={{gap: 4}}>
            <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Email *</Text>
            <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="name@vistrah.in" placeholderTextColor={textSecondary} style={inputStyle} />
          </View>

          <View style={{gap: 4}}>
            <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Phone</Text>
            <TextInput value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor={textSecondary} style={inputStyle} />
          </View>

          <View style={{gap: 4}}>
            <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Residential Address</Text>
            <TextInput value={address} onChangeText={setAddress} multiline placeholder="Street, City, State & PIN" placeholderTextColor={textSecondary} style={[inputStyle, {minHeight: 56}]} />
          </View>

          <View style={{gap: 4}}>
            <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Designation *</Text>
            <TextInput value={designation} onChangeText={setDesignation} placeholder="e.g. Senior Full-Stack Engineer" placeholderTextColor={textSecondary} style={inputStyle} />
          </View>

          <View style={{gap: 4}}>
            <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Division *</Text>
            <TextInput value={division} onChangeText={setDivision} placeholder="Platform Engineering" placeholderTextColor={textSecondary} style={inputStyle} />
          </View>

          <View style={{gap: 4}}>
            <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Employment Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 6}}>
              {(['permanent', 'probation', 'fixed_term', 'intern'] as const).map(tp => {
                const active = employmentType === tp;
                return (
                  <Pressable
                    key={tp}
                    onPress={() => setEmploymentType(tp)}
                    style={{
                      paddingVertical: 7,
                      paddingHorizontal: 11,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: active ? accent : border,
                      backgroundColor: active ? accent : subtle,
                    }}
                  >
                    <Text style={{color: active ? '#fff' : textPrimary, fontSize: 12, fontWeight: '600'}}>
                      {EMPLOYMENT_LABELS[tp]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{gap: 4}}>
            <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Work Location</Text>
            <TextInput value={workLocation} onChangeText={setWorkLocation} style={inputStyle} />
          </View>

          <View style={{flexDirection: 'row', gap: 8}}>
            <View style={{flex: 1, gap: 4}}>
              <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Joining Date</Text>
              <TextInput value={joiningDate} onChangeText={setJoiningDate} placeholder="YYYY-MM-DD" style={inputStyle} />
            </View>
            <View style={{flex: 1, gap: 4}}>
              <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Annual CTC (₹)</Text>
              <TextInput value={annualCtcStr} onChangeText={setAnnualCtcStr} keyboardType="numeric" style={inputStyle} />
            </View>
          </View>

          <View style={{flexDirection: 'row', gap: 8}}>
            <View style={{flex: 1, gap: 4}}>
              <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Probation (Months)</Text>
              <TextInput value={probationMonths} onChangeText={setProbationMonths} keyboardType="numeric" style={inputStyle} />
            </View>
            <View style={{flex: 1, gap: 4}}>
              <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Notice (Days)</Text>
              <TextInput value={noticePeriodDays} onChangeText={setNoticePeriodDays} keyboardType="numeric" style={inputStyle} />
            </View>
          </View>

          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4}}>
            <Text style={{color: textPrimary, fontSize: 12, fontWeight: '600'}}>EPF Applicable (12% Emp + 12% Er)</Text>
            <Switch value={pfApplicable} onValueChange={setPfApplicable} />
          </View>

          {pfApplicable && (
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4}}>
              <Text style={{color: textPrimary, fontSize: 12, fontWeight: '600'}}>Cap EPF at ₹15,000/mo Ceiling</Text>
              <Switch value={pfCapped} onValueChange={setPfCapped} />
            </View>
          )}

          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4}}>
            <Text style={{color: textPrimary, fontSize: 12, fontWeight: '600'}}>Karnataka PT (₹200/mo &gt;= ₹25k Gross)</Text>
            <Switch value={ptApplicable} onValueChange={setPtApplicable} />
          </View>

          <View style={{flexDirection: 'row', gap: 8}}>
            {(['active', 'relieved'] as const).map(st => {
              const active = empStatus === st;
              return (
                <Pressable
                  key={st}
                  onPress={() => setEmpStatus(st)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: active ? accent : border,
                    backgroundColor: active ? accent : subtle,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{color: active ? '#fff' : textPrimary, fontSize: 12, fontWeight: '700'}}>
                    {st === 'active' ? 'Active' : 'Relieved'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{flexDirection: 'row', gap: 8}}>
            <View style={{flex: 1, gap: 4}}>
              <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Exit Date (Optional)</Text>
              <TextInput value={exitDate} onChangeText={setExitDate} placeholder="YYYY-MM-DD" placeholderTextColor={textSecondary} style={inputStyle} />
            </View>
            <View style={{flex: 1, gap: 4}}>
              <Text style={{fontSize: 11, color: textSecondary, fontWeight: '600'}}>Last Working Day</Text>
              <TextInput value={lastWorkingDay} onChangeText={setLastWorkingDay} placeholder="YYYY-MM-DD" placeholderTextColor={textSecondary} style={inputStyle} />
            </View>
          </View>

          <View style={{flexDirection: 'row', gap: 8, marginTop: 6}}>
            <Pressable
              disabled={busy}
              onPress={() => void saveEmployee()}
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: 8,
                backgroundColor: accent,
                alignItems: 'center',
              }}
            >
              <Text style={{color: '#fff', fontSize: 13, fontWeight: '700'}}>
                {busy ? 'Saving…' : editingId !== null ? 'Save Employee' : 'Create Employee'}
              </Text>
            </Pressable>

            {editingId !== null && (
              <Pressable
                disabled={busy}
                onPress={() => {
                  const found = items.find(i => i.id === editingId);
                  if (found) void deleteEmployee(found);
                }}
                style={{
                  paddingVertical: 11,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#dc2626',
                  alignItems: 'center',
                }}
              >
                <Text style={{color: '#dc2626', fontSize: 12, fontWeight: '700'}}>Delete</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. DIRECTORY VIEW
  // ---------------------------------------------------------------------------
  return (
    <View style={{gap: 12}}>
      {/* KPI Strip */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: surface,
          overflow: 'hidden',
        }}
      >
        <View style={{flex: 1, minWidth: 130, padding: 12, borderRightWidth: 1, borderRightColor: border}}>
          <Text style={{color: textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8}}>
            ACTIVE STAFF
          </Text>
          <Text style={{color: textPrimary, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums']}}>
            {summary.active} / {summary.total}
          </Text>
        </View>
        <View style={{flex: 1, minWidth: 150, padding: 12}}>
          <Text style={{color: textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.8}}>
            ACTIVE ANNUAL CTC
          </Text>
          <Text style={{color: textPrimary, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums']}}>
            {formatInrWhole(summary.active_annual_ctc_inr)}
          </Text>
        </View>
      </View>

      {Boolean(notice) && (
        <View style={{padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#86efac', backgroundColor: '#f0fdf4'}}>
          <Text style={{color: '#14532d', fontSize: 12, fontWeight: '600'}}>{notice}</Text>
        </View>
      )}
      {Boolean(error) && <ErrorPanel error={error} />}

      {/* Filter & Add Button */}
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
        <View style={{flexDirection: 'row', gap: 6}}>
          {(['all', 'active', 'relieved'] as const).map(st => {
            const active = statusFilter === st;
            return (
              <Pressable
                key={st}
                onPress={() => setStatusFilter(st)}
                style={{
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: active ? accent : border,
                  backgroundColor: active ? accent : surface,
                }}
              >
                <Text style={{color: active ? '#fff' : textPrimary, fontSize: 12, fontWeight: '600'}}>
                  {st === 'all' ? 'All' : st === 'active' ? 'Active' : 'Relieved'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={openCreate}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 8,
            backgroundColor: accent,
          }}
        >
          <Text style={{color: '#fff', fontSize: 12, fontWeight: '700'}}>+ Add Employee</Text>
        </Pressable>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search employee code, name, role, division…"
        placeholderTextColor={textSecondary}
        style={inputStyle}
      />

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <View
          style={{
            padding: 24,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            backgroundColor: surface,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{color: textPrimary, fontSize: 14, fontWeight: '700'}}>
            No employee records yet
          </Text>
          <Text style={{color: textSecondary, fontSize: 12, textAlign: 'center'}}>
            Add internal Vistrah Groups Pvt Ltd employees to calculate 2026 Wage Code CTC breakdowns
            and print A4 Appointment, Salary, and Relieving PDFs.
          </Text>
        </View>
      ) : (
        items.map(emp => {
          const calc = calculateSalaryBreakdown(emp.annual_ctc_inr, {
            pfApplicable: emp.pf_applicable,
            ptApplicable: emp.pt_applicable,
            pfCapped: emp.pf_capped,
          });
          return (
            <View
              key={emp.id}
              style={{
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: border,
                backgroundColor: surface,
                gap: 8,
              }}
            >
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={{color: accent, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums']}}>
                  {emp.employee_code} · {emp.status.toUpperCase()}
                </Text>
                <Text style={{color: textPrimary, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums']}}>
                  {formatInrWhole(calc.totalCtc.annualInr)}/yr
                </Text>
              </View>

              <Text style={{color: textPrimary, fontSize: 15, fontWeight: '700'}}>
                {emp.full_name}
              </Text>
              <Text style={{color: textSecondary, fontSize: 12}}>
                {emp.designation} · {emp.division} · {emp.work_location}
              </Text>
              <Text style={{color: textSecondary, fontSize: 11, fontVariant: ['tabular-nums']}}>
                Joined {formatLongDate(emp.joining_date)} · Net In-Hand:{' '}
                {formatInrWhole(calc.netInHand.monthlyInr)}/mo
              </Text>

              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4}}>
                <Pressable
                  onPress={() => openLetter(emp, 'appointment')}
                  style={{paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: subtle}}
                >
                  <Text style={{color: textPrimary, fontSize: 11, fontWeight: '600'}}>
                    Appointment Letter
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => openLetter(emp, 'salary')}
                  style={{paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: subtle}}
                >
                  <Text style={{color: textPrimary, fontSize: 11, fontWeight: '600'}}>
                    Salary Annexure
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => openLetter(emp, 'relieving')}
                  style={{paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: subtle}}
                >
                  <Text style={{color: textPrimary, fontSize: 11, fontWeight: '600'}}>
                    Relieving &amp; Exp.
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => openEdit(emp)}
                  style={{paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: subtle}}
                >
                  <Text style={{color: textPrimary, fontSize: 11, fontWeight: '600'}}>Edit</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
