import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Ensure environment variables are loaded before creating the pool
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test the connection immediately
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('⚡ Successfully connected to TiDB Cloud database!');
        connection.release(); // Always release the connection back to the pool
    } catch (error) {
        console.error('❌ Database connection testing failed:', error.message);
    }
})();

export default pool;
