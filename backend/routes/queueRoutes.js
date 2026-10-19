const express = require('express');
const {
  generateToken,
  getTodayQueue,
  getPatientStatus,
  callNextPatient,
  completePatient,
  skipPatient,
} = require('../controllers/queueController');
const { requireReceptionist } = require('../middleware/auth');

const router = express.Router();

// Patient (public)
router.post('/token', generateToken);
router.get('/:token', getPatientStatus);

// Receptionist (requires login)
router.get('/', requireReceptionist, getTodayQueue);
router.put('/next', requireReceptionist, callNextPatient);
router.put('/:id/complete', requireReceptionist, completePatient);
router.put('/:id/skip', requireReceptionist, skipPatient);

module.exports = router;
