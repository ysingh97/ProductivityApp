const express = require('express');
const cors = require('cors');
const { requireAuth } = require('./middleware/auth');

// Import route files
const goalRoutes = require('./routes/goalRoutes');
const listRoutes = require('./routes/listRoutes');
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const googleCalendarRoutes = require('./routes/googleCalendarRoutes');

const createApp = () => {
  // Initialize Express
  const app = express();

  const defaultAllowedOrigins = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:3000'];

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const corsOptions = {
    origin(origin, callback) {
      const effectiveAllowedOrigins = allowedOrigins.length > 0
        ? allowedOrigins
        : defaultAllowedOrigins;

      // Requests without an Origin header are typically server-to-server, health checks, or curl.
      if (!origin || effectiveAllowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    }
  };

  // Middleware
  app.use(cors(corsOptions));
  app.use(express.json());

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/goals', requireAuth, goalRoutes); // Routes for goals
  app.use('/api/lists', requireAuth, listRoutes); // Routes for lists
  app.use('/api/tasks', requireAuth, taskRoutes); // Routes for tasks
  app.use('/api/categories', requireAuth, categoryRoutes); // Routes for categories
  app.use('/api/integrations/google-calendar', googleCalendarRoutes);

  return app;
};

module.exports = createApp;
