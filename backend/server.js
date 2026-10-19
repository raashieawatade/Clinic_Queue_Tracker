require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const queueRoutes = require('./routes/queueRoutes');
const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// In production set CLIENT_URL to the deployed frontend so only it can call the API.
app.use(cors(process.env.CLIENT_URL ? { origin: process.env.CLIENT_URL.split(',') } : {}));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => {
  res.json({ message: 'Clinic Queue Tracker API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/queue', queueRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
