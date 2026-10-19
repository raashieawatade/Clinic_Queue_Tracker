const mongoose = require('mongoose');

// One document per day ({ _id: "2026-10-19", seq: 27 }) holding the last token number issued.
// $inc on this document is atomic, so simultaneous requests always get different numbers.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
