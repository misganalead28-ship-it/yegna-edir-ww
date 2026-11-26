import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  MapPin,
  Printer,
  QrCode,
  Upload,
  XCircle,
} from 'lucide-react';
import { EdirState, Language, MemberRecord } from '../types';
import { COPY, ORG_NAME, ROLE_LABELS, getText } from '../i18n';
import { uploadFileToStorage } from '../services/edirStore';

interface DigitalIdCardProps {
  lang: Language;
  member: MemberRecord;
  allowPhotoUpload?: boolean;
  onUpdatePhoto?: (memberId: string, photoUrl: string) => void;
  titleAm?: string;
  titleEn?: string;
}

export const DigitalIdCard: React.FC<DigitalIdCardProps> = ({
  lang,
  member,
  allowPhotoUpload = true,
  onUpdatePhoto,
  titleAm,
  titleEn,
}) => {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdatePhoto) return;
    setUploadingPhoto(true);
    try {
      const { url } = await uploadFileToStorage('avatars', file);
      if (url) {
        onUpdatePhoto(member.id, url);
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 print-card">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-100 no-print">
        <div>
          <h2 className="text-base font-bold text-[#064E3B]">
            {getText(
              lang,
              titleAm || 'ዲጂታል የአባልነት መታወቂያ ካርድ',
              titleEn || 'Digital Member ID Card'
            )}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {getText(
              lang,
              'ለስብሰባ ቆጠራ እና ለዕድር አገልግሎቶች የሚያገለግል ኦፊሴላዊ መታወቂያ',
              'Official scannable ID for general assemblies and Edir services'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {allowPhotoUpload && onUpdatePhoto && (
            <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#064E3B] bg-[#064E3B]/10 hover:bg-[#064E3B]/15 rounded-lg cursor-pointer whitespace-nowrap">
              <Upload className="w-3.5 h-3.5" />
              <span>
                {uploadingPhoto
                  ? getText(lang, 'በመጫን ላይ...', 'Uploading...')
                  : getText(lang, 'ፎቶ ቀይር', 'Photo')}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#064E3B] hover:bg-[#047857] rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{getText(lang, 'መታወቂያ አትም / አውርድ', 'Print / Download ID')}</span>
          </button>
        </div>
      </div>

      {/* Physical Card Frame */}
      <div className="max-w-lg mx-auto border border-[#064E3B]/25 rounded-xl overflow-hidden bg-white">
        <div className="bg-[#064E3B] text-white px-5 py-4 flex items-center gap-3.5">
          <img
            src="/assets/aistudio/logo_27d4fad1.png"
            alt="Edir Logo"
            className="w-12 h-12 rounded-full object-cover border-2 border-[#F59E0B] shrink-0 bg-white"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <p className="text-xs text-[#F59E0B] font-semibold">
              {getText(lang, ORG_NAME.addressAm, ORG_NAME.addressEn)}
            </p>
            <h3 className="text-sm font-bold leading-snug">
              {getText(lang, ORG_NAME.am, ORG_NAME.en)}
            </h3>
          </div>
        </div>

        <div className="p-5 flex flex-col sm:flex-row gap-5 items-center sm:items-stretch justify-between">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.fullNameEn}
                className="w-20 h-24 rounded-lg object-cover border border-slate-200 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-24 rounded-lg bg-[#064E3B]/10 border border-[#064E3B]/20 flex flex-col items-center justify-center text-[#064E3B] font-bold text-xl shrink-0">
                {member.fullNameEn
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)}
              </div>
            )}

            <div className="min-w-0 space-y-1.5">
              <div>
                <p className="text-[11px] text-slate-500">
                  {getText(lang, 'የአባል መለያ', 'Member ID')}
                </p>
                <p className="text-sm font-mono font-bold text-[#064E3B] tabular-nums">
                  {member.memberCode}
                </p>
              </div>
              <div>
                <p className="text-base font-bold text-slate-900 leading-tight">
                  {getText(lang, member.fullNameAm, member.fullNameEn)}
                </p>
                <p className="text-xs text-slate-600">
                  {ROLE_LABELS[member.role][lang]}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                <MapPin className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
                <span className="truncate">
                  {getText(lang, member.residenceCityAm, member.residenceCityEn)}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#047857]">
                {getText(lang, 'ሁኔታ፡ ', 'Status: ')}
                {member.accessStatus === 'active'
                  ? COPY[lang].active
                  : member.accessStatus === 'suspended'
                  ? COPY[lang].suspended
                  : COPY[lang].pending}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg shrink-0">
            <QRCodeSVG
              value={member.qrToken}
              size={104}
              level="M"
              fgColor="#064E3B"
            />
            <span className="text-[10px] font-mono text-slate-600 mt-1.5">
              {member.memberCode}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 px-5 py-2.5 flex items-center justify-between text-[11px] text-slate-600">
          <span>
            {getText(lang, 'የተመዘገበበት ቀን፡ ', 'Joined: ')}
            <span className="font-mono tabular-nums">{member.joinedDate}</span>
          </span>
          <span>
            {member.residenceZone === 'outside'
              ? getText(lang, 'ከአካል ስብሰባ ነፃ', 'Physical Mtg Exempt')
              : getText(lang, 'አለታ ወንዶ ነዋሪ', 'Aleta Wondo Resident')}
          </span>
        </div>
      </div>
    </section>
  );
};

interface QrAttendanceScannerProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  onScanAttendance: (
    scannedValue: string
  ) => { ok: boolean; messageAm: string; messageEn: string };
}

export const QrAttendanceScanner: React.FC<QrAttendanceScannerProps> = ({
  lang,
  currentUser,
  state,
  onScanAttendance,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanResult, setScanResult] = useState<{
    ok: boolean;
    messageAm: string;
    messageEn: string;
  } | null>(null);
  const [manualCode, setManualCode] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const activeMeeting = state.meetings.find((m) => m.status === 'active');

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError('');
    setScanResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        getText(
          lang,
          'ካሜራ በዚህ አሳሽ ውስጥ አይገኝም። እባክዎ የQR ምስል ይጫኑ ወይም ኮዱን በእጅ ያስገቡ።',
          'Camera is unavailable in this browser. Please upload a QR image or enter the QR code manually.'
        )
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          scanFrame();
        }
      });
    } catch {
      setCameraError(
        getText(
          lang,
          'የካሜራ ፈቃድ አልተሰጠም። የQR ምስል በመጫን ወይም ኮድ በማስገባት መፈተሽ ይችላሉ።',
          'Camera permission denied. You can upload a QR image or enter a QR code manually below.'
        )
      );
    }
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(imageData.data, imageData.width, imageData.height);
        if (decoded?.data) {
          const res = onScanAttendance(decoded.data);
          setScanResult(res);
          stopCamera();
          return;
        }
      }
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  };

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = jsQR(data.data, data.width, data.height);
        if (decoded?.data) {
          setScanResult(onScanAttendance(decoded.data));
        } else {
          setScanResult({
            ok: false,
            messageAm: 'በምስሉ ውስጥ ትክክለኛ የQR ኮድ አልተገኘም።',
            messageEn: 'No valid QR code detected in the uploaded image.',
          });
        }
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6 no-print">
      <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
        <QrCode className="w-5 h-5 text-[#064E3B]" />
        <div>
          <h2 className="text-base font-bold text-[#064E3B]">
            {getText(lang, 'የQR ስብሰባ መመዝገቢያ ስካነር', 'QR Attendance Scanner')}
          </h2>
          <p className="text-xs text-slate-600">
            {getText(
              lang,
              'የስብሰባውን QR ወይም የአባል መታወቂያ QR ስካን ያድርጉ',
              'Scan active meeting QR or a member Digital ID QR'
            )}
          </p>
        </div>
      </div>

      {activeMeeting ? (
        <div className="p-3.5 rounded-lg bg-[#047857]/10 border border-[#047857]/30 mb-4">
          <p className="text-xs font-bold text-[#064E3B]">
            {getText(lang, 'ንቁ ስብሰባ፡ ', 'Active Meeting: ')}
            {getText(lang, activeMeeting.titleAm, activeMeeting.titleEn)}
          </p>
          <p className="text-xs text-[#047857] mt-1 font-mono tabular-nums">
            {activeMeeting.date} · {activeMeeting.time}
          </p>
        </div>
      ) : (
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 mb-4 text-xs text-slate-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0" />
          <span>
            {getText(
              lang,
              'በአሁኑ ጊዜ የተከፈተ ስብሰባ የለም። አመራሩ ስብሰባ ሲጀምር ስካን ማድረግ ይቻላል።',
              'No active meeting session right now. Scanning unlocks once management initiates a meeting.'
            )}
          </span>
        </div>
      )}

      {cameraActive ? (
        <div className="space-y-3 mb-4">
          <div className="relative rounded-lg overflow-hidden border border-slate-300 bg-black aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <button
            type="button"
            onClick={stopCamera}
            className="w-full py-2 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            {getText(lang, 'ካሜራ አቁም', 'Stop Camera')}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5 mb-4">
          <button
            type="button"
            onClick={startCamera}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Camera className="w-4 h-4" />
            <span>{getText(lang, 'ካሜራ ክፈት እና ስካን አድርግ', 'Open Camera & Scan')}</span>
          </button>
          <label className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap">
            <Upload className="w-4 h-4" />
            <span>{getText(lang, 'የQR ምስል ጫን', 'Scan QR Image')}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleQrImageUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {cameraError && (
        <div className="p-3 mb-4 text-xs text-amber-900 bg-[#F59E0B]/15 border border-[#D97706]/30 rounded-lg">
          {cameraError}
        </div>
      )}

      <div className="pt-4 border-t border-slate-100 space-y-3">
        <label className="block text-xs font-semibold text-slate-700">
          {getText(
            lang,
            'ወይም የQR ኮድ / የአባል መለያ በእጅ ያስገቡ',
            'Or enter QR token / Member ID manually'
          )}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={
              activeMeeting ? activeMeeting.qrCodeValue : currentUser.qrToken
            }
            className="flex-1 px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-[#064E3B]"
          />
          <button
            type="button"
            onClick={() => {
              const val =
                manualCode.trim() ||
                (activeMeeting ? activeMeeting.qrCodeValue : currentUser.qrToken);
              setScanResult(onScanAttendance(val));
            }}
            className="px-3.5 py-2 text-xs font-semibold bg-[#D97706] hover:bg-[#F59E0B] text-white rounded-lg cursor-pointer whitespace-nowrap"
          >
            {getText(lang, 'አረጋግጥ', 'Verify')}
          </button>
        </div>
        {activeMeeting && (
          <button
            type="button"
            onClick={() => setScanResult(onScanAttendance(activeMeeting.qrCodeValue))}
            className="w-full py-2 px-3 text-xs font-semibold text-[#064E3B] bg-[#064E3B]/10 hover:bg-[#064E3B]/15 border border-[#064E3B]/20 rounded-lg cursor-pointer"
          >
            {getText(
              lang,
              `በቀጥታ "${activeMeeting.titleAm}" ላይ ተመዝገብ`,
              `Quick Check-In for "${activeMeeting.titleEn}"`
            )}
          </button>
        )}
      </div>

      {scanResult && (
        <div
          className={`mt-4 p-3 rounded-lg border text-xs flex items-start gap-2 ${
            scanResult.ok
              ? 'bg-[#047857]/10 border-[#047857]/30 text-[#064E3B]'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {scanResult.ok ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#047857]" />
          ) : (
            <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          )}
          <span>
            {getText(lang, scanResult.messageAm, scanResult.messageEn)}
          </span>
        </div>
      )}
    </section>
  );
};

interface DigitalIdAndScannerProps {
  lang: Language;
  currentUser: MemberRecord;
  state: EdirState;
  onUpdatePhoto: (memberId: string, photoUrl: string) => void;
  onScanAttendance: (
    scannedValue: string
  ) => { ok: boolean; messageAm: string; messageEn: string };
}

export const DigitalIdAndScanner: React.FC<DigitalIdAndScannerProps> = ({
  lang,
  currentUser,
  state,
  onUpdatePhoto,
  onScanAttendance,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7">
        <DigitalIdCard
          lang={lang}
          member={currentUser}
          allowPhotoUpload
          onUpdatePhoto={onUpdatePhoto}
        />
      </div>
      <div className="lg:col-span-5">
        <QrAttendanceScanner
          lang={lang}
          currentUser={currentUser}
          state={state}
          onScanAttendance={onScanAttendance}
        />
      </div>
    </div>
  );
};
