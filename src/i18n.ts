import { Language, Role } from './types';

export const ORG_NAME = {
  am: 'የአለታ ወንዶ ወጣቶች በሁሉ ቦታ መረዳጃ ዕድር',
  en: 'Aleta Wondo Youth Mutual Aid Edir',
  shortAm: 'የአለታ ወንዶ ወጣቶች ዕድር',
  shortEn: 'Aleta Wondo Youth Edir',
  addressAm: 'አለታ ወንዶ፣ ሲዳማ፣ ኢትዮጵያ',
  addressEn: 'Aleta Wondo, Sidama, Ethiopia',
};

export const ROLE_LABELS: Record<Role, { am: string; en: string }> = {
  chairman: { am: 'ዋና ሰብሳቢ', en: 'Chairman' },
  vice_chairman: { am: 'ምክትል ሰብሳቢ', en: 'Vice Chairman' },
  secretary: { am: 'ፀሀፊ', en: 'Secretary' },
  cashier: { am: 'ገንዘብ ያዥ', en: 'Cashier' },
  auditor: { am: 'ኦዲተር እና የሲስተም አስተዳዳሪ', en: 'Auditor & IT System Admin' },
  pr: { am: 'ህዝብ ግንኙነት', en: 'Public Relations' },
  committee: { am: 'የኮሚቴ አባል', en: 'Committee Member' },
  member: { am: 'መደበኛ አባል', en: 'Regular Member' },
};

export const COPY = {
  am: {
    appTagline: 'በአለታ ወንዶ እና በመላው ዓለም ለሚገኙ ወጣቶች የተዘጋጀ የጋራ መረዳጃ ሥርዓት',
    loginTitle: 'ወደ መረዳጃ ዕድር መግቢያ',
    loginSubtitle: 'በአባል መለያ፣ በስልክ ቁጥር፣ በኢሜይል ወይም በGoogle መለያዎ ይግቡ',
    emailOrPhone: 'ኢሜይል ወይም ስልክ ቁጥር',
    password: 'የይለፍ ቃል',
    signIn: 'ግባ',
    signOut: 'ውጣ',
    quickRoleSwitch: 'ፈጣን የኮሚቴና የአባል መግቢያ (ለሙከራ)',
    languageToggle: 'English',
    etb: 'ብር',
    // Navigation (Consolidated Modules)
    navOverview: 'የአመራር ማጠቃለያ',
    navFinanceModule: 'የፋይናንስ እና መዋጮ ክፍል',
    navMembersModule: 'የአባላት እና የሲስተም አስተዳደር',
    navOperationsModule: 'ስብሰባ እና የዕድሩ ንብረት',
    navInfoReportsModule: 'መዛግብት፣ መልዕክቶች እና ሪፖርቶች',
    navMemberPortal: 'የአባላት መገልገያ',
    navExecutive: 'የአመራር ማጠቃለያ',
    navPayments: 'ክፍያዎችና ደረሰኝ',
    navEmergency: 'ሀዘን / አስቸኳይ ማሳወቂያ',
    navRequests: 'ጥያቄዎችና ንብረት',
    navFamily: 'የቤተሰብ ዝርዝር',
    navRecords: 'የዕድሩ መዛግብት',
    navStanding: 'የዕድሩ ጠቅላላ አቋም',
    navMessages: 'መልዕክቶችና ስብሰባ',
    navIdQr: 'ዲጂታል መታወቂያ እና QR',
    navMembersAccess: 'የአባላት መዝገብ',
    navSystemAdmin: 'የሲስተም እና የፈቃድ አስተዳደር',
    navCashierDesk: 'የገንዘብ ያዥና ባንክ ማስታረቂያ',
    navAssets: 'የዕድሩ ንብረት (ወጪ/ገቢ)',
    navMeetings: 'ስብሰባ እና QR ቁጥጥር',
    navAudit: 'የኦዲት ቁጥጥርና ታሪክ',
    navReports: 'የተሟላ ሪፖርት ማመንጫ',
    changePassword: 'የይለፍ ቃል ቀይር',
    // Statuses
    active: 'ንቁ',
    pending: 'በመጠባበቅ ላይ',
    suspended: 'የታገደ',
    overdue: 'ያለፈበት / ቅጣት',
    approved: 'የጸደቀ',
    verified: 'የተረጋገጠ',
    rejected: 'ውድቅ የተደረገ',
    paid: 'የተከፈለ',
    exempt: 'ከስብሰባ ነፃ (ከአለታ ወንዶ ውጪ)',
    aletaWondo: 'አለታ ወንዶ',
    outsideAletaWondo: 'ከአለታ ወንዶ ውጪ',
    // Common actions
    save: 'አስቀምጥ',
    cancel: 'ሰርዝ',
    submit: 'ላክ',
    approve: 'አጽድቅ',
    reject: 'ውድቅ አድርግ',
    forwardToChairman: 'ለዋና ሰብሳቢ አስተላልፍ',
    authorizeForCashier: 'ለገንዘብ ያዥ ፍቀድ',
    markPaid: 'ክፍያ ፈጽም',
    printPdf: 'አትም / PDF አውርድ',
    exportCsv: 'CSV አውርድ',
    copyMessage: 'መልዕክቱን ቅዳ',
    copied: 'ተቀድቷል!',
    searchPlaceholder: 'በስም፣ በመለያ ቁጥር ወይም በከተማ ይፈልጉ...',
    noRecords: 'ምንም መረጃ አልተገኘም።',
  },
  en: {
    appTagline: 'Digital governance and mutual aid system for members in Aleta Wondo and worldwide',
    loginTitle: 'Sign in to Aleta Wondo Edir',
    loginSubtitle: 'Sign in with your Member ID, phone, email & password, or Google account',
    emailOrPhone: 'Email, Phone, or Member ID',
    password: 'Password',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    quickRoleSwitch: 'Quick Role Login Switcher (Executive & Member)',
    languageToggle: 'አማርኛ',
    etb: 'ETB',
    // Navigation (Consolidated Modules)
    navOverview: 'Executive Overview',
    navFinanceModule: 'Finance & Contributions',
    navMembersModule: 'Members & Access Control',
    navOperationsModule: 'Meetings & Property',
    navInfoReportsModule: 'Records, Comms & Reports',
    navMemberPortal: 'Member Self-Service',
    navExecutive: 'Executive Overview',
    navPayments: 'Payments & Receipts',
    navEmergency: 'Bereavement / Emergency',
    navRequests: 'Requests & Approvals',
    navFamily: 'Family Registry',
    navRecords: 'Records & Bylaws',
    navStanding: 'Edir Standing Report',
    navMessages: 'Messages & Meetings',
    navIdQr: 'Digital ID & QR',
    navMembersAccess: 'Member Registry',
    navSystemAdmin: 'System Admin & IT',
    navCashierDesk: 'Cashier & Bank Recon',
    navAssets: 'Property & Assets',
    navMeetings: 'Meetings & Attendance',
    navAudit: 'Audit Trail',
    navReports: 'Report Generator',
    changePassword: 'Change Password',
    // Statuses
    active: 'Active',
    pending: 'Pending',
    suspended: 'Suspended',
    overdue: 'Overdue / Penalty',
    approved: 'Approved',
    verified: 'Verified',
    rejected: 'Rejected',
    paid: 'Paid',
    exempt: 'Exempt (Outside Aleta Wondo)',
    aletaWondo: 'Aleta Wondo',
    outsideAletaWondo: 'Outside Aleta Wondo',
    // Common actions
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    approve: 'Approve',
    reject: 'Reject',
    forwardToChairman: 'Forward to Chairman',
    authorizeForCashier: 'Authorize for Cashier',
    markPaid: 'Execute Payout',
    printPdf: 'Print / Save PDF',
    exportCsv: 'Download CSV',
    copyMessage: 'Copy Message',
    copied: 'Copied!',
    searchPlaceholder: 'Search by name, member ID, or city...',
    noRecords: 'No records found.',
  },
} as const;

export function getText(lang: Language, am: string, en: string): string {
  return lang === 'am' ? am : en;
}

export function formatETB(amount: number, lang: Language): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return lang === 'am' ? `${formatted} ብር` : `${formatted} ETB`;
}

export function formatMonthLabel(ym: string, lang: Language): string {
  const [year, month] = ym.split('-');
  const monthMap: Record<string, { am: string; en: string }> = {
    '01': { am: 'ጥር / ጃንዋሪ', en: 'Jan' },
    '02': { am: 'የካቲት / ፌብሩዋሪ', en: 'Feb' },
    '03': { am: 'መጋቢት / ማርች', en: 'Mar' },
    '04': { am: 'ሚያዝያ / ኤፕሪል', en: 'Apr' },
    '05': { am: 'ግንቦት / ሜይ', en: 'May' },
    '06': { am: 'ሰኔ / ጁን', en: 'Jun' },
    '07': { am: 'ሐምሌ / ጁላይ', en: 'Jul' },
    '08': { am: 'ነሐሴ / ኦገስት', en: 'Aug' },
    '09': { am: 'መስከረም / ሴፕቴምበር', en: 'Sep' },
    '10': { am: 'ጥቅምት / ኦክቶበር', en: 'Oct' },
    '11': { am: 'ህዳር / ኖቬምበር', en: 'Nov' },
    '12': { am: 'ታህሳስ / ዲሴምበር', en: 'Dec' },
  };
  const label = monthMap[month]?.[lang] ?? month;
  return `${label} ${year}`;
}
