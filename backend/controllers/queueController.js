const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Counter = require('../models/Counter');
const { ApiError } = require('../middleware/errorHandler');

const MINUTES_PER_PATIENT = 5;
const TOKEN_PREFIX = 'A';
const TOKEN_PATTERN = /^A-\d{1,4}$/;

// "YYYY-MM-DD" in the server's local time zone; the queue resets each day.
function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatToken(sequence) {
  return `${TOKEN_PREFIX}-${String(sequence).padStart(2, '0')}`;
}

// Fields that are safe to show on the receptionist dashboard (phone is left out).
function toQueueItem(patient) {
  return {
    _id: patient._id,
    name: patient.name,
    tokenNumber: patient.tokenNumber,
    status: patient.status,
    createdAt: patient.createdAt,
  };
}

function validatePatientInput(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const rawPhone = typeof body?.phone === 'string' ? body.phone.trim() : '';

  if (!name) throw new ApiError(400, 'Name is required');
  if (name.length < 2 || name.length > 60) {
    throw new ApiError(400, 'Name must be between 2 and 60 characters');
  }
  if (!/^[\p{L} .'-]+$/u.test(name)) {
    throw new ApiError(400, 'Name can contain only letters, spaces, dots, apostrophes and hyphens');
  }

  if (!rawPhone) throw new ApiError(400, 'Phone number is required');
  // Allow common separators while typing, then store digits only (with an optional leading +).
  if (!/^\+?[\d\s-]+$/.test(rawPhone)) {
    throw new ApiError(400, 'Phone number can contain only digits, spaces, hyphens and a leading +');
  }
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    throw new ApiError(400, 'Phone number must have 10 to 15 digits');
  }
  const phone = rawPhone.startsWith('+') ? `+${digits}` : digits;

  return { name, phone };
}

// POST /api/queue/token
async function generateToken(req, res) {
  const { name, phone } = validatePatientInput(req.body);
  const queueDate = todayKey();

  const tokenSequence = await nextTokenSequence(queueDate);
  const patient = await Patient.create({
    name,
    phone,
    tokenSequence,
    tokenNumber: formatToken(tokenSequence),
    queueDate,
  });

  res.status(201).json({
    tokenNumber: patient.tokenNumber,
    status: patient.status,
  });
}

// Atomically takes the next token number for the day (1, 2, 3, ...).
async function nextTokenSequence(queueDate) {
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };
  try {
    const counter = await Counter.findOneAndUpdate({ _id: queueDate }, { $inc: { seq: 1 } }, options);
    return counter.seq;
  } catch (err) {
    // Two requests creating the day's first counter at the same moment: the loser retries once.
    if (err.code !== 11000) throw err;
    const counter = await Counter.findOneAndUpdate({ _id: queueDate }, { $inc: { seq: 1 } }, options);
    return counter.seq;
  }
}

// GET /api/queue  (receptionist)
async function getTodayQueue(req, res) {
  const patients = await Patient.find({ queueDate: todayKey() })
    .sort({ tokenSequence: 1 })
    .lean();

  const current = patients.find((p) => p.status === 'CALLED');

  res.json({
    currentToken: current ? current.tokenNumber : null,
    waitingCount: patients.filter((p) => p.status === 'WAITING').length,
    patients: patients.map(toQueueItem),
  });
}

// GET /api/queue/:token  (public — returns no personal details)
async function getPatientStatus(req, res) {
  const tokenNumber = String(req.params.token || '').trim().toUpperCase();
  if (!TOKEN_PATTERN.test(tokenNumber)) {
    throw new ApiError(400, 'Invalid token format. Example: A-01');
  }

  const queueDate = todayKey();
  const patient = await Patient.findOne({ queueDate, tokenNumber }).lean();
  if (!patient) {
    throw new ApiError(404, "Token not found in today's queue");
  }

  const current = await Patient.findOne({ queueDate, status: 'CALLED' })
    .select('tokenNumber')
    .lean();

  // Patients ahead = people still WAITING with an earlier token.
  // The patient currently being served (CALLED) is shown separately as "Currently serving".
  let patientsAhead = 0;
  if (patient.status === 'WAITING') {
    patientsAhead = await Patient.countDocuments({
      queueDate,
      status: 'WAITING',
      tokenSequence: { $lt: patient.tokenSequence },
    });
  }

  res.json({
    tokenNumber: patient.tokenNumber,
    status: patient.status,
    currentToken: current ? current.tokenNumber : null,
    patientsAhead,
    estimatedWait: patientsAhead * MINUTES_PER_PATIENT,
  });
}

// PUT /api/queue/next  (receptionist)
// Rule: only one patient is CALLED at a time. Calling the next patient automatically
// marks the currently called patient as COMPLETED, so the queue always moves forward.
async function callNextPatient(req, res) {
  const queueDate = todayKey();

  const hasWaiting = await Patient.exists({ queueDate, status: 'WAITING' });
  if (!hasWaiting) {
    return res.status(404).json({ message: 'No waiting patients' });
  }

  await Patient.updateMany({ queueDate, status: 'CALLED' }, { status: 'COMPLETED' });

  const next = await Patient.findOneAndUpdate(
    { queueDate, status: 'WAITING' },
    { status: 'CALLED' },
    { sort: { tokenSequence: 1 }, new: true }
  ).lean();

  if (!next) {
    return res.status(404).json({ message: 'No waiting patients' });
  }

  res.json({ message: `${next.tokenNumber} called`, patient: toQueueItem(next) });
}

// Moves a patient from one status to another, refusing invalid transitions.
async function changeStatus(id, fromStatus, toStatus) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid patient id');
  }

  const updated = await Patient.findOneAndUpdate(
    { _id: id, status: fromStatus },
    { status: toStatus },
    { new: true }
  ).lean();
  if (updated) return updated;

  const existing = await Patient.findById(id).select('status tokenNumber').lean();
  if (!existing) throw new ApiError(404, 'Patient not found');
  throw new ApiError(
    409,
    `${existing.tokenNumber} is ${existing.status}; only ${fromStatus} patients can be marked ${toStatus}`
  );
}

// PUT /api/queue/:id/complete  (receptionist)
async function completePatient(req, res) {
  const patient = await changeStatus(req.params.id, 'CALLED', 'COMPLETED');
  res.json({ message: `${patient.tokenNumber} completed`, patient: toQueueItem(patient) });
}

// PUT /api/queue/:id/skip  (receptionist)
async function skipPatient(req, res) {
  const patient = await changeStatus(req.params.id, 'WAITING', 'SKIPPED');
  res.json({ message: `${patient.tokenNumber} skipped`, patient: toQueueItem(patient) });
}

module.exports = {
  generateToken,
  getTodayQueue,
  getPatientStatus,
  callNextPatient,
  completePatient,
  skipPatient,
};
