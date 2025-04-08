import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || "eshop-db-eshop-db.c.aivencloud.com",
    port: parseInt(process.env.MYSQL_PORT || "18792"),
    user: process.env.MYSQL_USER || "avnadmin",
    password: process.env.MYSQL_PASSWORD || "AVNS_holz1R6B_Q0oZGFqufl",
    database: process.env.MYSQL_DATABASE || "defaultdb",
    ssl: {
        rejectUnauthorized: true, // Required for Aiven SSL connection
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

export async function query<T = any>(sql: string, params: any[] = []): Promise<T> {
    try {
        console.log("Executing query:", sql);
        console.log("With params:", params);

        const [results] = await pool.execute(sql, params);
        return results as T;
    } catch (error) {
        console.error("Database query error:", error);
        throw error;
    }
}

export async function executeInsert(sql: string, params: any[] = []): Promise<{ insertId: number }> {
    try {
        console.log("Executing insert query:", sql);
        console.log("With params:", params.map((p, i) => (i === 3 ? "[HASHED PASSWORD]" : p)));

        const [result] = await pool.execute(sql, params);
        return result as any;
    } catch (error) {
        console.error("Database insert error:", error);
        throw error;
    }
}

export const db = {
    query,
    executeInsert
};