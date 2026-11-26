import { Language } from '../types';

export function downloadCsvUtf8(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\r\n');

  // Prepend UTF-8 BOM so Amharic script opens cleanly in Microsoft Excel
  const blob = new Blob(['\uFEFF' + csvLines], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatWhatsAppSmsMessage(
  type: 'overdue' | 'meeting' | 'bereavement',
  lang: Language,
  params: {
    memberName?: string;
    amount?: number;
    overdueMonths?: number;
    meetingTitle?: string;
    meetingDate?: string;
    meetingTime?: string;
    venue?: string;
    bereavementDetail?: string;
  }
): string {
  if (type === 'overdue') {
    return lang === 'am'
      ? `ሰላም ${params.memberName || 'ውድ አባላችን'}፣ ከአለታ ወንዶ ወጣቶች መረዳጃ ዕድር ነው። የ${params.overdueMonths || 1} ወራት ውዝፍ እና የልዩ መዋጮ ክፍያ ጠቅላላ ${params.amount || 0} ብር ስላለብዎት እባክዎ በCBE (1000772333898) ወይም Coop (1062700129895) ከፍለው ደረሰኝዎን በሲስተሙ ላይ አታች ያድርጉ። እናመሰግናለን!`
      : `Dear ${params.memberName || 'Member'}, reminder from Aleta Wondo Youth Mutual Aid Edir: You have an outstanding balance of ${params.amount || 0} ETB (${params.overdueMonths || 1} overdue month(s)). Please settle via CBE (1000772333898) or Coop (1062700129895) and upload your receipt on the member portal. Thank you!`;
  }

  if (type === 'meeting') {
    return lang === 'am'
      ? `የስብሰባ ጥሪ — ከአለታ ወንዶ ወጣቶች መረዳጃ ዕድር!\nርዕስ፡ ${params.meetingTitle || 'መደበኛ ስብሰባ'}\nቀን፡ ${params.meetingDate || ''}\nሰዓት፡ ${params.meetingTime || ''}\nቦታ፡ ${params.venue || 'አለታ ወንዶ'}\nበአለታ ወንዶ የምትገኙ አባላት ዲጂታል መታወቂያ QR በመያዝ በሰዓቱ እንድትገኙ እናሳስባለን። (ከአለታ ወንዶ ውጪ ያሉ አባላት ከአካል ቆጠራ ነፃ ናቸው)`
      : `Meeting Call — Aleta Wondo Youth Mutual Aid Edir!\nTopic: ${params.meetingTitle || 'General Assembly'}\nDate: ${params.meetingDate || ''}\nTime: ${params.meetingTime || ''}\nVenue: ${params.venue || 'Aleta Wondo'}\nAleta Wondo residents: please bring your Digital ID QR for check-in. (Members outside Aleta Wondo are automatically exempt.)`;
  }

  return lang === 'am'
    ? `አስቸኳይ የሀዘን ማሳወቂያ — ከአለታ ወንዶ ወጣቶች መረዳጃ ዕድር\n${params.bereavementDetail || 'ለውድ አባላችን ቤተሰብ ሀዘን ስለገጠመ ሁላችንም በጋራ እንድንቆምና አስፈላጊውን ድጋፍ እንድናደርግ እናሳውቃለን።'}`
    : `Urgent Bereavement Notice — Aleta Wondo Youth Mutual Aid Edir\n${params.bereavementDetail || 'A member family has experienced a bereavement. Please join in offering condolences and mutual support.'}`;
}
