const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

// --- Security Helpers ---
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

let dbType = 'sqlite'; // Default
let mongoConnected = false;

// --- SQLite Setup ---
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));
sqliteDb.serialize(() => {
  sqliteDb.run(`CREATE TABLE IF NOT EXISTS lectures (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, date TEXT, subject TEXT, class TEXT, url TEXT)`);
  sqliteDb.run(`CREATE TABLE IF NOT EXISTS students (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, marks INTEGER, attendance INTEGER, fee_due INTEGER)`);
  sqliteDb.run(`CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, name TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
});

// --- MongoDB Setup ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/recmeet';
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    console.log('Connected to MongoDB.');
    dbType = 'mongo';
    mongoConnected = true;
  })
  .catch(err => {
    console.log('MongoDB not available, falling back to SQLite.');
    dbType = 'sqlite';
  });

const lectureSchema = new mongoose.Schema({ title: String, date: String, subject: String, class: String, url: String }, { toJSON: { virtuals: true } });
const studentSchema = new mongoose.Schema({ name: String, marks: Number, attendance: Number, fee_due: Number }, { toJSON: { virtuals: true } });
const leadSchema = new mongoose.Schema({ email: String, created_at: { type: Date, default: Date.now } });
const userSchema = new mongoose.Schema({ email: { type: String, unique: true }, password: String, name: String, created_at: { type: Date, default: Date.now } });
const MongoLecture = mongoose.model('Lecture', lectureSchema);
const MongoStudent = mongoose.model('Student', studentSchema);
const MongoLead = mongoose.model('Lead', leadSchema);
const MongoUser = mongoose.model('User', userSchema);

// --- API Wrappers ---
app.get('/api/lectures', async (req, res) => {
  if (dbType === 'mongo') {
    const data = await MongoLecture.find().sort({ date: -1 });
    return res.json({ message: 'success', data });
  }
  sqliteDb.all("SELECT * FROM lectures ORDER BY date DESC", [], (err, rows) => {
    res.json({ message: 'success', data: rows });
  });
});

app.post('/api/lectures', async (req, res) => {
  const { title, date, subject, class: lecClass, url } = req.body;
  if (dbType === 'mongo') {
    const doc = new MongoLecture({ title, date, subject, class: lecClass, url });
    await doc.save();
    return res.json({ message: 'success', data: doc });
  }
  sqliteDb.run("INSERT INTO lectures (title, date, subject, class, url) VALUES (?,?,?,?,?)", [title, date, subject, lecClass, url], function(err) {
    res.json({ message: 'success', data: { id: this.lastID, ...req.body } });
  });
});

app.get('/api/students', async (req, res) => {
  if (dbType === 'mongo') {
    const data = await MongoStudent.find().sort({ marks: -1 });
    return res.json({ message: 'success', data });
  }
  sqliteDb.all("SELECT * FROM students ORDER BY marks DESC", [], (err, rows) => {
    res.json({ message: 'success', data: rows });
  });
});

app.get('/api/students/:id', async (req, res) => {
  if (dbType === 'mongo') {
    try {
      const data = await MongoStudent.findById(req.params.id);
      return res.json({ message: 'success', data });
    } catch(e) { return res.status(404).send(); }
  }
  sqliteDb.get("SELECT * FROM students WHERE id = ?", [req.params.id], (err, row) => {
    res.json({ message: 'success', data: row });
  });
});

app.put('/api/students/:id/marks', async (req, res) => {
  const { marks } = req.body;
  if (dbType === 'mongo') {
    const data = await MongoStudent.findByIdAndUpdate(req.params.id, { marks }, { new: true });
    return res.json({ message: 'success', data });
  }
  sqliteDb.run("UPDATE students SET marks = ? WHERE id = ?", [marks, req.params.id], function(err) {
    res.json({ message: 'success', data: { id: req.params.id, marks } });
  });
});

app.get('/api/stats', async (req, res) => {
  if (dbType === 'mongo') {
    const totalLectures = await MongoLecture.countDocuments();
    const students = await MongoStudent.find();
    const totalStudents = students.length;
    const avgMarks = totalStudents ? Math.round(students.reduce((a, b) => a + b.marks, 0) / totalStudents) : 0;
    const studentsDue = students.filter(s => s.fee_due > 0).length;
    return res.json({ message: 'success', data: { totalLectures, totalStudents, avgMarks, studentsDue, whatsappAlerts: 28, autoCalls: 9, aiDoubts: 146 } });
  }
  // Simplified SQLite stats for brevity
  sqliteDb.get("SELECT COUNT(*) as count FROM lectures", (err, row1) => {
    sqliteDb.get("SELECT COUNT(*) as count, AVG(marks) as avg, SUM(CASE WHEN fee_due > 0 THEN 1 ELSE 0 END) as due FROM students", (err, row2) => {
      res.json({ message: 'success', data: { totalLectures: row1.count, totalStudents: row2.count, avgMarks: Math.round(row2.avg || 0), studentsDue: row2.due, whatsappAlerts: 28, autoCalls: 9, aiDoubts: 146 } });
    });
  });
});

app.post('/api/doubts', (req, res) => {
  const { question } = req.body;
  const q = question.toLowerCase();
  let reply = "I am your AI assistant. To solve this, you need to understand the basic concepts first.";
  if (q.includes('math')) reply = "Math is all about practice! Try solving similar problems from your textbook.";
  setTimeout(() => res.json({ message: 'success', data: { reply } }), 1000);
});

app.post('/api/leads', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  
  if (dbType === 'mongo') {
    const doc = new MongoLead({ email });
    await doc.save();
    return res.json({ message: 'success', data: doc });
  }
  sqliteDb.run("INSERT INTO leads (email) VALUES (?)", [email], function(err) {
    res.json({ message: 'success', data: { id: this.lastID, email } });
  });
});

// --- Auth Endpoints ---
app.post('/api/signup', async (req, res) => {
  // --- SIGNUPS DISABLED FOR STEALTH MODE ---
  return res.status(403).json({ message: 'Signups are currently closed. Please join the waitlist on the home page.' });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const securePassword = hashPassword(password);

  if (dbType === 'mongo') {
    const user = await MongoUser.findOne({ email, password: securePassword });
    if (user) return res.json({ message: 'success', user: { name: user.name, email: user.email } });
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  sqliteDb.get("SELECT * FROM users WHERE email = ? AND password = ?", [email, securePassword], (err, row) => {
    if (row) return res.json({ message: 'success', user: { name: row.name, email: row.email } });
    res.status(401).json({ message: 'Invalid credentials' });
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT} [Mode: ${dbType}]`));
