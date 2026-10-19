const mongoose = require('mongoose');

const STATUSES = ['WAITING', 'CALLED', 'COMPLETED', 'SKIPPED'];

const patientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  tokenNumber: {
    type: String,
    required: true,
  },
  // Numeric part of the token, used for ordering (string sort breaks after A-99).
  tokenSequence: {
    type: Number,
    required: true,
  },
  // Local calendar day ("YYYY-MM-DD") the token belongs to; numbering restarts daily.
  queueDate: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: STATUSES,
    default: 'WAITING',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Safety net: no two patients may share a token on the same day.
patientSchema.index({ queueDate: 1, tokenSequence: 1 }, { unique: true });

module.exports = mongoose.model('Patient', patientSchema);
module.exports.STATUSES = STATUSES;
