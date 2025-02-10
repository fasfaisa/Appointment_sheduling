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

// Middleware to authenticate JWT token
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

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.is_admin) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
};
// Updated function to set proper default capacity
async function ensureDefaultTimeSlots() {
  const connection = await pool.getConnection();
  try {
    const startTime = 8; 
    const endTime = 18;  
    const defaultCapacity = 1; // Change this to 1
    
    for (let hour = startTime; hour <= endTime; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00:00`;
      await connection.execute(
        'INSERT IGNORE INTO time_slots (time, capacity, is_active) VALUES (?, ?, ?)',
        [timeString, defaultCapacity, true]
      );
    }
  } finally {
    connection.release();
  }
}

async function updateExistingTimeSlots() {
  const connection = await pool.getConnection();
  try {
    await connection.execute(
      'UPDATE time_slots SET capacity = ?',
      [1] // Set capacity to 1 for all slots
    );
    console.log('✅ Updated existing time slots capacity');
  } catch (error) {
    console.error('❌ Error updating time slots capacity:', error);
  } finally {
    connection.release();
  }
}



// Update your available-dates endpoint
app.get('/api/available-dates', authenticateToken, async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // First, get all active time slots
    const [timeSlots] = await connection.execute(
      'SELECT id, time, capacity FROM time_slots WHERE is_active = 1 ORDER BY time'
    );

    // Generate dates for the next 30 days
    const availableSlots = [];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    // For each date, check availability
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      // For each time slot, check bookings for this date
      const [bookings] = await connection.execute(
        `SELECT time_slot_id, COUNT(*) as count 
         FROM appointments 
         WHERE date = ? 
         GROUP BY time_slot_id`,
        [dateStr]
      );

      // Create a map of bookings for easy lookup
      const bookingMap = new Map(
        bookings.map(b => [b.time_slot_id, b.count])
      );

      // Add available slots for this date
      for (const slot of timeSlots) {
        const bookedCount = bookingMap.get(slot.id) || 0;
        if (bookedCount < slot.capacity) {
          availableSlots.push({
            id: slot.id,
            time: slot.time,
            date: dateStr,
            remainingCapacity: slot.capacity - bookedCount
          });
        }
      }
    }

   
    res.json(availableSlots);

  } catch (error) {
    console.error('Error in /api/available-dates:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
});
// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Hardcoded admin credentials (for testing only)
    const ADMIN_EMAIL = 'admin@example.com';
    const ADMIN_PASSWORD = 'admin123';

    // Check if the user is the hardcoded admin
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { id: 0, email: ADMIN_EMAIL, is_admin: true },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      return res.json({ 
        token,
        isAdmin: true  // Add this to explicitly tell frontend about admin status
      });
    }

    // Regular user login logic
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
      { id: user.id, email: user.email, is_admin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      isAdmin: user.is_admin 
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// Admin routes
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

app.get('/api/auth/check', authenticateToken, (req, res) => {
  res.json({ 
    authenticated: true, 
    user: { 
      id: req.user.id, 
      email: req.user.email,
      isAdmin: req.user.is_admin 
    } 
  });
});
// Add this function to initialize time slots for a specific date
async function ensureTimeSlotsForDate(date) {
  const connection = await pool.getConnection();
  try {
    // Get all default time slots
    const [timeSlots] = await connection.execute(
      'SELECT * FROM time_slots WHERE is_active = true ORDER BY time'
    );

    // Check existing appointments for the date
    const [existingAppointments] = await connection.execute(
      'SELECT time_slot_id, COUNT(*) as count FROM appointments WHERE date = ? GROUP BY time_slot_id',
      [date]
    );

    // Create a map of booked slots and their counts
    const bookedSlots = new Map(
      existingAppointments.map(app => [app.time_slot_id, app.count])
    );

    // Filter available time slots based on capacity
    const availableSlots = timeSlots.filter(slot => {
      const bookedCount = bookedSlots.get(slot.id) || 0;
      return bookedCount < slot.capacity;
    });

    return availableSlots;
  } finally {
    connection.release();
  }
}


// Modify the appointments POST endpoint to include user details
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { date, timeSlot, notes, name, contact } = req.body;
    const userId = req.user.id;

    // Check if slot is available
    const [existingAppointments] = await pool.execute(
      `SELECT * FROM appointments WHERE date = ? AND time_slot_id = ?`,
      [date, timeSlot]
    );

    if (existingAppointments.length > 0) {
      return res.status(400).json({ error: 'Time slot already booked' });
    }

    const [result] = await pool.execute(
      `INSERT INTO appointments (user_id, date, time_slot_id, notes, name, contact)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, date, timeSlot, notes, name, contact]
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

// Add this to your server startup
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await ensureDefaultTimeSlots();
    await updateExistingTimeSlots(); // Add this line to update existing slots
    console.log('✅ Time slots setup complete');
  } catch (error) {
    console.error('❌ Error setting up time slots:', error);
  }
});

// Log the secret (only for development/debugging)
console.log('JWT Secret:', JWT_SECRET);