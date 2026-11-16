'use client';

import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ArrowLeft,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {api} from '@/lib/api';
import {Notice} from './ui';
import {
  calculateSalaryBreakdown,
  formatInrWhole,
  type EmployeeStatus,
  type EmploymentType,
} from '../../shared/hr-payroll';
import styles from './employees-workspace.module.css';

export interface EmployeeRecord {
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
  items: EmployeeRecord[];
  summary: {
    total: number;
    active: number;
    relieved: number;
    active_annual_ctc_inr: number;
  };
  suggested_next_code: string;
}

type LetterKind = 'appointment' | 'salary' | 'relieving';

interface EmployeeFormState {
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
  exit_date: string;
  last_working_day: string;
  annual_ctc_inr: number;
  pf_applicable: boolean;
  pt_applicable: boolean;
  pf_capped: boolean;
  status: EmployeeStatus;
}

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

function emptyForm(suggestedCode: string): EmployeeFormState {
  return {
    employee_code: suggestedCode || 'VST-EMP-001',
    full_name: '',
    email: '',
    phone: '',
    address: '',
    designation: '',
    division: 'Platform Engineering',
    employment_type: 'permanent',
    work_location: 'Bengaluru, Karnataka',
    joining_date: todayIso(),
    probation_months: 3,
    notice_period_days: 30,
    exit_date: '',
    last_working_day: '',
    annual_ctc_inr: 600000,
    pf_applicable: true,
    pt_applicable: true,
    pf_capped: true,
    status: 'active',
  };
}

function recordToForm(emp: EmployeeRecord): EmployeeFormState {
  return {
    employee_code: emp.employee_code,
    full_name: emp.full_name,
    email: emp.email,
    phone: emp.phone || '',
    address: emp.address || '',
    designation: emp.designation,
    division: emp.division,
    employment_type: emp.employment_type,
    work_location: emp.work_location,
    joining_date: emp.joining_date,
    probation_months: emp.probation_months,
    notice_period_days: emp.notice_period_days,
    exit_date: emp.exit_date || '',
    last_working_day: emp.last_working_day || '',
    annual_ctc_inr: emp.annual_ctc_inr,
    pf_applicable: emp.pf_applicable,
    pt_applicable: emp.pt_applicable,
    pf_capped: emp.pf_capped ?? true,
    status: emp.status,
  };
}

export function EmployeesWorkspace() {
  const [items, setItems] = useState<EmployeeRecord[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    relieved: 0,
    active_annual_ctc_inr: 0,
  });
  const [suggestedCode, setSuggestedCode] = useState('VST-EMP-001');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'relieved'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Modes: 'directory' | 'form' | 'letter'
  const [mode, setMode] = useState<'directory' | 'form' | 'letter'>('directory');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(() => emptyForm('VST-EMP-001'));

  // Print Letterhead state
  const [letterEmployeeId, setLetterEmployeeId] = useState<number | null>(null);
  const [letterKind, setLetterKind] = useState<LetterKind>('appointment');
  const [issueDate, setIssueDate] = useState<string>(() => todayIso());
  const [signatoryName, setSignatoryName] = useState('Authorized Signatory');
  const [signatoryTitle, setSignatoryTitle] = useState(
    'Human Resources · Vistrah Groups Pvt Ltd',
  );
  const [letterPfCappedOverride, setLetterPfCappedOverride] = useState<boolean | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api<EmployeesListResponse>(
        `/admin/employees?status=${encodeURIComponent(statusFilter)}&q=${encodeURIComponent(
          appliedQuery,
        )}`,
      );
      setItems(res.items);
      setSummary(res.summary);
      setSuggestedCode(res.suggested_next_code || 'VST-EMP-001');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, appliedQuery]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const formBreakdown = useMemo(
    () =>
      calculateSalaryBreakdown(form.annual_ctc_inr, {
        pfApplicable: form.pf_applicable,
        ptApplicable: form.pt_applicable,
        pfCapped: form.pf_capped,
      }),
    [form.annual_ctc_inr, form.pf_applicable, form.pt_applicable, form.pf_capped],
  );

  const activeLetterEmployee = useMemo(
    () => items.find(e => e.id === letterEmployeeId) ?? null,
    [items, letterEmployeeId],
  );

  const letterBreakdown = useMemo(() => {
    if (!activeLetterEmployee) return null;
    return calculateSalaryBreakdown(activeLetterEmployee.annual_ctc_inr, {
      pfApplicable: activeLetterEmployee.pf_applicable,
      ptApplicable: activeLetterEmployee.pt_applicable,
      pfCapped: letterPfCappedOverride ?? activeLetterEmployee.pf_capped,
    });
  }, [activeLetterEmployee, letterPfCappedOverride]);

  function openCreateForm() {
    setError('');
    setNotice('');
    setEditingId(null);
    setForm(emptyForm(suggestedCode));
    setMode('form');
  }

  function openEditForm(emp: EmployeeRecord) {
    setError('');
    setNotice('');
    setEditingId(emp.id);
    setForm(recordToForm(emp));
    setMode('form');
  }

  function openLetter(emp: EmployeeRecord, kind: LetterKind) {
    setError('');
    setNotice('');
    setLetterEmployeeId(emp.id);
    setLetterKind(kind);
    setLetterPfCappedOverride(emp.pf_capped);
    setMode('letter');
  }

  async function saveEmployee(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        employee_code: form.employee_code.trim() || null,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        designation: form.designation.trim(),
        division: form.division.trim(),
        employment_type: form.employment_type,
        work_location: form.work_location.trim(),
        joining_date: form.joining_date,
        probation_months: Number(form.probation_months) || 0,
        notice_period_days: Number(form.notice_period_days) || 0,
        exit_date: form.exit_date ? form.exit_date : null,
        last_working_day: form.last_working_day ? form.last_working_day : null,
        annual_ctc_inr: Math.max(0, Math.round(Number(form.annual_ctc_inr) || 0)),
        pf_applicable: form.pf_applicable,
        pt_applicable: form.pt_applicable,
        pf_capped: form.pf_capped,
        status: form.status,
      };

      if (editingId !== null) {
        const updated = await api<EmployeeRecord>(`/admin/employees/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setNotice(`Updated employee ${updated.employee_code} (${updated.full_name}).`);
      } else {
        const created = await api<EmployeeRecord>('/admin/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setNotice(`Created employee ${created.employee_code} (${created.full_name}).`);
      }
      await loadEmployees();
      setMode('directory');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeEmployee(emp: EmployeeRecord) {
    if (
      !window.confirm(
        `Delete employee record ${emp.employee_code} (${emp.full_name}) permanently?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`/admin/employees/${emp.id}`, {method: 'DELETE'});
      setNotice(`Removed employee ${emp.employee_code}.`);
      await loadEmployees();
      setMode('directory');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // 1. PRINT-READY A4 CORPORATE LETTERHEAD VIEW
  // ---------------------------------------------------------------------------
  if (mode === 'letter' && activeLetterEmployee && letterBreakdown) {
    const emp = activeLetterEmployee;
    const year = (issueDate || todayIso()).slice(0, 4);
    const docCode =
      letterKind === 'appointment'
        ? 'APPT'
        : letterKind === 'salary'
          ? 'CTC'
          : 'REL';
    const refNo = `VISTRAH/HR/${year}/${emp.employee_code}/${docCode}`;
    const effectiveLwd = emp.last_working_day || emp.exit_date;

    return (
      <div className={styles.root}>
        <div className={`${styles.printControlBar} hr-no-print`}>
          <div className={styles.printControlTop}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
              <button
                type="button"
                className="button secondary"
                onClick={() => setMode('directory')}
              >
                <ArrowLeft size={15} />
                Back to Employees
              </button>

              <div className={styles.segmented} role="tablist" aria-label="HR Document Type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={letterKind === 'appointment'}
                  className={letterKind === 'appointment' ? styles.active : ''}
                  onClick={() => setLetterKind('appointment')}
                >
                  Appointment Letter + CTC
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={letterKind === 'salary'}
                  className={letterKind === 'salary' ? styles.active : ''}
                  onClick={() => setLetterKind('salary')}
                >
                  Salary Annexure
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={letterKind === 'relieving'}
                  className={letterKind === 'relieving' ? styles.active : ''}
                  onClick={() => setLetterKind('relieving')}
                >
                  Relieving & Experience
                </button>
              </div>
            </div>

            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <button
                type="button"
                className="button secondary"
                onClick={() => openEditForm(emp)}
              >
                <Pencil size={14} />
                Edit Record
              </button>
              <button
                type="button"
                className="button"
                onClick={() => window.print()}
              >
                <Printer size={15} />
                Print / Save A4 PDF
              </button>
            </div>
          </div>

          <div className={styles.printControlMeta}>
            <div className={styles.printMetaInputs}>
              <label>
                Issue Date
                <input
                  type="date"
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                />
              </label>
              <label>
                Signatory Name
                <input
                  type="text"
                  value={signatoryName}
                  onChange={e => setSignatoryName(e.target.value)}
                />
              </label>
              <label>
                Signatory Title
                <input
                  type="text"
                  value={signatoryTitle}
                  onChange={e => setSignatoryTitle(e.target.value)}
                />
              </label>
              {emp.pf_applicable && (
                <label style={{cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={letterPfCappedOverride ?? emp.pf_capped}
                    onChange={e => setLetterPfCappedOverride(e.target.checked)}
                  />
                  Cap EPF at ₹15,000/mo ceiling
                </label>
              )}
            </div>
            <span className={styles.empSub}>
              Tip: In browser Print dialog, select <strong>Save as PDF</strong> · Paper size{' '}
              <strong>A4</strong>.
            </span>
          </div>

          {letterKind === 'relieving' && !effectiveLwd && (
            <Notice
              error
              message="Last Working Day / Exit Date is not recorded on this employee yet. Click 'Edit Record' to enter Last Working Day before issuing the final Relieving Certificate."
            />
          )}
        </div>

        {/* A4 PRINTABLE DOCUMENT STACK */}
        <div className={styles.a4Stack}>
          {/* ============================================================== */}
          {/* DOCUMENT 1: APPOINTMENT LETTER + MANDATORY 9 LABOUR CLAUSES    */}
          {/* ============================================================== */}
          {letterKind === 'appointment' && (
            <>
              <article className={styles.a4Sheet} aria-label="Appointment Letter">
                <header className={styles.letterhead}>
                  <div>
                    <div className={styles.brandMark}>VISTRAH</div>
                    <div className={styles.brandLegal}>Vistrah Groups Pvt Ltd</div>
                  </div>
                  <div className={styles.letterheadRight}>
                    <strong>Vistrah Groups Pvt Ltd</strong>
                    <div>Bengaluru, Karnataka, India</div>
                    <div>https://vistrah.in · info@vistrah.in</div>
                  </div>
                </header>

                <div className={styles.refStrip}>
                  <span>
                    <strong>Ref:</strong> {refNo}
                  </span>
                  <span>
                    <strong>Date:</strong> {formatLongDate(issueDate)}
                  </span>
                </div>

                <div className={styles.recipientBox}>
                  <div>
                    <strong>To,</strong>
                  </div>
                  <div>
                    <strong>{emp.full_name}</strong> ({emp.employee_code})
                  </div>
                  {emp.address && <div>{emp.address}</div>}
                  <div>
                    {emp.email}
                    {emp.phone ? ` · ${emp.phone}` : ''}
                  </div>
                </div>

                <h2 className={styles.docHeading}>
                  Letter of Appointment — {emp.designation} ({emp.division})
                </h2>

                <p style={{margin: '0 0 10px'}}>Dear {emp.full_name},</p>
                <p style={{margin: '0 0 10px'}}>
                  We are pleased to appoint you with <strong>Vistrah Groups Pvt Ltd</strong> on the
                  terms and statutory conditions set out below, aligned with applicable Indian
                  labour legislation:
                </p>

                <div className={styles.clauseList}>
                  <div className={styles.clause}>
                    <strong>01. Legal Employer &amp; Corporate Identity:</strong> Your employment is
                    with <strong>Vistrah Groups Pvt Ltd</strong> (operating{' '}
                    <em>https://vistrah.in</em>), having its primary corporate establishment at
                    Bengaluru, Karnataka, India. Your unique Employee Identification Code is{' '}
                    <strong className="tabular-nums">{emp.employee_code}</strong>.
                  </div>

                  <div className={styles.clause}>
                    <strong>02. Designation, Division &amp; Category:</strong> You are appointed as{' '}
                    <strong>{emp.designation}</strong> in the <strong>{emp.division}</strong>{' '}
                    division under the{' '}
                    <strong>{EMPLOYMENT_LABELS[emp.employment_type]}</strong> category. You shall
                    perform duties assigned by management with diligence and professional integrity.
                  </div>

                  <div className={styles.clause}>
                    <strong>03. Date of Joining &amp; Work Location:</strong> Your appointment takes
                    effect from <strong>{formatLongDate(emp.joining_date)}</strong>. Your primary
                    place of posting is <strong>{emp.work_location}</strong>, subject to lawful
                    operational mobility, client-site visits, or approved hybrid schedules within
                    India.
                  </div>

                  <div className={styles.clause}>
                    <strong>04. Working Hours &amp; Weekly Rest:</strong> Standard working hours are{' '}
                    <strong className="tabular-nums">8 hours per day</strong> and{' '}
                    <strong className="tabular-nums">48 hours per week</strong>, with at least one
                    paid weekly rest day, governed by the Karnataka Shops and Commercial
                    Establishments Act and the Occupational Safety, Health and Working Conditions
                    Code. Any authorized overtime beyond statutory limits is compensated in
                    accordance with law.
                  </div>

                  <div className={styles.clause}>
                    <strong>05. Leave Policy &amp; Paid Holidays:</strong> You are entitled to
                    statutory Earned/Privilege Leave (accrued at 1 day for every 20 days worked),
                    Casual/Sick Leave, applicable Maternity/Parental entitlements, and gazetted
                    Karnataka National &amp; Festival Holidays as notified in the annual company
                    holiday calendar.
                  </div>

                  <div className={styles.clause}>
                    <strong>06. Probation &amp; Symmetrical Notice Period:</strong>{' '}
                    {emp.probation_months > 0 ? (
                      <>
                        You will serve an initial probationary period of{' '}
                        <strong className="tabular-nums">{emp.probation_months} month(s)</strong>{' '}
                        from your joining date.{' '}
                      </>
                    ) : (
                      <>No initial probationary period applies to this appointment. </>
                    )}
                    Either party (Vistrah Groups Pvt Ltd or you) may terminate this employment by
                    providing a symmetrical{' '}
                    <strong className="tabular-nums">{emp.notice_period_days} days</strong> written
                    notice, or proportionate salary in lieu thereof, except in cases of proven
                    statutory misconduct following due inquiry.
                  </div>

                  <div className={styles.clause}>
                    <strong>07. Two (2) Working-Day Full &amp; Final Settlement:</strong> In
                    accordance with the Code on Wages, upon resignation, completion of tenure, or
                    separation from employment, all earned wages payable to you shall be settled and
                    disbursed within <strong>two (2) working days</strong> from your confirmed Last
                    Working Day, alongside timely handover of company assets, credentials, and
                    records.
                  </div>

                  <div className={styles.clause}>
                    <strong>08. Remuneration (50% Basic Wage Rule) &amp; Statutory Benefits:</strong>{' '}
                    Your Annual Cost to Company (CTC) is{' '}
                    <strong className="tabular-nums">
                      {formatInrWhole(letterBreakdown.totalCtc.annualInr)}
                    </strong>{' '}
                    per annum, detailed in <strong>Annexure A</strong>, structured such that Basic
                    Salary constitutes at least <strong className="tabular-nums">50%</strong> of
                    total remuneration.{' '}
                    {emp.pf_applicable
                      ? 'Statutory Employees’ Provident Fund (EPF — 12% employer & 12% employee contribution) applies as shown in Annexure A. '
                      : 'EPF is currently marked non-applicable per statutory threshold/opt-out declaration. '}
                    {letterBreakdown.esiApplicableNote
                      ? 'As monthly gross wages are within ₹21,000, statutory ESIC coverage applies per ESIC regulations. '
                      : 'ESIC does not apply as monthly gross remuneration exceeds the ₹21,000 statutory threshold. '}
                    Applicable Karnataka Professional Tax and Income Tax (TDS) are deducted at
                    source per prevailing statutes.
                  </div>

                  <div className={styles.clause}>
                    <strong>09. Confidentiality, DPDP Act 2023 &amp; Intellectual Property:</strong>{' '}
                    You shall safeguard all proprietary source code, commercial pricing, seller/user
                    records, and personal data strictly in compliance with the Digital Personal Data
                    Protection (DPDP) Act, 2023. All inventions, designs, code, creatives, and
                    materials authored during your employment are works made for hire and vest
                    exclusively in <strong>Vistrah Groups Pvt Ltd</strong>. Disputes are subject to
                    the exclusive jurisdiction of courts at Bengaluru, Karnataka.
                  </div>
                </div>

                <div className={styles.signatureGrid}>
                  <div className={styles.sigBlock}>
                    <strong>For Vistrah Groups Pvt Ltd</strong>
                    <div className={styles.sigSpace} />
                    <strong>{signatoryName}</strong>
                    <span>{signatoryTitle}</span>
                    <span className="tabular-nums">Date: {formatLongDate(issueDate)}</span>
                  </div>
                  <div className={styles.sigBlock}>
                    <strong>Employee Acceptance &amp; Declaration</strong>
                    <div className={styles.sigSpace} />
                    <strong>{emp.full_name}</strong>
                    <span className="tabular-nums">
                      Employee ID: {emp.employee_code} · Date: _______________
                    </span>
                  </div>
                </div>

                <footer className={styles.sheetFooter}>
                  <span>Vistrah Groups Pvt Ltd · Bengaluru, Karnataka, India</span>
                  <span>Page 1 of 2 · {refNo}</span>
                </footer>
              </article>

              {/* SHEET 2 OF APPOINTMENT LETTER: ANNEXURE A */}
              <SalaryAnnexureSheet
                emp={emp}
                breakdown={letterBreakdown}
                issueDate={issueDate}
                refNo={`${refNo}-ANNEX-A`}
                signatoryName={signatoryName}
                signatoryTitle={signatoryTitle}
                title="Annexure A — Compensation & Statutory CTC Structure"
                pageLabel="Page 2 of 2"
                pageBreak
              />
            </>
          )}

          {/* ============================================================== */}
          {/* DOCUMENT 2: STANDALONE SALARY BREAKDOWN ANNEXURE               */}
          {/* ============================================================== */}
          {letterKind === 'salary' && (
            <SalaryAnnexureSheet
              emp={emp}
              breakdown={letterBreakdown}
              issueDate={issueDate}
              refNo={refNo}
              signatoryName={signatoryName}
              signatoryTitle={signatoryTitle}
              title="Compensation & Statutory CTC Breakdown Statement"
              pageLabel="Page 1 of 1"
              pageBreak={false}
            />
          )}

          {/* ============================================================== */}
          {/* DOCUMENT 3: RELIEVING ORDER & EXPERIENCE CERTIFICATE           */}
          {/* ============================================================== */}
          {letterKind === 'relieving' && (
            <article
              className={styles.a4Sheet}
              aria-label="Relieving and Experience Certificate"
            >
              <header className={styles.letterhead}>
                <div>
                  <div className={styles.brandMark}>VISTRAH</div>
                  <div className={styles.brandLegal}>Vistrah Groups Pvt Ltd</div>
                </div>
                <div className={styles.letterheadRight}>
                  <strong>Vistrah Groups Pvt Ltd</strong>
                  <div>Bengaluru, Karnataka, India</div>
                  <div>https://vistrah.in · info@vistrah.in</div>
                </div>
              </header>

              <div className={styles.refStrip}>
                <span>
                  <strong>Ref:</strong> {refNo}
                </span>
                <span>
                  <strong>Date of Issue:</strong> {formatLongDate(issueDate)}
                </span>
              </div>

              <div className={styles.recipientBox}>
                <div>
                  <strong>{emp.full_name}</strong>
                </div>
                <div>Employee Code: {emp.employee_code}</div>
                {emp.address && <div>{emp.address}</div>}
                <div>{emp.email}</div>
              </div>

              <h2 className={styles.docHeading}>
                Relieving Letter &amp; Experience Certificate
              </h2>

              <p style={{fontWeight: 600, letterSpacing: '0.04em', margin: '10px 0'}}>
                TO WHOMSOEVER IT MAY CONCERN
              </p>

              <div className={styles.metaGrid}>
                <div className={styles.metaCell}>
                  <span>Employee Name &amp; ID</span>
                  <strong>
                    {emp.full_name} ({emp.employee_code})
                  </strong>
                </div>
                <div className={styles.metaCell}>
                  <span>Last Held Designation</span>
                  <strong>{emp.designation}</strong>
                </div>
                <div className={styles.metaCell}>
                  <span>Division &amp; Location</span>
                  <strong>
                    {emp.division} · {emp.work_location}
                  </strong>
                </div>
                <div className={styles.metaCell}>
                  <span>Employment Category</span>
                  <strong>{EMPLOYMENT_LABELS[emp.employment_type]}</strong>
                </div>
                <div className={styles.metaCell}>
                  <span>Date of Joining</span>
                  <strong>{formatLongDate(emp.joining_date)}</strong>
                </div>
                <div className={styles.metaCell}>
                  <span>Last Working Day</span>
                  <strong>
                    {effectiveLwd ? formatLongDate(effectiveLwd) : 'Pending Clearance Date'}
                  </strong>
                </div>
              </div>

              <div className={styles.clauseList}>
                <p className={styles.clause} style={{margin: 0}}>
                  This is to certify that <strong>{emp.full_name}</strong> (Employee Code:{' '}
                  <strong className="tabular-nums">{emp.employee_code}</strong>) was employed with{' '}
                  <strong>Vistrah Groups Pvt Ltd</strong> from{' '}
                  <strong>{formatLongDate(emp.joining_date)}</strong> to{' '}
                  <strong>
                    {effectiveLwd ? formatLongDate(effectiveLwd) : '[Last Working Day]'}
                  </strong>
                  . At the time of separation, {emp.full_name} held the position of{' '}
                  <strong>{emp.designation}</strong> in the <strong>{emp.division}</strong>{' '}
                  division based at <strong>{emp.work_location}</strong>.
                </p>

                <p className={styles.clause} style={{margin: 0}}>
                  We confirm that {emp.full_name} has formally handed over all assigned
                  responsibilities, company assets, credentials, and documentation, and stands
                  relieved of duties effective the close of business hours on{' '}
                  <strong>
                    {effectiveLwd ? formatLongDate(effectiveLwd) : '[Last Working Day]'}
                  </strong>
                  . Full and Final (F&amp;F) wage settlement has been processed in accordance with
                  Vistrah Groups Pvt Ltd’s statutory clearance norms under the Code on Wages, with
                  no pending dues owed to the company.
                </p>

                <p className={styles.clause} style={{margin: 0}}>
                  During this tenure with <strong>Vistrah Groups Pvt Ltd</strong>, we found{' '}
                  {emp.full_name} to be sincere, dependable, and professional in the discharge of
                  duties. Continuing post-employment obligations regarding company confidentiality
                  and DPDP Act, 2023 personal data protection remain in effect per the Appointment
                  Letter.
                </p>

                <p className={styles.clause} style={{margin: 0}}>
                  We thank {emp.full_name} for the contributions made to VISTRAH and wish every
                  success in future professional endeavours.
                </p>
              </div>

              <div className={styles.signatureGrid}>
                <div className={styles.sigBlock}>
                  <strong>For Vistrah Groups Pvt Ltd</strong>
                  <div className={styles.sigSpace} />
                  <strong>{signatoryName}</strong>
                  <span>{signatoryTitle}</span>
                  <span>Verification: info@vistrah.in</span>
                </div>
                <div className={styles.sigBlock}>
                  <strong>Corporate Seal / Stamp</strong>
                  <div className={styles.sigSpace} />
                  <span>Vistrah Groups Pvt Ltd · Bengaluru</span>
                  <span className="tabular-nums">Issued: {formatLongDate(issueDate)}</span>
                </div>
              </div>

              <footer className={styles.sheetFooter}>
                <span>Vistrah Groups Pvt Ltd · https://vistrah.in · Bengaluru, Karnataka</span>
                <span>Page 1 of 1 · {refNo}</span>
              </footer>
            </article>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. ADD / EDIT EMPLOYEE FORM + SIDE-BY-SIDE LIVE 2026 CTC CALCULATOR
  // ---------------------------------------------------------------------------
  if (mode === 'form') {
    return (
      <div className={styles.root}>
        <div className={styles.toolbar}>
          <button
            type="button"
            className="button secondary"
            onClick={() => setMode('directory')}
          >
            <ArrowLeft size={15} />
            Back to Directory
          </button>
          {editingId !== null && (
            <span className={styles.empCode}>Editing #{editingId} · {form.employee_code}</span>
          )}
        </div>

        {error && <Notice error message={error} />}

        <div className={styles.editorGrid}>
          <form className={styles.formCard} onSubmit={e => void saveEmployee(e)}>
            <h2 className={styles.sectionTitle}>
              {editingId !== null ? 'Edit Employee Record' : 'Add Internal Employee'}
            </h2>
            <p className={styles.sectionLead}>
              Vistrah Groups Pvt Ltd · Employee profile, tenure dates, and statutory payroll flags.
            </p>

            <div className={styles.fieldsetGrid}>
              <div className={styles.field}>
                <label htmlFor="emp-code">Employee Code</label>
                <input
                  id="emp-code"
                  type="text"
                  required
                  value={form.employee_code}
                  onChange={e =>
                    setForm(prev => ({...prev, employee_code: e.target.value.toUpperCase()}))
                  }
                  placeholder="VST-EMP-001"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-name">Full Legal Name</label>
                <input
                  id="emp-name"
                  type="text"
                  required
                  value={form.full_name}
                  onChange={e => setForm(prev => ({...prev, full_name: e.target.value}))}
                  placeholder="e.g. Aarav Rao"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-email">Work / Personal Email</label>
                <input
                  id="emp-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(prev => ({...prev, email: e.target.value}))}
                  placeholder="name@vistrah.in"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-phone">Phone Number</label>
                <input
                  id="emp-phone"
                  type="text"
                  value={form.phone}
                  onChange={e => setForm(prev => ({...prev, phone: e.target.value}))}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label htmlFor="emp-address">Residential Address (for Appointment Letter)</label>
                <textarea
                  id="emp-address"
                  value={form.address}
                  onChange={e => setForm(prev => ({...prev, address: e.target.value}))}
                  placeholder="Street, Area, City, State & PIN Code"
                />
              </div>
            </div>

            <div className={styles.fieldsetGrid}>
              <div className={styles.field}>
                <label htmlFor="emp-designation">Designation / Role</label>
                <input
                  id="emp-designation"
                  type="text"
                  required
                  value={form.designation}
                  onChange={e => setForm(prev => ({...prev, designation: e.target.value}))}
                  placeholder="e.g. Senior Full-Stack Engineer"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-division">Division / Department</label>
                <input
                  id="emp-division"
                  type="text"
                  required
                  value={form.division}
                  onChange={e => setForm(prev => ({...prev, division: e.target.value}))}
                  placeholder="e.g. Platform Engineering / VISTRAH Studio"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-type">Employment Type</label>
                <select
                  id="emp-type"
                  value={form.employment_type}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      employment_type: e.target.value as EmploymentType,
                    }))
                  }
                >
                  <option value="permanent">Permanent</option>
                  <option value="probation">Probation</option>
                  <option value="fixed_term">Fixed-Term</option>
                  <option value="intern">Intern</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-location">Work Location</label>
                <input
                  id="emp-location"
                  type="text"
                  required
                  value={form.work_location}
                  onChange={e => setForm(prev => ({...prev, work_location: e.target.value}))}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-join">Joining Date</label>
                <input
                  id="emp-join"
                  type="date"
                  required
                  value={form.joining_date}
                  onChange={e => setForm(prev => ({...prev, joining_date: e.target.value}))}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-probation">Probation (Months)</label>
                <input
                  id="emp-probation"
                  type="number"
                  min={0}
                  max={24}
                  value={form.probation_months}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      probation_months: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-notice">Symmetrical Notice Period (Days)</label>
                <input
                  id="emp-notice"
                  type="number"
                  min={0}
                  max={180}
                  value={form.notice_period_days}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      notice_period_days: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-ctc">Annual CTC (INR ₹)</label>
                <input
                  id="emp-ctc"
                  type="number"
                  min={0}
                  step={1000}
                  required
                  value={form.annual_ctc_inr}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      annual_ctc_inr: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>

              <div className={styles.toggleList}>
                <label className={styles.toggleItem}>
                  <input
                    type="checkbox"
                    checked={form.pf_applicable}
                    onChange={e =>
                      setForm(prev => ({...prev, pf_applicable: e.target.checked}))
                    }
                  />
                  <span>
                    <strong>Provident Fund (EPF — 12% Employee + 12% Employer)</strong>
                    <br />
                    <small style={{color: 'var(--text-secondary)'}}>
                      Includes Employer PF inside Total CTC and deducts Employee PF from Gross.
                    </small>
                  </span>
                </label>

                {form.pf_applicable && (
                  <label className={styles.toggleItem}>
                    <input
                      type="checkbox"
                      checked={form.pf_capped}
                      onChange={e =>
                        setForm(prev => ({...prev, pf_capped: e.target.checked}))
                      }
                    />
                    <span>
                      <strong>Cap PF at ₹15,000/month Statutory Wage Ceiling (₹1,800/mo)</strong>
                      <br />
                      <small style={{color: 'var(--text-secondary)'}}>
                        Uncheck to compute uncapped 12% PF on full Basic Salary.
                      </small>
                    </span>
                  </label>
                )}

                <label className={styles.toggleItem}>
                  <input
                    type="checkbox"
                    checked={form.pt_applicable}
                    onChange={e =>
                      setForm(prev => ({...prev, pt_applicable: e.target.checked}))
                    }
                  />
                  <span>
                    <strong>Karnataka Professional Tax (₹200/mo when Monthly Gross &gt;= ₹25,000)</strong>
                    <br />
                    <small style={{color: 'var(--text-secondary)'}}>
                      Automatically ₹0 when monthly gross salary is below ₹25,000.
                    </small>
                  </span>
                </label>
              </div>
            </div>

            <div className={styles.fieldsetGrid} style={{borderBottom: 0, marginBottom: 8}}>
              <div className={styles.field}>
                <label htmlFor="emp-status">Employment Status</label>
                <select
                  id="emp-status"
                  value={form.status}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      status: e.target.value as EmployeeStatus,
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="relieved">Relieved / Exited</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-exit">Resignation / Exit Notice Date</label>
                <input
                  id="emp-exit"
                  type="date"
                  value={form.exit_date}
                  onChange={e => setForm(prev => ({...prev, exit_date: e.target.value}))}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="emp-lwd">Last Working Day (for Relieving Letter)</label>
                <input
                  id="emp-lwd"
                  type="date"
                  value={form.last_working_day}
                  onChange={e =>
                    setForm(prev => ({...prev, last_working_day: e.target.value}))
                  }
                />
              </div>
            </div>

            <div className={styles.formFooter}>
              <div style={{display: 'flex', gap: '8px'}}>
                <button type="submit" className="button" disabled={busy}>
                  {busy
                    ? 'Saving…'
                    : editingId !== null
                      ? 'Save Employee Changes'
                      : 'Create Employee Record'}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setMode('directory')}
                >
                  Cancel
                </button>
              </div>

              {editingId !== null && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => {
                    const current = items.find(i => i.id === editingId);
                    if (current) void removeEmployee(current);
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </div>
          </form>

          {/* LIVE SIDE-BY-SIDE 2026 INDIAN LABOUR CODE CTC PREVIEW */}
          <aside className={styles.previewCard} aria-label="Live CTC Breakdown Preview">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '6px',
              }}
            >
              <h3 className={styles.sectionTitle} style={{margin: 0}}>
                2026 Labour Code CTC Preview
              </h3>
              <span className={`${styles.badge} ${styles.badgeActive}`}>
                Basic {formBreakdown.basicShareOfCtcPct}% CTC
              </span>
            </div>
            <p className={styles.sectionLead}>
              Enforces Basic &gt;= 50% of Total CTC, HRA = 50% of Basic, balancing Special
              Allowance, EPF &amp; Karnataka PT.
            </p>

            <table className={styles.ctcTable}>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Monthly</th>
                  <th>Annual</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Basic Salary (50% CTC)</td>
                  <td>{formatInrWhole(formBreakdown.earnings.basic.monthlyInr)}</td>
                  <td>{formatInrWhole(formBreakdown.earnings.basic.annualInr)}</td>
                </tr>
                <tr>
                  <td>HRA (50% of Basic)</td>
                  <td>{formatInrWhole(formBreakdown.earnings.hra.monthlyInr)}</td>
                  <td>{formatInrWhole(formBreakdown.earnings.hra.annualInr)}</td>
                </tr>
                <tr>
                  <td>Special Allowance</td>
                  <td>{formatInrWhole(formBreakdown.earnings.specialAllowance.monthlyInr)}</td>
                  <td>{formatInrWhole(formBreakdown.earnings.specialAllowance.annualInr)}</td>
                </tr>
                <tr className={styles.ctcRowStrong}>
                  <td>Gross Salary (A)</td>
                  <td>{formatInrWhole(formBreakdown.gross.monthlyInr)}</td>
                  <td>{formatInrWhole(formBreakdown.gross.annualInr)}</td>
                </tr>
                <tr>
                  <td>Employer EPF (B)</td>
                  <td>
                    {formatInrWhole(formBreakdown.employerContributions.employerPf.monthlyInr)}
                  </td>
                  <td>
                    {formatInrWhole(formBreakdown.employerContributions.employerPf.annualInr)}
                  </td>
                </tr>
                <tr className={styles.ctcRowStrong}>
                  <td>Total CTC (A + B)</td>
                  <td>{formatInrWhole(formBreakdown.totalCtc.monthlyInr)}</td>
                  <td>{formatInrWhole(formBreakdown.totalCtc.annualInr)}</td>
                </tr>
                <tr>
                  <td>Less: Employee EPF</td>
                  <td>−{formatInrWhole(formBreakdown.deductions.employeePf.monthlyInr)}</td>
                  <td>−{formatInrWhole(formBreakdown.deductions.employeePf.annualInr)}</td>
                </tr>
                <tr>
                  <td>Less: Karnataka PT</td>
                  <td>−{formatInrWhole(formBreakdown.deductions.professionalTax.monthlyInr)}</td>
                  <td>−{formatInrWhole(formBreakdown.deductions.professionalTax.annualInr)}</td>
                </tr>
                <tr className={styles.ctcRowHighlight}>
                  <td>Net In-Hand (Pre-TDS)</td>
                  <td>{formatInrWhole(formBreakdown.netInHand.monthlyInr)}</td>
                  <td>{formatInrWhole(formBreakdown.netInHand.annualInr)}</td>
                </tr>
              </tbody>
            </table>
          </aside>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. EDITORIAL DIRECTORY VIEW (DEFAULT)
  // ---------------------------------------------------------------------------
  return (
    <div className={styles.root}>
      {/* Hairline KPI Strip */}
      <section className={styles.kpiStrip} aria-label="Employee metrics">
        <div className={styles.kpiCell}>
          <span className={styles.kpiLabel}>Total Records</span>
          <strong className={styles.kpiValue}>{summary.total}</strong>
          <span className={styles.kpiSub}>Next ID: {suggestedCode}</span>
        </div>
        <div className={styles.kpiCell}>
          <span className={styles.kpiLabel}>Active Headcount</span>
          <strong className={styles.kpiValue}>{summary.active}</strong>
          <span className={styles.kpiSub}>On active payroll</span>
        </div>
        <div className={styles.kpiCell}>
          <span className={styles.kpiLabel}>Relieved Alumni</span>
          <strong className={styles.kpiValue}>{summary.relieved}</strong>
          <span className={styles.kpiSub}>Experience letters ready</span>
        </div>
        <div className={styles.kpiCell}>
          <span className={styles.kpiLabel}>Active Annual CTC</span>
          <strong className={styles.kpiValue}>
            {formatInrWhole(summary.active_annual_ctc_inr)}
          </strong>
          <span className={styles.kpiSub}>
            ~{formatInrWhole(Math.round(summary.active_annual_ctc_inr / 12))}/mo run-rate
          </span>
        </div>
      </section>

      {notice && <Notice message={notice} />}
      {error && <Notice error message={error} />}

      {/* Filter & Primary Action Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.segmented} role="tablist" aria-label="Employee status filter">
            {(
              [
                {id: 'all', label: 'All Staff'},
                {id: 'active', label: 'Active'},
                {id: 'relieved', label: 'Relieved'},
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.id}
                className={statusFilter === tab.id ? styles.active : ''}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form
            className={styles.searchWrap}
            onSubmit={e => {
              e.preventDefault();
              setAppliedQuery(searchInput.trim());
            }}
          >
            <Search size={15} className={styles.searchIcon} />
            <input
              type="search"
              className={styles.searchInput}
              placeholder="Search code, name, role, division…"
              value={searchInput}
              onChange={e => {
                setSearchInput(e.target.value);
                if (e.target.value === '') setAppliedQuery('');
              }}
            />
          </form>
        </div>

        <button type="button" className="button" onClick={openCreateForm}>
          <Plus size={16} />
          Add Employee
        </button>
      </div>

      {/* Employee Directory Hairline Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Loading employee directory…</div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <UserCheck size={28} strokeWidth={1.6} />
            <strong>No employee records found</strong>
            <span>
              Add an internal employee to compute 2026 Indian Labour Code CTC breakdowns and print
              Appointment, Salary, and Relieving A4 PDFs.
            </span>
            <button type="button" className="button" onClick={openCreateForm}>
              <Plus size={15} />
              Add First Employee ({suggestedCode})
            </button>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role &amp; Division</th>
                  <th>Tenure &amp; Status</th>
                  <th>Annual CTC &amp; Net/mo</th>
                  <th>A4 HR Letters &amp; Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(emp => {
                  const calc = calculateSalaryBreakdown(emp.annual_ctc_inr, {
                    pfApplicable: emp.pf_applicable,
                    ptApplicable: emp.pt_applicable,
                    pfCapped: emp.pf_capped,
                  });
                  return (
                    <tr key={emp.id}>
                      <td>
                        <div className={styles.empIdentity}>
                          <span className={styles.empCode}>{emp.employee_code}</span>
                          <span className={styles.empName}>{emp.full_name}</span>
                          <span className={styles.empSub}>
                            {emp.email}
                            {emp.phone ? ` · ${emp.phone}` : ''}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className={styles.empIdentity}>
                          <span className={styles.empName}>{emp.designation}</span>
                          <span className={styles.empSub}>
                            {emp.division} · {emp.work_location}
                          </span>
                          <span className={styles.empSub}>
                            {EMPLOYMENT_LABELS[emp.employment_type]}
                          </span>
                        </div>
                      </td>

                      <td className="tabular-nums">
                        <div className={styles.empIdentity}>
                          <span
                            className={`${styles.badge} ${
                              emp.status === 'active'
                                ? styles.badgeActive
                                : styles.badgeRelieved
                            }`}
                          >
                            {emp.status}
                          </span>
                          <span className={styles.empSub}>
                            Joined: {formatLongDate(emp.joining_date)}
                          </span>
                          {emp.last_working_day && (
                            <span className={styles.empSub}>
                              LWD: {formatLongDate(emp.last_working_day)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="tabular-nums">
                        <div className={styles.empIdentity}>
                          <span className={styles.empName}>
                            {formatInrWhole(calc.totalCtc.annualInr)}/yr
                          </span>
                          <span className={styles.empSub}>
                            Net: {formatInrWhole(calc.netInHand.monthlyInr)}/mo
                          </span>
                          <span className={styles.empSub}>
                            {emp.pf_applicable ? 'EPF' : 'No PF'} ·{' '}
                            {calc.deductions.professionalTax.monthlyInr > 0
                              ? 'PT ₹200'
                              : 'PT ₹0'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.docBtn}
                            onClick={() => openLetter(emp, 'appointment')}
                            title="Generate A4 Appointment Letter + CTC Annexure"
                          >
                            <FileText size={13} />
                            Appointment
                          </button>
                          <button
                            type="button"
                            className={styles.docBtn}
                            onClick={() => openLetter(emp, 'salary')}
                            title="Generate A4 Salary Breakdown Annexure"
                          >
                            <FileSpreadsheet size={13} />
                            Salary CTC
                          </button>
                          <button
                            type="button"
                            className={styles.docBtn}
                            onClick={() => openLetter(emp, 'relieving')}
                            title="Generate A4 Relieving & Experience Certificate"
                          >
                            <FileCheck2 size={13} />
                            Relieving
                          </button>
                          <button
                            type="button"
                            className={styles.docBtn}
                            onClick={() => openEditForm(emp)}
                            title="Edit Employee Record"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SalaryAnnexureSheet({
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
  emp: EmployeeRecord;
  breakdown: ReturnType<typeof calculateSalaryBreakdown>;
  issueDate: string;
  refNo: string;
  signatoryName: string;
  signatoryTitle: string;
  title: string;
  pageLabel: string;
  pageBreak: boolean;
}) {
  return (
    <article
      className={`${styles.a4Sheet} ${pageBreak ? styles.pageBreakBefore : ''}`}
      aria-label={title}
    >
      <header className={styles.letterhead}>
        <div>
          <div className={styles.brandMark}>VISTRAH</div>
          <div className={styles.brandLegal}>Vistrah Groups Pvt Ltd</div>
        </div>
        <div className={styles.letterheadRight}>
          <strong>Vistrah Groups Pvt Ltd</strong>
          <div>Bengaluru, Karnataka, India</div>
          <div>https://vistrah.in · info@vistrah.in</div>
        </div>
      </header>

      <div className={styles.refStrip}>
        <span>
          <strong>Ref:</strong> {refNo}
        </span>
        <span>
          <strong>Date:</strong> {formatLongDate(issueDate)}
        </span>
      </div>

      <h2 className={styles.docHeading}>{title}</h2>

      <div className={styles.metaGrid}>
        <div className={styles.metaCell}>
          <span>Employee Name &amp; Code</span>
          <strong>
            {emp.full_name} ({emp.employee_code})
          </strong>
        </div>
        <div className={styles.metaCell}>
          <span>Designation &amp; Division</span>
          <strong>
            {emp.designation} · {emp.division}
          </strong>
        </div>
        <div className={styles.metaCell}>
          <span>Employment Type &amp; Posting</span>
          <strong>
            {EMPLOYMENT_LABELS[emp.employment_type]} · {emp.work_location}
          </strong>
        </div>
        <div className={styles.metaCell}>
          <span>Effective / Joining Date</span>
          <strong>{formatLongDate(emp.joining_date)}</strong>
        </div>
      </div>

      <table className={styles.printTable}>
        <thead>
          <tr>
            <th>Compensation / Statutory Component</th>
            <th>Monthly (INR)</th>
            <th>Annual (INR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Basic Salary</strong>{' '}
              <span style={{color: '#475569'}}>
                ({breakdown.basicShareOfCtcPct}% of Total CTC · 2026 Wage Code &gt;= 50% rule)
              </span>
            </td>
            <td>{formatInrWhole(breakdown.earnings.basic.monthlyInr)}</td>
            <td>{formatInrWhole(breakdown.earnings.basic.annualInr)}</td>
          </tr>
          <tr>
            <td>
              <strong>House Rent Allowance (HRA)</strong>{' '}
              <span style={{color: '#475569'}}>(50% of Basic Salary)</span>
            </td>
            <td>{formatInrWhole(breakdown.earnings.hra.monthlyInr)}</td>
            <td>{formatInrWhole(breakdown.earnings.hra.annualInr)}</td>
          </tr>
          <tr>
            <td>
              <strong>Special &amp; Flexible Allowance</strong>{' '}
              <span style={{color: '#475569'}}>(Balancing fixed allowance)</span>
            </td>
            <td>{formatInrWhole(breakdown.earnings.specialAllowance.monthlyInr)}</td>
            <td>{formatInrWhole(breakdown.earnings.specialAllowance.annualInr)}</td>
          </tr>
          <tr className={styles.printRowBand}>
            <td>Gross Fixed Remuneration (A)</td>
            <td>{formatInrWhole(breakdown.gross.monthlyInr)}</td>
            <td>{formatInrWhole(breakdown.gross.annualInr)}</td>
          </tr>
          <tr>
            <td>
              <strong>Employer Provident Fund (EPF — 12%)</strong>{' '}
              <span style={{color: '#475569'}}>
                ({breakdown.employerContributions.employerPf.note})
              </span>
            </td>
            <td>{formatInrWhole(breakdown.employerContributions.employerPf.monthlyInr)}</td>
            <td>{formatInrWhole(breakdown.employerContributions.employerPf.annualInr)}</td>
          </tr>
          <tr className={styles.printRowTotal}>
            <td>Total Cost to Company — CTC (A + Employer EPF)</td>
            <td>{formatInrWhole(breakdown.totalCtc.monthlyInr)}</td>
            <td>{formatInrWhole(breakdown.totalCtc.annualInr)}</td>
          </tr>
          <tr>
            <td>
              Less: Employee Provident Fund Deduction (12%){' '}
              <span style={{color: '#475569'}}>({breakdown.deductions.employeePf.note})</span>
            </td>
            <td>−{formatInrWhole(breakdown.deductions.employeePf.monthlyInr)}</td>
            <td>−{formatInrWhole(breakdown.deductions.employeePf.annualInr)}</td>
          </tr>
          <tr>
            <td>
              Less: Karnataka Professional Tax (PT){' '}
              <span style={{color: '#475569'}}>({breakdown.deductions.professionalTax.note})</span>
            </td>
            <td>−{formatInrWhole(breakdown.deductions.professionalTax.monthlyInr)}</td>
            <td>−{formatInrWhole(breakdown.deductions.professionalTax.annualInr)}</td>
          </tr>
          <tr className={styles.printRowBand}>
            <td>Total Monthly / Annual Statutory Deductions (Pre-TDS)</td>
            <td>−{formatInrWhole(breakdown.deductions.totalMonthlyInr)}</td>
            <td>−{formatInrWhole(breakdown.deductions.totalAnnualInr)}</td>
          </tr>
          <tr className={styles.printRowTotal}>
            <td>Estimated Net In-Hand Salary (Take-Home before Income Tax TDS)</td>
            <td>{formatInrWhole(breakdown.netInHand.monthlyInr)}</td>
            <td>{formatInrWhole(breakdown.netInHand.annualInr)}</td>
          </tr>
        </tbody>
      </table>

      <div className={styles.clauseList}>
        <div className={styles.clause}>
          <strong>Statutory Notes:</strong> (1) Basic Salary is maintained at &gt;= 50% of total
          remuneration in accordance with India’s Code on Wages. (2) Income Tax (TDS) under the
          Income-tax Act is deducted per the employee’s chosen tax regime and investment
          declarations. (3) Gratuity and statutory social security benefits apply per the Code on
          Social Security.
        </div>
      </div>

      <div className={styles.signatureGrid}>
        <div className={styles.sigBlock}>
          <strong>For Vistrah Groups Pvt Ltd</strong>
          <div className={styles.sigSpace} />
          <strong>{signatoryName}</strong>
          <span>{signatoryTitle}</span>
        </div>
        <div className={styles.sigBlock}>
          <strong>Acknowledged by Employee</strong>
          <div className={styles.sigSpace} />
          <strong>{emp.full_name}</strong>
          <span className="tabular-nums">Employee ID: {emp.employee_code}</span>
        </div>
      </div>

      <footer className={styles.sheetFooter}>
        <span>Vistrah Groups Pvt Ltd · Confidential HR Compensation Record</span>
        <span>
          {pageLabel} · {refNo}
        </span>
      </footer>
    </article>
  );
}
