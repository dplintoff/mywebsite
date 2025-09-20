const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'career-advisor-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Database setup
const db = new sqlite3.Database('./database/career_advisor.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    console.error('Database path:', './database/career_advisor.db');
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      age INTEGER,
      gender TEXT,
      class TEXT,
      interests TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS colleges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      type TEXT NOT NULL,
      courses TEXT NOT NULL,
      facilities TEXT,
      cutoff REAL,
      contact TEXT,
      website TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      stream TEXT NOT NULL,
      description TEXT,
      duration INTEGER,
      career_paths TEXT,
      subjects TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      quiz_type TEXT NOT NULL,
      answers TEXT NOT NULL,
      score INTEGER,
      recommendations TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`,
    `CREATE TABLE IF NOT EXISTS study_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      type TEXT NOT NULL,
      file_path TEXT,
      description TEXT,
      course_id INTEGER,
      FOREIGN KEY (course_id) REFERENCES courses (id)
    )`
  ];

  tables.forEach(sql => {
    db.run(sql, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      }
    });
  });

  // Insert sample data
  insertSampleData();
}

// Sample data insertion
function insertSampleData() {
  const sampleColleges = [
    ['Government Arts College', 'Chennai, Tamil Nadu', 'Arts', 'B.A. Tamil, B.A. English, B.A. History, B.A. Economics', 'Library, Hostel, Computer Lab', 85.5, '044-12345678', 'www.gac-chennai.edu.in'],
    ['Government Science College', 'Mumbai, Maharashtra', 'Science', 'B.Sc. Physics, B.Sc. Chemistry, B.Sc. Mathematics, B.Sc. Biology', 'Laboratory, Library, Research Center', 92.3, '022-87654321', 'www.gsc-mumbai.edu.in'],
    ['Government Commerce College', 'Delhi', 'Commerce', 'B.Com, BBA, B.Com (Hons)', 'Computer Lab, Library, Placement Cell', 88.7, '011-98765432', 'www.gcc-delhi.edu.in']
  ];

  const sampleCourses = [
    ['Bachelor of Arts', 'Arts', 'Comprehensive study of humanities and social sciences', 3, 'Teaching, Civil Services, Journalism, Social Work', 'History, Political Science, Economics, Literature'],
    ['Bachelor of Science', 'Science', 'Foundation in scientific principles and research methodology', 3, 'Research, Teaching, Industry, Government Jobs', 'Physics, Chemistry, Mathematics, Biology'],
    ['Bachelor of Commerce', 'Commerce', 'Business studies and financial management', 3, 'Banking, Accounting, Finance, Business', 'Accounting, Business Law, Economics, Statistics']
  ];

  // Insert sample colleges
  sampleColleges.forEach(college => {
    db.run(`INSERT OR IGNORE INTO colleges (name, location, type, courses, facilities, cutoff, contact, website)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, college);
  });

  // Insert sample courses
  sampleCourses.forEach(course => {
    db.run(`INSERT OR IGNORE INTO courses (name, stream, description, duration, career_paths, subjects)
            VALUES (?, ?, ?, ?, ?, ?)`, course);
  });
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test database connection
app.get('/api/test-db', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) {
      console.error('Database test error:', err);
      return res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
    res.json({ message: 'Database connected successfully', userCount: row.count });
  });
});

// Authentication routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, age, gender, class: userClass } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(`INSERT INTO users (name, email, password, age, gender, class)
            VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, age, gender, userClass],
      function(err) {
        if (err) {
          console.error('Database error during registration:', err.message);
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'User with this email already exists' });
          }
          return res.status(400).json({ error: 'Registration failed: ' + err.message });
        }
        console.log('User registered successfully:', this.lastID);
        res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
      });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, 'secret-key', { expiresIn: '24h' });
    req.session.userId = user.id;

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  });
});

// API routes for colleges
app.get('/api/colleges', (req, res) => {
  const { location, type } = req.query;

  let query = 'SELECT * FROM colleges WHERE 1=1';
  const params = [];

  if (location) {
    query += ' AND location LIKE ?';
    params.push(`%${location}%`);
  }

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// API routes for courses
app.get('/api/courses', (req, res) => {
  const { stream } = req.query;

  let query = 'SELECT * FROM courses WHERE 1=1';
  const params = [];

  if (stream) {
    query += ' AND stream = ?';
    params.push(stream);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Quiz submission route
app.post('/api/submit-quiz', (req, res) => {
  const { userId, quizType, answers } = req.body;

  // Simple scoring logic (can be enhanced)
  let score = 0;
  const recommendations = [];

  // Analyze answers and generate recommendations
  if (quizType === 'aptitude') {
    if (answers.includes('science')) score += 30;
    if (answers.includes('math')) score += 25;
    if (answers.includes('arts')) score += 20;
    if (answers.includes('business')) score += 25;

    if (score >= 70) recommendations.push('Science stream recommended');
    else if (score >= 45) recommendations.push('Commerce stream recommended');
    else recommendations.push('Arts stream recommended');
  }

  db.run(`INSERT INTO quiz_results (user_id, quiz_type, answers, score, recommendations)
          VALUES (?, ?, ?, ?, ?)`,
    [userId, quizType, JSON.stringify(answers), score, JSON.stringify(recommendations)],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save quiz results' });
      }
      res.json({
        message: 'Quiz submitted successfully',
        score,
        recommendations
      });
    });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
