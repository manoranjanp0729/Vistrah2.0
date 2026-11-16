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
