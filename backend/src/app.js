require('dotenv').config();
const path = require('path');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');

const MediaHandler = require('./services/mediaHandler');
const stateManager = require('./services/stateManager');

// MongoDB Connection
const config = require('./config');
const mongoUri = process.env.MONGODB_URI || config.mongoUri;

console.log('🔌 Connecting to MongoDB:', mongoUri);
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ Connected to MongoDB successfully');
}).catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Initialize services
const mongoStore = MongoStore.create({
  mongoUrl: mongoUri,
  collectionName: 'sessions'
});

const mediaHandler = new MediaHandler(path.join(__dirname, '..', 'uploads'));
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:8080',
  credentials: true
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(session({
  store: mongoStore,
  secret: 'nst-experiment-secret',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: false,
    sameSite: 'lax'
  }
}));

app.use(morgan('dev'));
app.use(express.json());

const nstRoutes = require('./routes/NSTRoutes');
const participantRoutes = require('./routes/participantRoutes');

app.use('/api', nstRoutes);
app.use('/api/participants', participantRoutes);

app.use((err, req, res, next) => {
  console.error('Error details:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 5069;
app.listen(PORT, () => {
  console.log(`🚀 NST+ Backend server running on port ${PORT}`);
  console.log(`📊 Frontend expected at: http://localhost:8080`);
});

module.exports = app;
