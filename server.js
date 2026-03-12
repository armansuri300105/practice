const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const MONGO_URI = 'mongodb://localhost:27017/assignmentdb';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('MongoDB Error:', err.message));

// ── Schemas ──
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
  role: String
}));

const Assignment = mongoose.model('Assignment', new mongoose.Schema({
  title: String,
  course: String,
  due_date: String,
  description: String,
  created_by: String
}));

const Submission = mongoose.model('Submission', new mongoose.Schema({
  student_name: String,
  assignment_id: String,
  assignment_title: String,
  answer: String,
  submission_date: String,
  status: { type: String, default: 'Submitted' },
  marks: { type: Number, default: null },
  comment: { type: String, default: '' }
}));

// ── POST /login — auto create if new user ──
app.post('/login', async (req, res) => {
  const { username, role, password } = req.body;
  if (!username || !role || !password)
    return res.status(400).json({ message: 'All fields are required' });

  try {
    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({ username, password, role });
      return res.json({ message: 'Account created', username, role });
    }
    if (user.password !== password)
      return res.status(401).json({ message: 'Incorrect password' });

    return res.json({ message: 'Login successful', username, role: user.role });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── POST /assignment/create ──
app.post('/assignment/create', async (req, res) => {
  const { title, course, due_date, description, created_by } = req.body;
  try {
    const a = await Assignment.create({ title, course, due_date, description, created_by });
    res.json({ message: 'Assignment created', assignment: a });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── GET /assignments ──
app.get('/assignments', async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ _id: -1 });
    res.json(assignments);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── POST /submit ──
app.post('/submit', async (req, res) => {
  const { student_name, assignment_id, assignment_title, answer } = req.body;
  try {
    const existing = await Submission.findOne({ student_name, assignment_id });
    if (existing) return res.status(400).json({ message: 'Already submitted' });
    const today = new Date().toISOString().split('T')[0];
    const s = await Submission.create({ student_name, assignment_id, assignment_title, answer, submission_date: today });
    res.json({ message: 'Submitted', submission: s });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── GET /submissions ──
app.get('/submissions', async (req, res) => {
  const { student } = req.query;
  try {
    const filter = student ? { student_name: student } : {};
    const submissions = await Submission.find(filter).sort({ _id: -1 });
    res.json(submissions);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── PUT /grade/:id ──
app.put('/grade/:id', async (req, res) => {
  const { marks, comment } = req.body;
  try {
    const s = await Submission.findByIdAndUpdate(req.params.id, { marks, comment, status: 'Graded' }, { new: true });
    res.json({ message: 'Graded', submission: s });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
