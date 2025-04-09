import mysql from "mysql2/promise"
import fs from 'fs'
import path from 'path'

interface InsertResult {
  insertId: number
  affectedRows: number
  [key: string]: unknown
}

// Create a connection pool
export async function getConnection() {
  try {
    console.log("Creating database connection...")

    const caPath = path.join(process.cwd(), 'certs', 'ca.pem')
    const ca = fs.readFileSync(caPath)

    const pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
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
    })

    // Test the connection
    const connection = await pool.getConnection()
    console.log("Database connection successful")
    connection.release()

    return pool
  } catch (error) {
    console.error("Error creating database connection:", error)
    throw error
  }
}

// Execute a query and return results
export async function executeQuery<T>(query: string, params: (string | number)[] = []): Promise<T> {
  const connection = await getConnection()
  try {
    console.log("Executing query:", query)
    console.log("With params:", params)

    const [results] = await connection.execute(query, params)
    return results as T
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

// Execute an insert query and return the result
export async function executeInsert(query: string, params: (string | number)[] = []): Promise<InsertResult> {
  const connection = await getConnection()
  try {
    console.log("Executing insert query:", query)
    console.log("With params:", params)

    const [result] = await connection.execute(query, params)
    return result as unknown as InsertResult
  } catch (error) {
    console.error("Database insert error:", error)
    throw error
  }
}
