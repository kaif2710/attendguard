const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const app = express();
app.use(cors());
app.use(express.json());

// Persistent SQLite database
const dbPath = path.join(__dirname, 'attendance.db');
const db = new DatabaseSync(dbPath);

// Normalized 3NF Tables with Global 1-Device-Per-Student Enforcement
db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS sessions (
    session_id       TEXT PRIMARY KEY,
    subject          TEXT NOT NULL,
    faculty_name     TEXT NOT NULL,
    secret           TEXT NOT NULL,
    lat              REAL,
    lng              REAL,
    enforce_geofence INTEGER DEFAULT 0,
    active           INTEGER DEFAULT 1,
    created_at       TEXT NOT NULL
  );

  -- Global 1-to-1 permanent binding between a physical device and a student Roll Number
  CREATE TABLE IF NOT EXISTS device_bindings (
    device_id        TEXT PRIMARY KEY,
    roll_no          TEXT UNIQUE NOT NULL,
    student_name     TEXT NOT NULL,
    bound_at         TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attendance_logs (
    log_id           INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id       TEXT NOT NULL,
    roll_no          TEXT NOT NULL,
    student_name     TEXT NOT NULL,
    device_id        TEXT NOT NULL,
    distance_meters  INTEGER,
    timestamp        TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    UNIQUE (session_id, roll_no),
    UNIQUE (session_id, device_id)
  );
`);

const insertSessionStmt = db.prepare(`
  INSERT INTO sessions (session_id, subject, faculty_name, secret, lat, lng, enforce_geofence, active, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
`);

const getSessionStmt = db.prepare(`SELECT * FROM sessions WHERE session_id = ?`);
const getBindingByDeviceStmt = db.prepare(`SELECT * FROM device_bindings WHERE device_id = ?`);
const getBindingByRollStmt = db.prepare(`SELECT * FROM device_bindings WHERE roll_no = ?`);
const insertBindingStmt = db.prepare(`
  INSERT INTO device_bindings (device_id, roll_no, student_name, bound_at) VALUES (?, ?, ?, ?)
`);

const getDuplicateRollStmt = db.prepare(`
  SELECT 1 FROM attendance_logs WHERE session_id = ? AND roll_no = ?
`);

const insertAttendanceStmt = db.prepare(`
  INSERT INTO attendance_logs (session_id, roll_no, student_name, device_id, distance_meters, timestamp)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getSessionLogsStmt = db.prepare(`
  SELECT roll_no AS rollNo, student_name AS studentName, timestamp, distance_meters AS distanceMeters
  FROM attendance_logs
  WHERE session_id = ?
  ORDER BY log_id ASC
`);

const WINDOW_MS = 3000; // 3-second rotating QR
const MAX_RADIUS_METERS = 50;

function generateToken(secret, timeSlice) {
  return crypto
    .createHmac('sha256', secret)
    .update(String(timeSlice))
    .digest('hex')
    .slice(0, 16);
}

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Health check for Render
app.get('/', (_req, res) => {
  res.json({ status: 'AttendGuard API Live', windowMs: WINDOW_MS });
});

// Check if this physical device is already bound to a student
app.get('/api/devices/:deviceId', (req, res) => {
  const binding = getBindingByDeviceStmt.get(req.params.deviceId);
  if (!binding) return res.json({ bound: false });
  res.json({
    bound: true,
    rollNo: binding.roll_no,
    studentName: binding.student_name,
  });
});

// 1. Start Lecture Session
app.post('/api/sessions/start', (req, res) => {
  const { subject, facultyName, lat, lng, enforceGeofence } = req.body;
  const sessionId = 'SES-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const secret = crypto.randomBytes(16).toString('hex');
  const cleanSubject = subject || 'DBMS (KCS-501)';
  const cleanFaculty = facultyName || 'Faculty';
  const geoFlag = Boolean(enforceGeofence && lat && lng) ? 1 : 0;

  insertSessionStmt.run(
    sessionId,
    cleanSubject,
    cleanFaculty,
    secret,
    lat ?? null,
    lng ?? null,
    geoFlag,
    new Date().toISOString()
  );

  res.json({ sessionId, subject: cleanSubject, enforceGeofence: Boolean(geoFlag) });
});

// 2. Get Rotating 3-Second QR Token
app.get('/api/sessions/:sessionId/qr', (req, res) => {
  const session = getSessionStmt.get(req.params.sessionId);
  if (!session || !session.active) {
    return res.status(404).json({ error: 'Session not found or ended' });
  }

  const now = Date.now();
  const timeSlice = Math.floor(now / WINDOW_MS);
  const token = generateToken(session.secret, timeSlice);
  const expiresInMs = WINDOW_MS - (now % WINDOW_MS);

  res.json({
    payload: JSON.stringify({ s: session.session_id, t: token }),
    expiresInMs,
  });
});

// 3. Mark Attendance with Strict 1-User-Per-Device Lock
app.post('/api/attendance/mark', (req, res) => {
  const { qrPayload, rollNo, studentName, deviceId, lat, lng } = req.body;

  if (!qrPayload || !rollNo || !deviceId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let parsed;
  try {
    parsed = JSON.parse(qrPayload);
  } catch {
    return res.status(400).json({ error: 'Invalid QR format' });
  }

  const { s: sessionId, t: token } = parsed;
  const session = getSessionStmt.get(sessionId);

  if (!session || !session.active) {
    return res.status(404).json({ error: 'Lecture session is inactive or invalid' });
  }

  // Layer 1: 3-Second TOTP Expiry Check (current + 1 grace window for network delay)
  const currentSlice = Math.floor(Date.now() / WINDOW_MS);
  const validCurrent = generateToken(session.secret, currentSlice);
  const validPrev = generateToken(session.secret, currentSlice - 1);

  if (token !== validCurrent && token !== validPrev) {
    return res.status(401).json({ error: 'QR Code Expired! Scan the live projector screen.' });
  }

  const cleanRoll = rollNo.trim().toUpperCase();
  const cleanName = studentName?.trim() || 'Student';

  // Layer 2A: Strict Global Device Lock (1 physical device -> 1 student permanently)
  const boundDevice = getBindingByDeviceStmt.get(deviceId);
  if (boundDevice && boundDevice.roll_no !== cleanRoll) {
    return res.status(403).json({
      error: `Proxy Blocked: This phone is permanently registered to ${boundDevice.roll_no} (${boundDevice.student_name}).`,
    });
  }

  // Layer 2B: Prevent a student from registering multiple phones
  const boundRoll = getBindingByRollStmt.get(cleanRoll);
  if (boundRoll && boundRoll.device_id !== deviceId) {
    return res.status(403).json({
      error: `Proxy Blocked: Roll No ${cleanRoll} is already linked to another student's device.`,
    });
  }

  // Layer 3: Geofence Check
  let distance = null;
  if (session.enforce_geofence) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'Location permission is required for this class.' });
    }
    distance = Math.round(getDistanceMeters(session.lat, session.lng, lat, lng));
    if (distance > MAX_RADIUS_METERS) {
      return res.status(403).json({
        error: `Out of Classroom Range (${distance}m away). Must be within ${MAX_RADIUS_METERS}m.`,
      });
    }
  }

  // Layer 4: Duplicate Attendance Check for Current Session
  const alreadyMarked = getDuplicateRollStmt.get(sessionId, cleanRoll);
  if (alreadyMarked) {
    return res.status(409).json({ error: `Attendance already marked for ${cleanRoll}.` });
  }

  // Bind device permanently if this is the student's first ever scan
  if (!boundDevice) {
    insertBindingStmt.run(deviceId, cleanRoll, cleanName, new Date().toISOString());
  }

  // Record Attendance
  const timestamp = new Date().toLocaleTimeString('en-IN');
  insertAttendanceStmt.run(sessionId, cleanRoll, cleanName, deviceId, distance, timestamp);

  res.json({
    success: true,
    message: `Marked Present: ${cleanRoll}`,
    boundProfile: { rollNo: cleanRoll, studentName: cleanName },
    entry: { rollNo: cleanRoll, studentName: cleanName, timestamp, distanceMeters: distance },
  });
});

// 4. Live Session Logs
app.get('/api/sessions/:sessionId/logs', (req, res) => {
  const session = getSessionStmt.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const records = getSessionLogsStmt.all(req.params.sessionId);
  res.json({ count: records.length, records });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Attendance API running on port ${PORT}`);
});