/**
 * 2026 Indian Labour Code Compensation & CTC Calculator — Vistrah Groups Pvt Ltd.
 *
 * Enforces India's Code on Wages 50% Basic Wage Rule:
 * - Basic Salary >= 50% of Total Remuneration (CTC)
 * - House Rent Allowance (HRA) = 50% of Basic Salary
 * - Employer EPF = 12% of PF Wage (capped at ₹15,000/mo wage ceiling by default, or uncapped)
 * - Special Allowance = Balancing component of CTC (always >= ₹0)
 * - Employee Deductions:
 *   - Employee EPF = 12% of PF Wage (when pfApplicable is true)
 *   - Karnataka Professional Tax = ₹200/mo when monthly Gross >= ₹25,000 (when ptApplicable is true)
 */

export type EmploymentType = 'permanent' | 'probation' | 'fixed_term' | 'intern';
export type EmployeeStatus = 'active' | 'relieved';
export type BankAccountType = 'savings' | 'salary' | 'current';
export type PaymentMode = 'NEFT' | 'IMPS' | 'UPI' | 'BANK_TRANSFER';
export type SalaryCreditStatus = 'pending' | 'credited';

export interface SalaryCalculationOptions {
  pfApplicable?: boolean;
  ptApplicable?: boolean;
  pfCapped?: boolean;
}

export interface SalaryComponentLine {
  key: string;
  label: string;
  note?: string;
  monthlyInr: number;
  annualInr: number;
}

export interface SalaryBreakdown {
  annualCtcInr: number;
  monthlyCtcInr: number;
  basicShareOfCtcPct: number;
  basicShareOfGrossPct: number;
  pfApplicable: boolean;
  ptApplicable: boolean;
  pfCapped: boolean;
  esiApplicableNote: boolean;
  earnings: {
    basic: SalaryComponentLine;
    hra: SalaryComponentLine;
    specialAllowance: SalaryComponentLine;
  };
  gross: {
    monthlyInr: number;
    annualInr: number;
  };
  employerContributions: {
    employerPf: SalaryComponentLine;
  };
  deductions: {
    employeePf: SalaryComponentLine;
    professionalTax: SalaryComponentLine;
    totalMonthlyInr: number;
    totalAnnualInr: number;
  };
  netInHand: {
    monthlyInr: number;
    annualInr: number;
  };
  totalCtc: {
    monthlyInr: number;
    annualInr: number;
  };
}

export const KARNATAKA_PT_THRESHOLD_MONTHLY_INR = 25000;
export const KARNATAKA_PT_MONTHLY_INR = 200;
export const EPF_STATUTORY_WAGE_CEILING_MONTHLY_INR = 15000;
export const ESIC_GROSS_CEILING_MONTHLY_INR = 21000;

export function calculateSalaryBreakdown(
  annualCtcInr: number,
  options: SalaryCalculationOptions = {},
): SalaryBreakdown {
  const pfApplicable = options.pfApplicable ?? true;
  const ptApplicable = options.ptApplicable ?? true;
  const pfCapped = options.pfCapped ?? true;

  const cleanAnnualCtc = Number.isFinite(annualCtcInr)
    ? Math.max(0, Math.round(annualCtcInr))
    : 0;
  const monthlyCtc = Math.round(cleanAnnualCtc / 12);

  // 1. 50% Basic Wage Rule (Basic >= 50% of Total CTC)
  const annualBasic = Math.ceil(cleanAnnualCtc * 0.5);
  const monthlyBasic = Math.ceil(monthlyCtc * 0.5);

  // 2. HRA = 50% of Basic (Metropolitan / Bengaluru standard)
  const annualHra = Math.round(annualBasic * 0.5);
  const monthlyHra = Math.round(monthlyBasic * 0.5);

  // 3. Employer & Employee PF (12% of PF Wage)
  let monthlyEmployerPf = 0;
  let annualEmployerPf = 0;
  if (pfApplicable && cleanAnnualCtc > 0) {
    if (pfCapped) {
      const pfWageMonthly = Math.min(monthlyBasic, EPF_STATUTORY_WAGE_CEILING_MONTHLY_INR);
      monthlyEmployerPf = Math.round(pfWageMonthly * 0.12);
      annualEmployerPf = Math.min(
        monthlyEmployerPf * 12,
        Math.round(annualBasic * 0.12),
      );
    } else {
      annualEmployerPf = Math.round(annualBasic * 0.12);
      monthlyEmployerPf = Math.round(monthlyBasic * 0.12);
    }
  }

  // 4. Special Allowance balances exact Total CTC
  const annualSpecialAllowance = Math.max(
    0,
    cleanAnnualCtc - annualBasic - annualHra - annualEmployerPf,
  );
  const monthlySpecialAllowance = Math.max(
    0,
    monthlyCtc - monthlyBasic - monthlyHra - monthlyEmployerPf,
  );

  // 5. Gross Earnings
  const annualGross = annualBasic + annualHra + annualSpecialAllowance;
  const monthlyGross = monthlyBasic + monthlyHra + monthlySpecialAllowance;

  // 6. Employee Deductions (Employee PF + Karnataka Professional Tax)
  const monthlyEmployeePf = monthlyEmployerPf;
  const annualEmployeePf = annualEmployerPf;

  const monthlyPt =
    ptApplicable && monthlyGross >= KARNATAKA_PT_THRESHOLD_MONTHLY_INR
      ? KARNATAKA_PT_MONTHLY_INR
      : 0;
  const annualPt = monthlyPt * 12;

  const totalMonthlyDeductions = monthlyEmployeePf + monthlyPt;
  const totalAnnualDeductions = annualEmployeePf + annualPt;

  // 7. Net In-Hand & Total CTC
  const monthlyNetInHand = Math.max(0, monthlyGross - totalMonthlyDeductions);
  const annualNetInHand = Math.max(0, annualGross - totalAnnualDeductions);

  const totalMonthlyCtc = monthlyGross + monthlyEmployerPf;
  const totalAnnualCtc = annualGross + annualEmployerPf;

  const basicShareOfCtcPct =
    totalAnnualCtc > 0 ? Number(((annualBasic / totalAnnualCtc) * 100).toFixed(1)) : 50.0;
  const basicShareOfGrossPct =
    annualGross > 0 ? Number(((annualBasic / annualGross) * 100).toFixed(1)) : 50.0;

  return {
    annualCtcInr: totalAnnualCtc,
    monthlyCtcInr: totalMonthlyCtc,
    basicShareOfCtcPct,
    basicShareOfGrossPct,
    pfApplicable,
    ptApplicable,
    pfCapped,
    esiApplicableNote: monthlyGross > 0 && monthlyGross <= ESIC_GROSS_CEILING_MONTHLY_INR,
    earnings: {
      basic: {
        key: 'basic',
        label: 'Basic Salary',
        note: '50% of Total CTC (2026 Wage Code compliant)',
        monthlyInr: monthlyBasic,
        annualInr: annualBasic,
      },
      hra: {
        key: 'hra',
        label: 'House Rent Allowance (HRA)',
        note: '50% of Basic Salary',
        monthlyInr: monthlyHra,
        annualInr: annualHra,
      },
      specialAllowance: {
        key: 'special_allowance',
        label: 'Special & Flexible Allowance',
        note: 'Balancing fixed allowance',
        monthlyInr: monthlySpecialAllowance,
        annualInr: annualSpecialAllowance,
      },
    },
    gross: {
      monthlyInr: monthlyGross,
      annualInr: annualGross,
    },
    employerContributions: {
      employerPf: {
        key: 'employer_pf',
        label: 'Employer Provident Fund (EPF)',
        note: pfApplicable
          ? pfCapped
            ? '12% on ₹15,000/mo statutory ceiling'
            : '12% of Basic Salary (uncapped)'
          : 'Not opted / Not applicable',
        monthlyInr: monthlyEmployerPf,
        annualInr: annualEmployerPf,
      },
    },
    deductions: {
      employeePf: {
        key: 'employee_pf',
        label: 'Employee Provident Fund (EPF)',
        note: pfApplicable
          ? pfCapped
            ? '12% on ₹15,000/mo statutory ceiling'
            : '12% of Basic Salary (uncapped)'
          : 'Not applicable',
        monthlyInr: monthlyEmployeePf,
        annualInr: annualEmployeePf,
      },
      professionalTax: {
        key: 'professional_tax',
        label: 'Karnataka Professional Tax (PT)',
        note: ptApplicable
          ? monthlyGross >= KARNATAKA_PT_THRESHOLD_MONTHLY_INR
            ? '₹200/mo (Monthly Gross >= ₹25,000)'
            : '₹0 (Exempt below ₹25,000/mo Gross)'
          : 'Exempt / Not applicable',
        monthlyInr: monthlyPt,
        annualInr: annualPt,
      },
      totalMonthlyInr: totalMonthlyDeductions,
      totalAnnualInr: totalAnnualDeductions,
    },
    netInHand: {
      monthlyInr: monthlyNetInHand,
      annualInr: annualNetInHand,
    },
    totalCtc: {
      monthlyInr: totalMonthlyCtc,
      annualInr: totalAnnualCtc,
    },
  };
}

export function formatInrWhole(amountInr: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amountInr || 0));
}

export function maskBankAccount(accountNumber: string | null | undefined): string {
  const clean = (accountNumber ?? '').trim();
  if (!clean) return '';
  if (clean.length <= 4) return `••••${clean}`;
  return `••••${clean.slice(-4)}`;
}

export function formatPayMonthLabel(payMonth: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec((payMonth || '').trim());
  if (!match) return payMonth;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const dt = new Date(Date.UTC(year, monthIdx, 1));
  if (Number.isNaN(dt.getTime())) return payMonth;
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];
const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const rem = n % 10;
  return rem ? `${TENS[ten]} ${ONES[rem]}` : TENS[ten];
}

function threeDigitWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rem = n % 100;
  if (hundred && rem) return `${ONES[hundred]} Hundred ${twoDigitWords(rem)}`;
  if (hundred) return `${ONES[hundred]} Hundred`;
  return twoDigitWords(rem);
}

export function numberToIndianRupeesWords(amountInr: number): string {
  const n = Math.max(0, Math.round(amountInr || 0));
  if (n === 0) return 'Rupees Zero Only';
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const rest = n % 1_000;
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (rest) parts.push(threeDigitWords(rest));
  return `Rupees ${parts.join(' ')} Only`;
}

function csvCell(raw: string | number | null | undefined): string {
  let str = String(raw ?? '').replace(/\r?\n/g, ' ').trim();
  // Neutralize spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface BankPayoutCsvRow {
  employeeCode: string;
  beneficiaryName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
  netPayableInr: number;
  narration: string;
}

export function buildBankPayoutCsv(rows: BankPayoutCsvRow[]): string {
  const header = [
    'Employee Code',
    'Beneficiary Name',
    'Account Number',
    'IFSC',
    'Bank Name',
    'Net Payable INR',
    'Narration',
  ].join(',');
  const lines = rows.map(r =>
    [
      csvCell(r.employeeCode),
      csvCell(r.beneficiaryName),
      csvCell(r.accountNumber),
      csvCell(r.ifsc),
      csvCell(r.bankName),
      csvCell(Math.max(0, Math.round(r.netPayableInr))),
      csvCell(r.narration),
    ].join(','),
  );
  return [header, ...lines].join('\r\n');
}
