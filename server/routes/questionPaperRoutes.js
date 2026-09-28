const express = require('express');
const router  = express.Router();
const {
  createQuestionPaper,
  linkUploadedQuestionPaper,
  getMyQuestionPapers,
  getQuestionPaperById,
  updateQuestionPaper,
  submitQuestionPaper,
  getExamQuestionPapers,
  reviewQuestionPaper,
  extractTextFromPaper,
} = require('../controllers/questionPaperController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// ── Teacher routes ───────────────────────────────────────────────────────────
// Get teacher's own question papers
router.get('/my', protect, authorizeRoles('teacher'), getMyQuestionPapers);

// Create a structured question paper
router.post('/', protect, authorizeRoles('teacher'), createQuestionPaper);

// Link an uploaded file as a question paper for an exam
router.post('/upload-link', protect, authorizeRoles('teacher'), linkUploadedQuestionPaper);

// Admin: get all question papers for a specific exam
router.get('/exam/:examId', protect, authorizeRoles('college_admin'), getExamQuestionPapers);

// Get / update a single question paper
router.route('/:id')
  .get(protect, authorizeRoles('teacher', 'college_admin'), getQuestionPaperById)
  .put(protect, authorizeRoles('teacher'), updateQuestionPaper);

// Submit a question paper
router.post('/:id/submit', protect, authorizeRoles('teacher'), submitQuestionPaper);

// Extract text from uploaded paper
router.post('/:id/extract', protect, authorizeRoles('teacher'), extractTextFromPaper);

// Admin review question paper
router.post('/:id/review', protect, authorizeRoles('college_admin'), reviewQuestionPaper);

module.exports = router;
