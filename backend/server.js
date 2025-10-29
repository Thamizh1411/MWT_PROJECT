require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const connectDB = require('./db');
const authRoutes = require('./routes/auth');
const bookingsRoutes = require('./routes/bookings');
const notificationsRoutes = require('./routes/notifications');
const leaveRequestsRoutes = require('./routes/leaveRequests');
const workersRoutes = require('./routes/workers');

const app = express();

// Connect to DB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Session middleware for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport config
require('./config/passport')(passport);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', require('./routes/admin'));
app.use('/api/bookings', bookingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/leave-requests', leaveRequestsRoutes);
app.use('/api/workers', workersRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('WorkerBook Backend API');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
