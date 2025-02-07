const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());


// Generate a secure random secret if not already set
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');

// MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'appointment_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.error("❌ No token provided");
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("❌ Invalid token:", err.message);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};


app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// In login route, update token signing
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = users[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,  // Use the generated secret
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/slots', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const [slots] = await pool.execute(
      `SELECT * FROM time_slots 
       WHERE id NOT IN (
         SELECT time_slot_id 
         FROM appointments 
         WHERE date = ?
       )`,
      [date]
    );
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { date, timeSlot, notes } = req.body;
    const userId = req.user.id;

    // Check if slot is available
    const [existingAppointments] = await pool.execute(
      `SELECT * FROM appointments 
       WHERE date = ? AND time_slot_id = ?`,
      [date, timeSlot]
    );

    if (existingAppointments.length > 0) {
      return res.status(400).json({ error: 'Time slot already booked' });
    }

    const [result] = await pool.execute(
      `INSERT INTO appointments (user_id, date, time_slot_id, notes)
       VALUES (?, ?, ?, ?)`,
      [userId, date, timeSlot, notes]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const [appointments] = await pool.execute(
      `SELECT a.*, ts.time, u.name as user_name
       FROM appointments a
       JOIN time_slots ts ON a.time_slot_id = ts.id
       JOIN users u ON a.user_id = u.id
       WHERE a.user_id = ?
       ORDER BY a.date, ts.time`,
      [req.user.id]
    );
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM appointments WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
const isAdmin = async (req, res, next) => {
  try {
    const [users] = await pool.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users[0].is_admin) {
      next();
    } else {
      res.sendStatus(403);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

app.get('/api/admin/appointments', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [appointments] = await pool.execute(
      `SELECT a.*, ts.time, u.name as user_name
       FROM appointments a
       JOIN time_slots ts ON a.time_slot_id = ts.id
       JOIN users u ON a.user_id = u.id
       ORDER BY a.date, ts.time`
    );
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Log the secret (only for development/debugging)
console.log('JWT Secret:', JWT_SECRET);