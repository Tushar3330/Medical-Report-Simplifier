const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const logger = require('./src/utils/logger');
const errorHandler = require('./src/middleware/errorHandler');
const medicalReportRoutes = require('./src/routes/medicalReports');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] // Replace with your production domain
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));

// Request logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) }}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
app.use('/api/medical-reports', medicalReportRoutes);

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler - catch all unmatched routes
app.use((req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    logger.info(`🚀 Medical Report Simplifier API running on port ${PORT}`);
    logger.info(`📖 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;