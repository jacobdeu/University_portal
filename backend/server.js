/**
 * ============================================================
 * Project: University of Juba Result Portal
 * Module: Student Registrar Ticket System
 * Author: Jacob Deu Bior
 * Role: Junior Full-Stack Developer (South Sudan)
 * Date: April 2026 (Updated May 2026)
 * Description: Secure SQL integration and frontend-backend 
 * synchronization for real-time student inquiries.
 * Architecture: Refactored to Modular MVC Structure
 * ============================================================
 *
 * 
 **/
import 'dotenv/config'; // Modern way to load .env immediately at the top
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import compression from 'compression'; // Gzip compression for faster asset delivery

// Import Your New Modular Routing Subsets
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// 1. Setup & Configuration (Required for ES Modules to find local paths)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuration matching your updated environment variables
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const networkIP = process.env.ip || '192.168.1.148';
const isProduction = process.env.NODE_ENV === 'production'; // Checks deployment state

// 2. Global Middleware Configuration
app.use(compression());                 // Compresses code packages over the network

// --- CORS CONFIGURATION (Fixes GitHub Pages -> Render CORS error) ---
const allowedOrigins = [
    'https://jacobdeu.github.io',       // Your GitHub Pages live frontend
    `http://localhost:${PORT}`,         // Local testing
    `http://127.0.0.1:${PORT}`,
    `http://${networkIP}:${PORT}`       // Local network/phone testing
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Curl, Postman) or matched domains
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error(`CORS Blocked: ${origin} is not allowed by CORS policy.`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 3. Static Assets (Serves your HTML/CSS/JS files locally without CDNs)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// 4. API Routes Mapping
app.use('/api/auth', authRoutes);       // Handles Login, Registration
app.use('/api/student', studentRoutes); // Handles Student results, GPA tracking, and Ticket submissions
app.use('/api/admin', adminRoutes);     // Handles high-privilege Registrar manipulations

// 5. Start Server
app.listen(PORT, HOST, () => {
    console.log(`\n============================================================`);
    console.log(`🇸🇸 University of Juba Result Portal Server is LIVE`);
    console.log(`============================================================`);
    console.log(`🏠 Local Machine:   http://localhost:${PORT}`);
    console.log(`🌐 Network/Phone:   http://${networkIP}:${PORT}`);
    console.log(`⚙️  Environment:     ${isProduction ? 'PRODUCTION 🚀' : 'DEVELOPMENT 🛠️'}`);
    console.log(`============================================================\n`);
});