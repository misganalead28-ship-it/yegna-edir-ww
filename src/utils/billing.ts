import { BillingConfig, EdirState, MemberRecord } from '../types';

export interface MemberFinancialSummary {
  memberId: string;
  paidMonths: string[];
  overdueMonths: string[]; // Past active months unpaid -> incur penalty
  currentMonthUnpaid: boolean; // Latest active month not yet penalized unless closed
  monthlyFeeDue: number;
  autoPenaltyDue: number;
  unpaidSpecialContributions: { id: string; titleAm: string; titleEn: string; amount: number; dueDate: string }[];
  specialDue: number;
  totalDue: number;
  totalPaidEstimated: number;
  standingStatus: 'good' | 'overdue' | 'pending_approval';
}

export function computeMemberFinancials(
  member: MemberRecord,
  state: EdirState
): MemberFinancialSummary {
  const { monthlyFee, latePenaltyFee, activeBillingMonths } = state.billingConfig;

  if (member.approvalStatus !== 'approved') {
    return {
      memberId: member.id,
      paidMonths: member.paidMonths,
      overdueMonths: [],
      currentMonthUnpaid: false,
      monthlyFeeDue: 0,
      autoPenaltyDue: 0,
      unpaidSpecialContributions: [],
      specialDue: 0,
      totalDue: 0,
      totalPaidEstimated: 0,
      standingStatus: 'pending_approval',
    };
  }

  // Latest active month in activeBillingMonths is treated as current open cycle;
  // all earlier active months without payment are automatically flagged overdue with penalty.
  const latestMonth = activeBillingMonths[activeBillingMonths.length - 1];
  const unpaidMonths = activeBillingMonths.filter((m) => !member.paidMonths.includes(m));
  const overdueMonths = unpaidMonths.filter((m) => m !== latestMonth);
  const currentMonthUnpaid = unpaidMonths.includes(latestMonth);

  const monthlyFeeDue = unpaidMonths.length * monthlyFee;
  const autoPenaltyDue = overdueMonths.length * latePenaltyFee;

  const unpaidSpecialContributions = state.specialContributions
    .filter((sc) => !sc.paidMemberIds.includes(member.id))
    .map((sc) => ({
      id: sc.id,
      titleAm: sc.titleAm,
      titleEn: sc.titleEn,
      amount: sc.amount,
      dueDate: sc.dueDate,
    }));

  const specialDue = unpaidSpecialContributions.reduce((acc, sc) => acc + sc.amount, 0);
  const totalDue = monthlyFeeDue + autoPenaltyDue + specialDue;

  const verifiedReceiptSum = state.paymentReceipts
    .filter((r) => r.memberId === member.id && r.status === 'verified')
    .reduce((sum, r) => sum + r.amount, 0);

  const baselinePaid =
    verifiedReceiptSum > 0
      ? verifiedReceiptSum
      : member.paidMonths.length * monthlyFee;

  return {
    memberId: member.id,
    paidMonths: member.paidMonths,
    overdueMonths,
    currentMonthUnpaid,
    monthlyFeeDue,
    autoPenaltyDue,
    unpaidSpecialContributions,
    specialDue,
    totalDue,
    totalPaidEstimated: baselinePaid,
    standingStatus: overdueMonths.length > 0 ? 'overdue' : 'good',
  };
}

export interface TreasurySummary {
  totalVerifiedInflow: number;
  totalDisbursedOutflow: number;
  openingBalance: number;
  systemCalculatedCashBalance: number;
  totalOutstandingReceivables: number;
  totalArrearsPenalties: number;
  totalAssetValue: number;
}

export function computeTreasurySummary(state: EdirState): TreasurySummary {
  const totalVerifiedInflow = state.paymentReceipts
    .filter((r) => r.status === 'verified')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalDisbursedOutflow = state.disbursements
    .filter((d) => d.status === 'paid')
    .reduce((sum, d) => sum + d.amount, 0);

  const systemCalculatedCashBalance =
    state.billingConfig.openingBalance + totalVerifiedInflow - totalDisbursedOutflow;

  let totalOutstandingReceivables = 0;
  let totalArrearsPenalties = 0;

  state.members.forEach((m) => {
    const fin = computeMemberFinancials(m, state);
    totalOutstandingReceivables += fin.totalDue;
    totalArrearsPenalties += fin.autoPenaltyDue;
  });

  const totalAssetValue = state.assets.reduce(
    (sum, a) => sum + a.totalQuantity * a.unitValue,
    0
  );

  return {
    totalVerifiedInflow,
    totalDisbursedOutflow,
    openingBalance: state.billingConfig.openingBalance,
    systemCalculatedCashBalance,
    totalOutstandingReceivables,
    totalArrearsPenalties,
    totalAssetValue,
  };
}

export function getEffectiveBillingConfig(config: BillingConfig): BillingConfig {
  return config;
}
