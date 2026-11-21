import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  ShieldCheck,
  QrCode,
  ScanLine,
  Download,
  Users,
  MapPin,
  Lock,
  Code2,
  GraduationCap,
  Crown,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const TEAM_MEMBERS = [
  {
    name: 'Mohd Kaif Ansari',
    tag: 'Team Leader',
    isLeader: true,
    role: 'System Architecture, Cryptographic 3s TOTP Engine & SQLite Persistence',
    initials: 'MK',
  },
  {
    name: 'Adarsh Kumar',
    tag: 'Member',
    isLeader: false,
    role: 'Frontend Interface, Responsive Dashboard & State Management',
    initials: 'AK',
  },
  {
    name: 'Niwaan Pundir',
    tag: 'Member',
    isLeader: false,
    role: 'Hardware Device Fingerprinting & Anti-Proxy Security Logic',
    initials: 'NP',
  },
  {
    name: 'Fareed Shamim',
    tag: 'Member',
    isLeader: false,
    role: 'HTML5 Camera QR Scanner & Geolocation Geofencing Module',
    initials: 'FS',
  },
  {
    name: 'Shaurya Singh',
    tag: 'Member',
    isLeader: false,
    role: '3NF Database Schema Design, QA Testing & Viva Documentation',
    initials: 'SS',
  },
];

// Generates a deterministic SHA-256 hardware + canvas fingerprint
async function getHardwareDeviceId(): Promise<string> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let canvasSig = 'no-canvas';
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#10b981';
    ctx.fillText('AttendGuard-Device-Lock-v1', 2, 2);
    canvasSig = canvas.toDataURL();
  }

  const rawSignals = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    window.devicePixelRatio || 1,
    navigator.hardwareConcurrency || 0,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvasSig,
  ].join('||');

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawSignals));
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return 'HW-' + hashHex.slice(0, 20).toUpperCase();
}

interface AttendanceRecord {
  rollNo: string;
  studentName: string;
  timestamp: string;
  distanceMeters: number | null;
}

export default function App() {
  const [role, setRole] = useState<'faculty' | 'student' | 'about'>('faculty');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span className="font-semibold tracking-tight text-lg">
              Attend<span className="text-emerald-400">Guard</span>
            </span>
          </div>

          <div className="flex bg-slate-800 p-1 rounded-lg text-sm">
            <button
              onClick={() => setRole('faculty')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition ${
                role === 'faculty'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Faculty Projector
            </button>
            <button
              onClick={() => setRole('student')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition ${
                role === 'student'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Student Scanner
            </button>
            <button
              onClick={() => setRole('about')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition ${
                role === 'about'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              About Us
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-4 py-8 flex-1">
        {role === 'faculty' && <FacultyView />}
        {role === 'student' && <StudentView />}
        {role === 'about' && <AboutUsView />}
      </main>

      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        Built by{' '}
        <button
          onClick={() => setRole('about')}
          className="text-slate-300 hover:text-emerald-400 underline underline-offset-4 transition"
        >
          Mohd Kaif Ansari (Team Leader) &amp; Team
        </button>{' '}
        • B.Tech CSE, KCC Institute of Technology and Management
      </footer>
    </div>
  );
}

/* ==================== ABOUT US / PROJECT BUILDERS VIEW ==================== */
function AboutUsView() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400">
          <Code2 className="w-5 h-5" />
          <span className="text-xs font-mono uppercase tracking-widest">Project Builders (5 Members)</span>
        </div>
        <h2 className="text-2xl font-semibold text-white">
          About AttendGuard — Anti-Proxy Attendance System
        </h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          Developed as a B.Tech Computer Science &amp; Engineering mini-project at{' '}
          <span className="text-slate-200 font-medium">
            KCC Institute of Technology and Management, Greater Noida
          </span>
          . AttendGuard eliminates proxy attendance using 3-second HMAC-SHA256 rotating QR tokens,
          hardware-fingerprinted 1-device-per-student binding, HTML5 classroom geofencing, and a
          3NF-normalized SQLite relational database.
        </p>
      </div>

      {/* Team Leader Featured Card */}
      {TEAM_MEMBERS.filter((m) => m.isLeader).map((leader) => (
        <div
          key={leader.name}
          className="bg-gradient-to-r from-emerald-500/10 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-base shrink-0">
              {leader.initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-semibold text-white text-lg">{leader.name}</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" /> {leader.tag}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">{leader.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono shrink-0">
            <GraduationCap className="w-4 h-4" />
            <span>B.Tech CSE • KCCITM</span>
          </div>
        </div>
      ))}

      {/* Team Members 4-Card Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TEAM_MEMBERS.filter((m) => !m.isLeader).map((member) => (
          <div
            key={member.name}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center justify-center text-sm">
                {member.initials}
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">{member.name}</h3>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">{member.tag}</p>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{member.role}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-500">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              <span>B.Tech CSE • KCCITM</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== FACULTY VIEW ==================== */
function FacultyView() {
  const [subject, setSubject] = useState('DBMS — CSE');
  const [enforceGeo, setEnforceGeo] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [qrPayload, setQrPayload] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(3);
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);

  const startSession = async () => {
    let lat: number | null = null;
    let lng: number | null = null;

    if (enforceGeo && 'geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        alert('Could not fetch GPS. Starting without geofence.');
      }
    }

    const res = await fetch(`${API_BASE}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, lat, lng, enforceGeofence: enforceGeo }),
    });
    const data = await res.json();
    setSessionId(data.sessionId);
  };

  useEffect(() => {
    if (!sessionId) return;

    const fetchQrAndLogs = async () => {
      const [qrRes, logRes] = await Promise.all([
        fetch(`${API_BASE}/sessions/${sessionId}/qr`),
        fetch(`${API_BASE}/sessions/${sessionId}/logs`),
      ]);
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        setQrPayload(qrData.payload);
        setTimeLeft(Math.max(1, Math.ceil(qrData.expiresInMs / 1000)));
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        setLogs(logData.records);
      }
    };

    fetchQrAndLogs();
    const interval = setInterval(fetchQrAndLogs, 1000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const exportCsv = () => {
    const header = 'Roll Number,Student Name,Time Marked,Distance (m)\n';
    const rows = logs
      .map((r) => `${r.rollNo},"${r.studentName}",${r.timestamp},${r.distanceMeters ?? 'N/A'}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${subject.replace(/\s+/g, '_')}_Attendance.csv`;
    a.click();
  };

  if (!sessionId) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-emerald-400">
          <QrCode className="w-5 h-5" />
          <h2 className="font-semibold text-lg text-white">Start Attendance Session</h2>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5">
            Subject / Lecture Title
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={enforceGeo}
            onChange={(e) => setEnforceGeo(e.target.checked)}
            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Enforce 50m Classroom Geofence
          </span>
        </label>

        <button
          onClick={startSession}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-lg transition"
        >
          Generate Live Dynamic QR
        </button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center">
        <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full mb-2">
          Session ID: {sessionId}
        </span>
        <h2 className="text-xl font-semibold mb-6">{subject}</h2>

        <div className="bg-white p-5 rounded-2xl shadow-lg">
          {qrPayload && <QRCodeSVG value={qrPayload} size={240} level="M" />}
        </div>

        <div className="w-full max-w-[260px] mt-6">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>3s anti-proxy rotating token</span>
            <span className="font-mono text-emerald-400">{timeLeft}s</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${(timeLeft / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold">Live Attendance ({logs.length})</h3>
          </div>
          <button
            onClick={exportCsv}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 px-3 py-1.5 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        <div className="divide-y divide-slate-800 max-h-[380px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">
              Waiting for students to scan the QR code...
            </p>
          ) : (
            logs.map((item) => (
              <div key={item.rollNo} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-white">{item.rollNo}</p>
                  <p className="text-xs text-slate-400">{item.studentName}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-emerald-400">{item.timestamp}</span>
                  {item.distanceMeters !== null && (
                    <p className="text-[11px] text-slate-500">{item.distanceMeters}m away</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ==================== STUDENT VIEW ==================== */
function StudentView() {
  const [rollNo, setRollNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [isDeviceLocked, setIsDeviceLocked] = useState(false);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const latestFormRef = useRef({ rollNo: '', studentName: '', deviceId: '' });

  useEffect(() => {
    latestFormRef.current = { rollNo, studentName, deviceId };
  }, [rollNo, studentName, deviceId]);

  useEffect(() => {
    getHardwareDeviceId().then(async (hwId) => {
      setDeviceId(hwId);
      try {
        const res = await fetch(`${API_BASE}/devices/${hwId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.bound) {
            setRollNo(data.rollNo);
            setStudentName(data.studentName);
            setIsDeviceLocked(true);
          }
        }
      } catch {
        // Ignore offline error on initial load
      }
    });
  }, []);

  const submitAttendance = async (qrPayload: string) => {
    const { rollNo: currentRoll, studentName: currentName, deviceId: currentDevice } =
      latestFormRef.current;

    if (!currentRoll.trim()) {
      setStatus({ type: 'err', text: 'Enter your University Roll Number before scanning.' });
      return;
    }

    setStatus(null);
    let lat: number | undefined;
    let lng: number | undefined;

    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // Backend checks geofence requirement
      }
    }

    const res = await fetch(`${API_BASE}/attendance/mark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        qrPayload,
        rollNo: currentRoll,
        studentName: currentName,
        deviceId: currentDevice,
        lat,
        lng,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus({ type: 'ok', text: data.message });
      if (data.boundProfile) {
        setRollNo(data.boundProfile.rollNo);
        setStudentName(data.boundProfile.studentName);
        setIsDeviceLocked(true);
      }
    } else {
      setStatus({ type: 'err', text: data.error });
    }
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 15, qrbox: { width: 220, height: 220 } },
      false
    );
    scanner.render(
      (decodedText) => {
        submitAttendance(decodedText);
      },
      () => {}
    );
    scannerRef.current = scanner;
    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-emerald-400">
          <ScanLine className="w-5 h-5" />
          <h2 className="font-semibold text-lg text-white">Student Check-In</h2>
        </div>
        {isDeviceLocked && (
          <span className="flex items-center gap-1 text-[11px] font-medium bg-emerald-500/15 text-emerald-300 px-2.5 py-1 rounded-full">
            <Lock className="w-3 h-3" /> Device Bound
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">University Roll No</label>
          <input
            value={rollNo}
            disabled={isDeviceLocked}
            placeholder="e.g. 2404920100207"
            onChange={(e) => setRollNo(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 disabled:opacity-60 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Full Name</label>
          <input
            value={studentName}
            disabled={isDeviceLocked}
            placeholder="Your Name"
            onChange={(e) => setStudentName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 disabled:opacity-60 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {isDeviceLocked && (
        <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-lg p-2.5">
          This phone (<span className="font-mono text-slate-300">{deviceId.slice(0, 10)}...</span>) is
          permanently bound to <strong className="text-white">{rollNo}</strong>. Proxy check-ins for
          other roll numbers are disabled.
        </p>
      )}

      <div id="qr-reader" className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950" />

      {status && (
        <div
          className={`p-3.5 rounded-xl text-sm font-medium ${
            status.type === 'ok'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
          }`}
        >
          {status.text}
        </div>
      )}
    </div>
  );
}