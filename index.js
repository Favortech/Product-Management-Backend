require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const connectDB    = require('./config/db');
const authRoutes     = require('./routes/auth');
const productRoutes  = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const path         = require('path');
const app = express();
const PORT = process.env.PORT || 3000;


// Connect to MongoDB
connectDB();

// CORS — allow requests from the origin defined in .env (or all origins in dev)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 1. Point to the Angular build folder
app.use(express.static(path.join(__dirname, 'dist/CodvedaAngular')));

// 2. Handle SPA routing: redirect all requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/CodvedaAngular/index.html'));
});

// 3. Use dynamic port for Render
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Running on ${PORT}`));

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(cookieParser());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Products REST API is running.' });
});

// Routes
app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});