/*
  Rhythm Surge - Clever Cloud MySQL & Render Backend
  Configured to match your exact environment variables:
  - MYSQL_ADDON_HOST
  - MYSQL_ADDON_USER
  - MYSQL_ADDON_PASSWORD
  - MYSQL_ADDON_DB
  - MYSQL_ADDON_PORT
*/

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(cors());

// MySQL Connection Pool using your exact environment variables
const pool = mysql.createPool({
  host: process.env.MYSQL_ADDON_HOST,
  user: process.env.MYSQL_ADDON_USER,
  password: process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.MYSQL_ADDON_DB,
  port: process.env.MYSQL_ADDON_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize Database Tables
async function initDB() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        video_id VARCHAR(50) NOT NULL,
        score INT NOT NULL,
        max_combo INT NOT NULL,
        accuracy INT NOT NULL,
        song_rank VARCHAR(10) NOT NULL,
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    connection.release();
    console.log("Clever Cloud MySQL database connected and tables initialized successfully.");
  } catch (err) {
    console.error("Database initialization error:", err.message);
  }
}
initDB();

// User Sign-Up Endpoint
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Username, email, and password are required for sign-up." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    res.json({ success: true, message: "Pilot account registered successfully!", userId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: "Username or email already exists." });
  }
});

// User Login Endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ? OR email = ?', [username, username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
    res.json({ success: true, username: user.username, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post Score Endpoint (Mandatory Authentication)
app.post('/api/scores', async (req, res) => {
  try {
    const { username, videoId, score, maxCombo, accuracy, rank } = req.body;
    if (!username) {
      return res.status(403).json({ error: "Authentication required to post scores. Please log in or sign up." });
    }
    await pool.query(
      'INSERT INTO scores (username, video_id, score, max_combo, accuracy, song_rank) VALUES (?, ?, ?, ?, ?, ?)',
      [username, videoId, score, maxCombo, accuracy, rank]
    );
    res.json({ success: true, message: "Score recorded to database!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Video Leaderboard & High Scores
app.get('/api/scores/:videoId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM scores WHERE video_id = ? ORDER BY score DESC LIMIT 20',
      [req.params.videoId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));