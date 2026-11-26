import React, { useMemo, useState } from 'react';
import { Download, Eye, EyeOff, FileBarChart2, Printer, Search } from 'lucide-react';
import { EdirState, Language } from '../types';
import { COPY, ORG_NAME, ROLE_LABELS, formatETB, getText } from '../i18n';
import { computeMemberFinancials, computeTreasurySummary } from '../utils/billing';
import { downloadCsvUtf8 } from '../utils/exportUtils';

export type ReportKey =
  | 'member_registry'
  | 'family_dependents'
  | 'monthly_dues_arrears'
  | 'payment_receipts_status'
  | 'special_contributions'
  | 'bank_reconciliation'
  | 'disbursements_payouts'
  | 'auditor_trail'
  | 'meeting_attendance'
  | 'asset_inventory_history';

interface ReportOption {
  key: ReportKey;
  labelAm: string;
  labelEn: string;
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    key: 'member_registry',
    labelAm: '1. የተሟላ የአባላት መዝገብ ሪፖርት (ሁሉም / አለታ ወንዶ / ከውጪ)',
    labelEn: '1. Complete Member Registry Report (All / Aleta Wondo / Out-of-Town)',
  },
  {
    key: 'family_dependents',
    labelAm: '2. የአባላት ቤተሰብና ተረጂዎች ዝርዝር ሪፖርት',
    labelEn: '2. Family Dependents Report',
  },
  {
    key: 'monthly_dues_arrears',
    labelAm: '3. የወርሃዊ ክፍያ፣ የአባላት አቋም እና አውቶማቲክ ቅጣት ሪፖርት',
    labelEn: '3. Member Payment Standing, Arrears & Auto-Penalty Report',
  },
  {
    key: 'payment_receipts_status',
    labelAm: '4. የአባላት የክፍያ ደረሰኞች እና ማረጋገጫ ሁኔታ ሪፖርት',
    labelEn: '4. Member Payment Receipts & Authorization Status Report',
  },
  {
    key: 'special_contributions',
    labelAm: '5. የልዩ መዋጮዎች (ሰርግ፣ ሀዘን፣ ድንኳን፣ ወንበር) አሰባሰብ ሪፖርት',
    labelEn: '5. Special Contributions Collection Report',
  },
  {
    key: 'bank_reconciliation',
    labelAm: '6. የገንዘብ ያዥ ባንክ ማስታረቂያ እና የገንዘብ ፍሰት መግለጫ',
    labelEn: '6. Cashier Bank Reconciliation & Cash Flow Statement',
  },
  {
    key: 'disbursements_payouts',
    labelAm: '7. የተፈጸሙ የመረዳጃ ክፍያዎች (ወጪዎች) ሪፖርት',
    labelEn: '7. Disbursement & Benefit Payout Report',
  },
  {
    key: 'auditor_trail',
    labelAm: '8. የኦዲተር ቁጥጥር ታሪክ እና የልዩነት ሪፖርት',
    labelEn: '8. Auditor Trail & Discrepancy Report',
  },
  {
    key: 'meeting_attendance',
    labelAm: '9. የስብሰባ መገኘት ሪፖርት (ከአለታ ወንዶ ውጪ ያሉትን በራስ-ሰር ነፃ ያደረገ)',
    labelEn: '9. Meeting Attendance Report (Excludes Non-Aleta Wondo Residents)',
  },
  {
    key: 'asset_inventory_history',
    labelAm: '10. የዕድሩ ንብረት ቆጠራ እና ወጪ/ገቢ ታሪክ ሪፖርት',
    labelEn: '10. Edir Asset Inventory & Check-Out/Return History Report',
  },
];

interface ReportGeneratorViewProps {
  lang: Language;
  state: EdirState;
  defaultReport?: ReportKey;
  requireExplicitLoad?: boolean;
}

export const ReportGeneratorView: React.FC<ReportGeneratorViewProps> = ({
  lang,
  state,
  defaultReport = 'member_registry',
  requireExplicitLoad = false,
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportKey>(defaultReport);
  const [locationFilter, setLocationFilter] = useState<'all' | 'aleta_wondo' | 'outside'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2026-12-31');
  const [showReportTable, setShowReportTable] = useState(!requireExplicitLoad);

  const treasury = computeTreasurySummary(state);

  const reportData = useMemo(() => {
    const inRange = (d?: string) => {
      if (!d) return true;
      const day = d.slice(0, 10);
      return day >= dateFrom && day <= dateTo;
    };

    const matchesLoc = (zone: 'aleta_wondo' | 'outside') =>
      locationFilter === 'all' || zone === locationFilter;

    switch (selectedReport) {
      case 'member_registry': {
        const rows = state.members
          .filter((m) => matchesLoc(m.residenceZone))
          .filter((m) => statusFilter === 'all' || m.accessStatus === statusFilter)
          .filter((m) => inRange(m.joinedDate))
          .map((m) => [
            m.memberCode,
            getText(lang, m.fullNameAm, m.fullNameEn),
            ROLE_LABELS[m.role][lang],
            getText(lang, m.residenceCityAm, m.residenceCityEn),
            m.residenceZone === 'aleta_wondo' ? COPY[lang].aletaWondo : COPY[lang].outsideAletaWondo,
            m.phone,
            m.joinedDate,
            COPY[lang][m.accessStatus],
          ]);
        return {
          headers: [
            getText(lang, 'መለያ', 'Member ID'),
            getText(lang, 'ሙሉ ስም', 'Full Name'),
            getText(lang, 'የስራ ድርሻ', 'Role'),
            getText(lang, 'ከተማ', 'City'),
            getText(lang, 'ዞን', 'Zone'),
            getText(lang, 'ስልክ', 'Phone'),
            getText(lang, 'የተመዘገበበት', 'Joined'),
            getText(lang, 'ሁኔታ', 'Status'),
          ],
          rows,
          summary: `${getText(lang, 'ጠቅላላ አባላት፡ ', 'Total Listed Members: ')}${rows.length}`,
        };
      }

      case 'family_dependents': {
        const rows: (string | number)[][] = [];
        state.members
          .filter((m) => matchesLoc(m.residenceZone))
          .forEach((m) => {
            m.familyMembers.forEach((f) => {
              rows.push([
                m.memberCode,
                getText(lang, m.fullNameAm, m.fullNameEn),
                getText(lang, f.fullNameAm, f.fullNameEn),
                f.relationship,
                f.age,
                getText(lang, m.residenceCityAm, m.residenceCityEn),
              ]);
            });
          });
        return {
          headers: [
            getText(lang, 'የአባል መለያ', 'Member ID'),
            getText(lang, 'የአባል ስም', 'Member Name'),
            getText(lang, 'የቤተሰብ አባል ስም', 'Dependent Name'),
            getText(lang, 'ዝምድና', 'Relationship'),
            getText(lang, 'ዕድሜ', 'Age'),
            getText(lang, 'መኖሪያ', 'Location'),
          ],
          rows,
          summary: `${getText(lang, 'ጠቅላላ የተመዘገቡ ቤተሰቦች፡ ', 'Total Covered Dependents: ')}${rows.length}`,
        };
      }

      case 'monthly_dues_arrears': {
        let totalDueSum = 0;
        let totalPenaltySum = 0;
        const rows = state.members
          .filter((m) => matchesLoc(m.residenceZone))
          .map((m) => ({ m, fin: computeMemberFinancials(m, state) }))
          .filter((x) => statusFilter === 'all' || x.fin.standingStatus === statusFilter)
          .map(({ m, fin }) => {
            totalDueSum += fin.totalDue;
            totalPenaltySum += fin.autoPenaltyDue;
            return [
              m.memberCode,
              getText(lang, m.fullNameAm, m.fullNameEn),
              fin.paidMonths.length,
              fin.overdueMonths.length,
              fin.autoPenaltyDue,
              fin.specialDue,
              fin.totalDue,
              fin.standingStatus === 'overdue'
                ? COPY[lang].overdue
                : fin.standingStatus === 'pending_approval'
                ? COPY[lang].pending
                : COPY[lang].active,
            ];
          });
        return {
          headers: [
            getText(lang, 'መለያ', 'Member ID'),
            getText(lang, 'ሙሉ ስም', 'Member Name'),
            getText(lang, 'የተከፈሉ ወራት', 'Paid Mos'),
            getText(lang, 'ያለፉባቸው ወራት', 'Overdue Mos'),
            getText(lang, 'ቅጣት (ETB)', 'Auto Penalty'),
            getText(lang, 'ልዩ መዋጮ (ETB)', 'Special Due'),
            getText(lang, 'ጠቅላላ ቀሪ (ETB)', 'Total Due'),
            getText(lang, 'ሁኔታ', 'Standing'),
          ],
          rows,
          summary: `${getText(lang, 'ጠቅላላ ቅጣት፡ ', 'Total Penalties: ')}${formatETB(totalPenaltySum, lang)} · ${getText(lang, 'ጠቅላላ ቀሪ ተሰብሳቢ፡ ', 'Total Receivables: ')}${formatETB(totalDueSum, lang)}`,
        };
      }

      case 'payment_receipts_status': {
        let totalAmount = 0;
        const rows = state.paymentReceipts
          .filter((r) => inRange(r.paymentDate))
          .filter((r) => statusFilter === 'all' || r.status === statusFilter)
          .filter((r) => {
            if (locationFilter === 'all') return true;
            const mem = state.members.find((m) => m.id === r.memberId);
            return mem ? matchesLoc(mem.residenceZone) : true;
          })
          .map((r) => {
            totalAmount += r.amount;
            return [
              r.paymentDate,
              r.memberCode,
              getText(lang, r.memberNameAm, r.memberNameEn),
              r.channel,
              r.referenceNumber,
              r.amount,
              COPY[lang][r.status],
              r.authorizedByVc || r.reviewedBy || '-',
            ];
          });
        return {
          headers: [
            getText(lang, 'ቀን', 'Date'),
            getText(lang, 'መለያ', 'Member ID'),
            getText(lang, 'የአባል ስም', 'Member Name'),
            getText(lang, 'መንገድ', 'Channel'),
            getText(lang, 'Ref No.', 'Ref No.'),
            getText(lang, 'መጠን (ETB)', 'Amount'),
            getText(lang, 'ሁኔታ', 'Status'),
            getText(lang, 'ያረጋገጠው', 'Authorized / Reviewed By'),
          ],
          rows,
          summary: `${getText(lang, 'ደረሰኞች ብዛት፡ ', 'Receipts: ')}${rows.length} · ${getText(lang, 'ጠቅላላ ድምር፡ ', 'Total Amount: ')}${formatETB(totalAmount, lang)}`,
        };
      }

      case 'special_contributions': {
        const activeMembers = state.members.filter((m) => m.approvalStatus === 'approved');
        const rows = state.specialContributions
          .filter((sc) => inRange(sc.createdAt))
          .map((sc) => {
            const paidCount = sc.paidMemberIds.length;
            const collected = paidCount * sc.amount;
            const expected = activeMembers.length * sc.amount;
            return [
              sc.category.toUpperCase(),
              getText(lang, sc.titleAm, sc.titleEn),
              sc.amount,
              sc.dueDate,
              `${paidCount}/${activeMembers.length}`,
              collected,
              Math.max(0, expected - collected),
            ];
          });
        return {
          headers: [
            getText(lang, 'ምድብ', 'Category'),
            getText(lang, 'ርዕስ', 'Title'),
            getText(lang, 'የአንድ አባል መጠን', 'Amount/Member'),
            getText(lang, 'ማለቂያ ቀን', 'Due Date'),
            getText(lang, 'የከፈሉ', 'Paid Count'),
            getText(lang, 'የተሰበሰበ (ETB)', 'Collected'),
            getText(lang, 'ቀሪ (ETB)', 'Remaining'),
          ],
          rows,
          summary: `${getText(lang, 'ንቁ ልዩ መዋጮዎች፡ ', 'Special Contributions Tracked: ')}${rows.length}`,
        };
      }

      case 'bank_reconciliation': {
        const rows = state.reconciliations
          .filter((r) => inRange(r.reconciliationDate))
          .map((r) => [
            r.reconciliationDate,
            r.periodLabel,
            r.bankName,
            r.systemCalculatedBalance,
            r.bankStatementBalance,
            r.variance,
            r.reconciledBy,
            r.notes,
          ]);
        return {
          headers: [
            getText(lang, 'ቀን', 'Date'),
            getText(lang, 'ወር / ጊዜ', 'Period'),
            getText(lang, 'ባንክ', 'Bank'),
            getText(lang, 'የስርዓት ሚዛን', 'System Cash'),
            getText(lang, 'የባንክ መግለጫ', 'Bank Balance'),
            getText(lang, 'ልዩነት', 'Variance'),
            getText(lang, 'አስታራቂ', 'Reconciled By'),
            getText(lang, 'ማስታወሻ', 'Notes'),
          ],
          rows,
          summary: `${getText(lang, 'የአሁኑ የስርዓት ካዝና ሚዛን፡ ', 'Current System Net Balance: ')}${formatETB(treasury.systemCalculatedCashBalance, lang)}`,
        };
      }

      case 'disbursements_payouts': {
        let paidTotal = 0;
        const rows = state.disbursements
          .filter((d) => inRange(d.createdAt))
          .filter((d) => statusFilter === 'all' || d.status === statusFilter)
          .map((d) => {
            if (d.status === 'paid') paidTotal += d.amount;
            return [
              d.createdAt,
              getText(lang, d.memberNameAm, d.memberNameEn),
              d.benefitType,
              d.amount,
              d.status,
              d.authorizedBy || '-',
              d.paidBy || '-',
              d.payoutRef || '-',
            ];
          });
        return {
          headers: [
            getText(lang, 'ቀን', 'Date'),
            getText(lang, 'ተቀባይ', 'Recipient'),
            getText(lang, 'አይነት', 'Benefit Type'),
            getText(lang, 'መጠን (ETB)', 'Amount'),
            getText(lang, 'ሁኔታ', 'Status'),
            getText(lang, 'ፈቃጅ (VC)', 'Authorized By'),
            getText(lang, 'ከፋይ (Cashier)', 'Paid By'),
            getText(lang, 'መለያ Ref', 'Payout Ref'),
          ],
          rows,
          summary: `${getText(lang, 'ጠቅላላ የተከፈለ ወጪ፡ ', 'Total Paid Disbursements: ')}${formatETB(paidTotal, lang)}`,
        };
      }

      case 'auditor_trail': {
        const rows = state.auditLogs
          .filter((a) => inRange(a.timestamp))
          .map((a) => [
            a.timestamp,
            a.actorName,
            ROLE_LABELS[a.actorRole][lang],
            a.module,
            a.action,
            a.details,
          ]);
        return {
          headers: [
            getText(lang, 'ቀን እና ሰዓት', 'Timestamp'),
            getText(lang, 'ፈጻሚ', 'Actor'),
            getText(lang, 'ድርሻ', 'Role'),
            getText(lang, 'ክፍል', 'Module'),
            getText(lang, 'ድርጊት', 'Action'),
            getText(lang, 'ዝርዝር', 'Details'),
          ],
          rows,
          summary: `${getText(lang, 'ጠቅላላ የኦዲት መዛግብት፡ ', 'Total Audit Events: ')}${rows.length}`,
        };
      }

      case 'meeting_attendance': {
        const activeMtg = state.meetings[0];
        // Automatically filter to Aleta Wondo residents for mandatory physical roll, while noting exempt count
        const localMembers = state.members.filter(
          (m) => m.approvalStatus === 'approved' && m.residenceZone === 'aleta_wondo'
        );
        const exemptCount = state.members.filter(
          (m) => m.approvalStatus === 'approved' && m.residenceZone === 'outside'
        ).length;
        const rows = localMembers.map((m) => {
          const rec = activeMtg
            ? state.attendance.find(
                (a) => a.meetingId === activeMtg.id && a.memberId === m.id
              )
            : undefined;
          return [
            activeMtg ? getText(lang, activeMtg.titleAm, activeMtg.titleEn) : '-',
            m.memberCode,
            getText(lang, m.fullNameAm, m.fullNameEn),
            getText(lang, m.residenceCityAm, m.residenceCityEn),
            rec?.status || 'unmarked',
            rec?.method || '-',
            rec?.checkedInAt || '-',
          ];
        });
        return {
          headers: [
            getText(lang, 'ስብሰባ', 'Meeting'),
            getText(lang, 'መለያ', 'Member ID'),
            getText(lang, 'ስም (አለታ ወንዶ ነዋሪ)', 'Mandatory Attendee'),
            getText(lang, 'አድራሻ', 'Location'),
            getText(lang, 'ሁኔታ', 'Attendance'),
            getText(lang, 'ዘዴ', 'Method'),
            getText(lang, 'ሰዓት', 'Time'),
          ],
          rows,
          summary: `${getText(lang, 'ግዴታ ያለባቸው (አለታ ወንዶ)፡ ', 'Mandatory Local Members: ')}${localMembers.length} · ${getText(lang, 'ከአለታ ወንዶ ውጪ ነፃ የተደረጉ፡ ', 'Auto-Exempt Outside Aleta Wondo: ')}${exemptCount}`,
        };
      }

      case 'asset_inventory_history': {
        const rows = state.assetLogs
          .filter((l) => inRange(l.date))
          .map((l) => [
            l.date,
            l.action === 'issued'
              ? getText(lang, 'ወጪ (Issued)', 'Issued')
              : getText(lang, 'ገቢ (Returned)', 'Returned'),
            getText(lang, l.assetNameAm, l.assetNameEn),
            getText(lang, l.memberNameAm, l.memberNameEn),
            l.quantity,
            l.expectedReturnDate || '-',
            l.condition || '-',
            l.notes,
          ]);
        return {
          headers: [
            getText(lang, 'ቀን', 'Date'),
            getText(lang, 'ድርጊት', 'Action'),
            getText(lang, 'ንብረት', 'Asset'),
            getText(lang, 'አባል', 'Member'),
            getText(lang, 'ብዛት', 'Qty'),
            getText(lang, 'መመለሻ ቀን', 'Expected Return'),
            getText(lang, 'ሁኔታ', 'Condition'),
            getText(lang, 'ማስታወሻ', 'Notes'),
          ],
          rows,
          summary: `${getText(lang, 'ጠቅላላ የንብረት ግምት፡ ', 'Total Asset Value: ')}${formatETB(treasury.totalAssetValue, lang)}`,
        };
      }
    }
  }, [selectedReport, locationFilter, statusFilter, dateFrom, dateTo, state, lang, treasury]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reportData.rows;
    return reportData.rows.filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(q))
    );
  }, [reportData.rows, searchQuery]);

  const statusLovOptions = useMemo(() => {
    switch (selectedReport) {
      case 'monthly_dues_arrears':
        return [
          { value: 'all', label: getText(lang, 'ሁሉም ሁኔታዎች', 'All Standings') },
          { value: 'good', label: COPY[lang].active },
          { value: 'overdue', label: COPY[lang].overdue },
          { value: 'pending_approval', label: COPY[lang].pending },
        ];
      case 'payment_receipts_status':
        return [
          { value: 'all', label: getText(lang, 'ሁሉም ደረሰኞች', 'All Receipts') },
          { value: 'pending', label: COPY[lang].pending },
          { value: 'verified', label: COPY[lang].verified },
          { value: 'rejected', label: COPY[lang].rejected },
        ];
      case 'member_registry':
        return [
          { value: 'all', label: getText(lang, 'ሁሉም ሁኔታዎች', 'All Statuses') },
          { value: 'active', label: COPY[lang].active },
          { value: 'pending', label: COPY[lang].pending },
          { value: 'suspended', label: COPY[lang].suspended },
        ];
      case 'disbursements_payouts':
        return [
          { value: 'all', label: getText(lang, 'ሁሉም ሁኔታዎች', 'All Statuses') },
          { value: 'pending_vice_chairman', label: COPY[lang].pending },
          { value: 'authorized_for_cashier', label: COPY[lang].authorizeForCashier },
          { value: 'paid', label: COPY[lang].paid },
          { value: 'rejected', label: COPY[lang].rejected },
        ];
      default:
        return [{ value: 'all', label: getText(lang, 'ሁሉም', 'All') }];
    }
  }, [selectedReport, lang]);

  const currentReportOption = REPORT_OPTIONS.find((r) => r.key === selectedReport)!;
  const isTableVisible = showReportTable || searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Controls & LOV Selector */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <FileBarChart2 className="w-5 h-5 text-[#064E3B]" />
            <div>
              <h2 className="text-base font-bold text-[#064E3B]">
                {getText(lang, 'የተሟላ ሪፖርት ማመንጫ (LOV Selector)', 'Comprehensive Dynamic Report Generator (LOV)')}
              </h2>
              <p className="text-xs text-slate-600">
                {getText(
                  lang,
                  'ከሊስት ኦፍ ቫልዩ (LOV) የሚፈልጉትን መረጃ ይምረጡ፣ ያጣሩ እና በPDF ወይም CSV ያውርዱ።',
                  'Select any report from the LOV dropdown, filter by status/location, view on demand, and export as PDF or CSV.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowReportTable((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-[#064E3B] text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap"
            >
              {isTableVisible ? (
                <EyeOff className="w-4 h-4 text-[#D97706]" />
              ) : (
                <Eye className="w-4 h-4 text-[#047857]" />
              )}
              <span>
                {isTableVisible
                  ? getText(lang, 'ዝርዝር ደብቅ', 'Hide Report Table')
                  : getText(lang, 'ዝርዝር አሳይ', 'View Selected Report')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowReportTable(true);
                setTimeout(() => window.print(), 50);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>{COPY[lang].printPdf}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                downloadCsvUtf8(
                  `aleta_wondo_edir_${selectedReport}`,
                  reportData.headers,
                  filteredRows
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#D97706] hover:bg-[#F59E0B] text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>{COPY[lang].exportCsv}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-[#064E3B] mb-1">
              {getText(lang, 'የሪፖርት አይነት ይምረጡ (LOV)', 'Select Information / Report (LOV)')}
            </label>
            <select
              value={selectedReport}
              onChange={(e) => {
                setSelectedReport(e.target.value as ReportKey);
                setStatusFilter('all');
                setShowReportTable(true);
              }}
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
            >
              {REPORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {getText(lang, opt.labelAm, opt.labelEn)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#064E3B] mb-1">
              {getText(lang, 'የመኖሪያ ቦታ (LOV)', 'Location (LOV)')}
            </label>
            <select
              value={locationFilter}
              onChange={(e) =>
                setLocationFilter(e.target.value as 'all' | 'aleta_wondo' | 'outside')
              }
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">{getText(lang, 'ሁሉም አካባቢዎች', 'All Locations')}</option>
              <option value="aleta_wondo">{COPY[lang].aletaWondo}</option>
              <option value="outside">{COPY[lang].outsideAletaWondo}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#064E3B] mb-1">
              {getText(lang, 'ሁኔታ (Status LOV)', 'Status (LOV)')}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setShowReportTable(true);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
            >
              {statusLovOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#064E3B] mb-1">
              {getText(lang, 'ከቀን', 'From Date')}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#064E3B] mb-1">
              {getText(lang, 'እስከ ቀን', 'To Date')}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={getText(
                lang,
                'በአባል ስም፣ መለያ ወይም ቁጥር ይፈልጉ...',
                'Search inside selected LOV report...'
              )}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg"
            />
          </div>
          <p className="text-xs font-semibold text-[#064E3B] font-mono tabular-nums">
            {reportData.summary}
          </p>
        </div>
      </section>

      {/* Printable Report Preview Sheet (Hidden Until Requested if requireExplicitLoad=true) */}
      {isTableVisible && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 print-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3.5">
              <img
                src="/assets/aistudio/logo_27d4fad1.png"
                alt="Edir Official Seal"
                className="w-12 h-12 rounded-full object-cover border border-[#064E3B]/20 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-xs font-semibold text-[#047857]">
                  {getText(lang, ORG_NAME.am, ORG_NAME.en)}
                </p>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {getText(lang, currentReportOption.labelAm, currentReportOption.labelEn)}
                </h3>
              </div>
            </div>
            <div className="text-xs text-slate-500 font-mono text-right tabular-nums">
              <p>{new Date().toISOString().slice(0, 10)}</p>
              <p className="text-[#064E3B] font-semibold mt-0.5">{reportData.summary}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-300 text-[#064E3B] font-bold bg-slate-50">
                  {reportData.headers.map((h, i) => (
                    <th key={i} className="py-2.5 px-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={reportData.headers.length}
                      className="py-8 text-center text-slate-500"
                    >
                      {COPY[lang].noRecords}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/70">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className={`py-2.5 px-3 ${
                            typeof cell === 'number' ? 'font-mono tabular-nums font-medium' : ''
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
