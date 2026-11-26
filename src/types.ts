export type Language = 'am' | 'en';

export type Role =
  | 'chairman'
  | 'vice_chairman'
  | 'secretary'
  | 'cashier'
  | 'auditor'
  | 'pr'
  | 'committee'
  | 'member';

export type AccessStatus = 'active' | 'pending' | 'suspended';

export type ResidenceZone = 'aleta_wondo' | 'outside';

export type MemberApprovalStatus = 'pending_chairman' | 'approved' | 'rejected';

export interface FamilyMember {
  id: string;
  fullNameAm: string;
  fullNameEn: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'dependent';
  age: number;
  notes?: string;
}

export interface MemberRecord {
  id: string;
  memberCode: string; // e.g., EAW-001
  fullNameAm: string;
  fullNameEn: string;
  email: string;
  phone: string;
  role: Role;
  accessStatus: AccessStatus;
  approvalStatus: MemberApprovalStatus;
  residenceZone: ResidenceZone;
  residenceCityAm: string;
  residenceCityEn: string;
  kebele?: string;
  joinedDate: string; // YYYY-MM-DD
  paidMonths: string[]; // ['2026-07', '2026-08', ...]
  familyMembers: FamilyMember[];
  registeredBy: string;
  approvedBy?: string;
  photoUrl?: string;
  qrToken: string;
  googleEmail?: string;
  googleAdminPermission?: boolean;
  isItAdmin?: boolean;
  locked?: boolean;
  passwordHash?: string;
  mustChangePassword?: boolean;
  defaultTempPassword?: string;
  lastPasswordResetAt?: string;
  lastPasswordResetBy?: string;
}

export interface SpecialContribution {
  id: string;
  category: 'wedding' | 'bereavement' | 'chairs' | 'tents' | 'other';
  titleAm: string;
  titleEn: string;
  amount: number;
  dueDate: string;
  createdAt: string;
  createdBy: string;
  paidMemberIds: string[];
}

export interface PaymentReceipt {
  id: string;
  memberId: string;
  memberCode: string;
  memberNameAm: string;
  memberNameEn: string;
  paymentType: 'monthly' | 'special' | 'penalty_settlement';
  targetMonths?: string[];
  specialContributionId?: string;
  amount: number;
  penaltyIncluded: number;
  channel: 'CBE' | 'Coop';
  referenceNumber: string;
  paymentDate: string;
  receiptFileName?: string;
  receiptDataUrl?: string;
  status: 'pending' | 'verified' | 'rejected';
  reviewerNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  authorizedByVc?: string;
  authorizedAtVc?: string;
  submittedAt: string;
}

export interface BenefitRule {
  id: string;
  categoryAm: string;
  categoryEn: string;
  descriptionAm: string;
  descriptionEn: string;
  amount: number;
  eligibilityNoteAm: string;
  eligibilityNoteEn: string;
}

export interface DisbursementRequest {
  id: string;
  memberId: string;
  memberNameAm: string;
  memberNameEn: string;
  benefitType: string;
  reasonAm: string;
  reasonEn: string;
  amount: number;
  status: 'pending_vice_chairman' | 'authorized_for_cashier' | 'paid' | 'rejected';
  createdAt: string;
  authorizedBy?: string;
  authorizedAt?: string;
  paidBy?: string;
  paidAt?: string;
  payoutRef?: string;
  rejectionNote?: string;
}

export interface EdirRequest {
  id: string;
  memberId: string;
  memberCode: string;
  memberNameAm: string;
  memberNameEn: string;
  requestType: 'property' | 'support' | 'inquiry';
  assetId?: string;
  assetNameAm?: string;
  assetNameEn?: string;
  quantity?: number;
  neededFrom?: string;
  neededUntil?: string;
  subjectAm: string;
  subjectEn: string;
  details: string;
  status:
    | 'submitted'
    | 'vice_chairman_reviewed'
    | 'chairman_approved'
    | 'issued'
    | 'returned'
    | 'rejected';
  createdAt: string;
  viceChairmanNote?: string;
  chairmanNote?: string;
  reviewedByVc?: string;
  approvedByChairman?: string;
}

export interface EdirAsset {
  id: string;
  nameAm: string;
  nameEn: string;
  category: 'tent' | 'chair' | 'utensil' | 'audio' | 'other';
  totalQuantity: number;
  availableQuantity: number;
  conditionSummaryAm: string;
  conditionSummaryEn: string;
  unitValue: number;
}

export interface AssetMovementLog {
  id: string;
  assetId: string;
  assetNameAm: string;
  assetNameEn: string;
  requestId?: string;
  memberId: string;
  memberNameAm: string;
  memberNameEn: string;
  quantity: number;
  action: 'issued' | 'returned';
  date: string;
  expectedReturnDate?: string;
  condition?: 'good' | 'damaged';
  notes: string;
  recordedBy: string;
}

export interface MeetingSession {
  id: string;
  titleAm: string;
  titleEn: string;
  date: string;
  time: string;
  venueAm: string;
  venueEn: string;
  status: 'active' | 'closed';
  qrCodeValue: string;
  createdBy: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  meetingId: string;
  memberId: string;
  memberCode: string;
  memberNameAm: string;
  memberNameEn: string;
  residenceZone: ResidenceZone;
  status: 'present' | 'absent' | 'exempt';
  method?: 'qr_scan' | 'manual' | 'auto_exempt';
  checkedInAt?: string;
  checkedInBy?: string;
}

export interface Announcement {
  id: string;
  category: 'general' | 'bereavement' | 'celebration' | 'meeting' | 'financial';
  priority: 'normal' | 'urgent';
  titleAm: string;
  titleEn: string;
  bodyAm: string;
  bodyEn: string;
  authorName: string;
  authorRole: Role;
  createdAt: string;
}

export interface CommitteeDirective {
  id: string;
  titleAm: string;
  titleEn: string;
  instructionAm: string;
  instructionEn: string;
  targetRole: Role | 'all_committee';
  issuedBy: string;
  issuedAt: string;
  status: 'open' | 'acknowledged';
}

export interface EmergencyAlert {
  id: string;
  memberId: string;
  memberCode: string;
  memberNameAm: string;
  memberNameEn: string;
  phone: string;
  emergencyType: 'bereavement' | 'medical' | 'urgent_support';
  relationAffected: string;
  location: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
}

export interface DocumentArchiveItem {
  id: string;
  titleAm: string;
  titleEn: string;
  docType: 'bylaws' | 'minutes' | 'financial' | 'policy' | 'legacy_import';
  year: string;
  fileName: string;
  fileSizeLabel: string;
  fileDataUrl?: string;
  textPreview?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface BankReconciliation {
  id: string;
  reconciliationDate: string;
  periodLabel: string;
  systemCalculatedBalance: number;
  bankStatementBalance: number;
  variance: number;
  bankName: string;
  accountLast4: string;
  notes: string;
  reconciledBy: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId?: string;
  actorName: string;
  actorRole: Role;
  action: string;
  module: string;
  details: string;
  timestamp: string;
}

export interface BillingConfig {
  monthlyFee: number;
  latePenaltyFee: number;
  activeBillingMonths: string[]; // e.g., ['2026-06', ..., '2026-11']
  openingBalance: number;
  cbeAccountNumber?: string;
  cbeAccountName?: string;
  coopAccountNumber?: string;
}

export interface EdirState {
  members: MemberRecord[];
  specialContributions: SpecialContribution[];
  paymentReceipts: PaymentReceipt[];
  benefitRules: BenefitRule[];
  disbursements: DisbursementRequest[];
  requests: EdirRequest[];
  assets: EdirAsset[];
  assetLogs: AssetMovementLog[];
  meetings: MeetingSession[];
  attendance: AttendanceRecord[];
  announcements: Announcement[];
  directives: CommitteeDirective[];
  emergencies: EmergencyAlert[];
  documents: DocumentArchiveItem[];
  reconciliations: BankReconciliation[];
  auditLogs: AuditLogEntry[];
  billingConfig: BillingConfig;
}
