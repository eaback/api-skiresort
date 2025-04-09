"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = getConnection;
exports.executeQuery = executeQuery;
exports.executeInsert = executeInsert;
const promise_1 = __importDefault(require("mysql2/promise"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function getConnection() {
    try {
        console.log("Creating database connection...");
        const caPath = path_1.default.join(process.cwd(), 'certs', 'ca.pem');
        const ca = fs_1.default.readFileSync(caPath);
        const pool = promise_1.default.createPool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: {
                ca,
                rejectUnauthorized: true,
            },
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 60000,
        });
        // Test the connection
        const connection = await pool.getConnection();
        console.log("Database connection successful");
        connection.release();
        return pool;
    }
    catch (error) {
        console.error("Error creating database connection:", error);
        throw error;
    }
}
// Execute a query and return results
async function executeQuery(query, params = []) {
    const connection = await getConnection();
    try {
        console.log("Executing query:", query);
        console.log("With params:", params);
        const [results] = await connection.execute(query, params);
        return results;
    }
    catch (error) {
        console.error("Database query error:", error);
        throw error;
    }
}
// Execute an insert query and return the result
async function executeInsert(query, params = []) {
    const connection = await getConnection();
    try {
        console.log("Executing insert query:", query);
        console.log("With params:", params);
        const [result] = await connection.execute(query, params);
        return result;
    }
    catch (error) {
        console.error("Database insert error:", error);
        throw error;
    }
}
