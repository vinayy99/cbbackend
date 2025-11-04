import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const shouldUseSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'collabmate',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Aiven requires SSL. Enable via env DB_SSL=true. Optionally pass CA via DB_CA.
  ssl: shouldUseSsl
    ? (
        process.env.DB_CA
          ? { rejectUnauthorized: true, ca: process.env.DB_CA }
          : { rejectUnauthorized: true }
      )
    : undefined,
};

export const pool = mysql.createPool(dbConfig);

export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

