import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Connection pool for Aiven MySQL
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "eshop-db-eshop-db.c.aivencloud.com",
    port: parseInt(process.env.MYSQL_PORT || "18792"),
    user: process.env.MYSQL_USER || "avnadmin",
    password: process.env.MYSQL_PASSWORD || "AVNS_holz1R6B_Q0oZGFqufl",
    database: process.env.MYSQL_DATABASE || "defaultdb",
    ssl: {
        rejectUnauthorized: true,
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export const db = {
    query: async <T = any>(sql: string, params?: any[]): Promise<[T[], any]> => {
        try {
        const [rows] = await pool.execute(sql, params);
        return [rows as T[], null];
        } catch (error) {
        console.error("Database error:", error);
        return [[] as T[], error];
        }
    },
    
    transaction: async <T = any>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<[T | null, any]> => {
        const connection = await pool.getConnection();
        try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return [result, null];
        } catch (error) {
        await connection.rollback();
        console.error("Transaction error:", error);
        return [null, error];
        } finally {
        connection.release();
        }
    }
};