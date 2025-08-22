const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db'); // Import the database connection function

// Load environment variables from .env
const envFile = process.env.NODE_ENV === "production"
  ? ".env.production"
  : ".env.development";

dotenv.config({
  path: path.resolve(__dirname, envFile)
});

// Initialize Express
const app = express();

// Import route files
const goalRoutes = require('./routes/goalRoutes');
const listRoutes = require('./routes/listRoutes');
const taskRoutes = require('./routes/taskRoutes');


// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/goals', goalRoutes); // Routes for goals
app.use('/api/lists', listRoutes); // Routes for lists
app.use('/api/tasks', taskRoutes); // Routes for tasks

// Function to start the server
const startServer = async () => {
    try {
      await connectDB();  // Connect to MongoDB
      const port = process.env.PORT || 5000;
      app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);  // Exit process if setup fails
    }
  };
  
  startServer();  // Start the server