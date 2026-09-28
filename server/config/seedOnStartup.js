const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Exam = require('../models/Exam');
const QuestionPaper = require('../models/QuestionPaper');
const StudentExamAttempt = require('../models/StudentExamStatus');

const seedOnStartup = async () => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const seedEnabled = process.env.SEED_DEMO_ACCOUNTS === 'true';

    if (isProduction && !seedEnabled) {
      console.log('[Seed] Production mode active: skipping default demo account seeding. (Set SEED_DEMO_ACCOUNTS=true to seed initial accounts).');
      return;
    }

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Seed] Database is empty. Seeding initial demo accounts...');
      const salt = await bcrypt.genSalt(10);

      const usersToCreate = [
        {
          name: 'System Administrator',
          email: 'overalladmin@examsphere.ai',
          password: await bcrypt.hash('admin123', salt),
          role: 'college_admin',
          phone: '+91 9000000000',
          institutionName: 'Thiagarajar College',
          department: 'Administration',
          designation: 'College Administrator',
        },
        {
          name: 'Prof. Ramesh Sharma',
          email: 'teacher@examsphere.ai',
          password: await bcrypt.hash('teacher123', salt),
          role: 'teacher',
          phone: '+91 9876543210',
          institutionName: 'Thiagarajar College',
          employeeId: 'EMP-T-101',
          department: 'Computer Science',
          designation: 'Associate Professor',
        },
        {
          name: 'Dr. Anita Verma',
          email: 'invigilator@examsphere.ai',
          password: await bcrypt.hash('invigilator123', salt),
          role: 'invigilator',
          phone: '+91 9876543211',
          institutionName: 'Thiagarajar College',
          employeeId: 'EMP-I-202',
          department: 'Examination Control Cell',
          designation: 'Senior Examination Officer',
        },
        {
          name: 'Kavya K',
          email: 'student@examsphere.ai',
          password: await bcrypt.hash('student123', salt),
          role: 'student',
          phone: '+91 9876543212',
          institutionName: 'Thiagarajar College',
          studentId: '24BCA001',
          department: 'Computer Science',
          course: 'BCA',
          year: 'Second Year',
          semester: 'Semester 3',
        },
      ];

      for (const u of usersToCreate) {
        await User.create(u);
        console.log(`[Seed] Created demo user: ${u.email} (${u.role})`);
      }
    }

    // Ensure Demo Exam & Questions exist for Invigilator / Student testing
    const teacher = await User.findOne({ email: 'teacher@examsphere.ai' });
    const invigilator = await User.findOne({ email: 'invigilator@examsphere.ai' });
    const student = await User.findOne({ email: 'student@examsphere.ai' });

    if (teacher && invigilator && student) {
      let exam = await Exam.findOne({ examCode: 'AI-ACC-2026' });
      if (!exam) {
        exam = await Exam.create({
          title: 'Artificial Intelligence & Assistive Technologies Examination',
          subject: 'Artificial Intelligence',
          examCode: 'AI-ACC-2026',
          examDate: new Date().toISOString().split('T')[0],
          startTime: '10:00',
          endTime: '12:00',
          duration: 60,
          totalMarks: 50,
          passingMarks: 20,
          status: 'locked', // Ready for invigilator verification & activation
          assignedInvigilator: invigilator._id,
          assignedStudents: [student._id],
          createdBy: teacher._id,
          instructions: 'This is a voice-accessible examination. Answer all questions clearly. You may use voice commands to navigate, listen, dictate answers, and submit.',
        });
        console.log('[Seed] Created Demo Exam: AI-ACC-2026 (status: locked)');
      }

      let qp = await QuestionPaper.findOne({ exam: exam._id });
      if (!qp) {
        const structuredQuestions = [
          {
            questionNumber: '1',
            questionText: 'What is the primary role of Speech-to-Text and Text-to-Speech in building accessible examination interfaces for visually impaired candidates?',
            type: 'short_answer',
            marks: 5,
            options: [],
            instructions: 'State at least two benefits for candidates.',
            order: 1,
          },
          {
            questionNumber: '2',
            questionText: 'Explain how WebSocket technology enables automatic session synchronization between an invigilator and a remote candidate without requiring manual page reloads.',
            type: 'long_answer',
            marks: 10,
            options: [],
            instructions: 'Describe the handshake, room isolation, and event emission flow.',
            order: 2,
          },
          {
            questionNumber: '3',
            questionText: 'Which Web API standard is used for client-side Speech Recognition in modern web browsers? Option A: Web Audio API, Option B: Web Speech API, Option C: Speech Synthesis API, Option D: WebRTC API.',
            type: 'mcq',
            marks: 2,
            options: [
              { label: 'A', text: 'Web Audio API' },
              { label: 'B', text: 'Web Speech API' },
              { label: 'C', text: 'Speech Synthesis API' },
              { label: 'D', text: 'WebRTC API' },
            ],
            instructions: 'Specify the correct option letter.',
            order: 3,
          },
          {
            questionNumber: '4',
            questionText: 'Describe three critical security and integrity measures implemented during an AI-assisted online examination.',
            type: 'long_answer',
            marks: 10,
            options: [],
            instructions: 'Include discussion on session locking and server-side timer validation.',
            order: 4,
          },
        ];

        qp = await QuestionPaper.create({
          exam: exam._id,
          createdBy: teacher._id,
          title: 'AI & Assistive Technologies Question Paper',
          type: 'created',
          status: 'published',
          totalMarks: 27,
          sections: [
            {
              title: 'Section A - Core Concepts',
              instructions: 'Answer all questions in this section.',
              defaultMarks: 5,
              questions: structuredQuestions,
            },
          ],
        });
        console.log('[Seed] Created Structured Question Paper with 4 questions');
      }

      let attempt = await StudentExamAttempt.findOne({ student: student._id, exam: exam._id });
      if (!attempt) {
        attempt = await StudentExamAttempt.create({
          student: student._id,
          exam: exam._id,
          status: 'not_started',
          studentAnswers: new Map(),
        });
        console.log('[Seed] Created StudentExamAttempt (status: not_started)');
      }
    }
  } catch (err) {
    console.error('[Seed Error]', err.message);
  }
};

module.exports = seedOnStartup;
