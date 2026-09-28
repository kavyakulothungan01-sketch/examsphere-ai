const QuestionPaper = require('../models/QuestionPaper');
const Exam          = require('../models/Exam');
const UploadedFile  = require('../models/UploadedFile');
const ActivityLog   = require('../models/ActivityLog');
const aiService     = require('../services/aiService');
const path          = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// Helper — compute total marks per section and total exam max marks
// ─────────────────────────────────────────────────────────────────────────────
const computeSectionMarks = (sec) => {
  const defaultMarks = Number(sec.defaultMarks) || 0;
  const qToAnswer = Number(sec.questionsToAnswer) || 0;
  const questions = sec.questions || [];

  if (qToAnswer > 0 && qToAnswer <= questions.length) {
    // Take top qToAnswer question marks
    const sortedMarks = questions.map(q => (q.marks !== undefined && q.marks !== null ? Number(q.marks) : defaultMarks)).sort((a, b) => b - a);
    return sortedMarks.slice(0, qToAnswer).reduce((sum, m) => sum + m, 0);
  } else if (qToAnswer > 0) {
    return qToAnswer * defaultMarks;
  }
  return questions.reduce((sum, q) => sum + (q.marks !== undefined && q.marks !== null ? Number(q.marks) : defaultMarks), 0);
};

const computeTotalMarks = (sections = []) =>
  sections.reduce((sum, sec) => sum + computeSectionMarks(sec), 0);

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Teacher creates a structured Question Paper for an existing Exam
// @route  POST /api/question-papers
// @access Private (teacher)
// ─────────────────────────────────────────────────────────────────────────────
const createQuestionPaper = async (req, res) => {
  try {
    const { examId, title, sections = [], notes } = req.body;

    if (!examId) {
      return res.status(400).json({ success: false, message: 'examId is required' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Process sections to attach sectionMarks
    const processedSections = sections.map(sec => ({
      ...sec,
      sectionMarks: computeSectionMarks(sec),
    }));

    const totalMarks = computeTotalMarks(processedSections);

    const qp = await QuestionPaper.create({
      exam: examId,
      createdBy: req.user._id,
      title: title || `Question Paper — ${exam.title}`,
      type: 'created',
      status: 'draft',
      sections: processedSections,
      totalMarks,
      notes: notes || '',
    });

    await ActivityLog.create({
      user: req.user._id,
      action: 'QUESTION_PAPER_CREATED',
      details: `Teacher created question paper for exam "${exam.title}" (${totalMarks} marks)`,
      examId: exam._id,
      ipAddress: req.ip,
    });

    const populated = await QuestionPaper.findById(qp._id)
      .populate('exam', 'title subject classOrCourse examDate duration totalMarks instructions rules')
      .populate('createdBy', 'name email department');

    res.status(201).json({ success: true, message: 'Question paper created as draft', questionPaper: populated });
  } catch (error) {
    console.error('[Create QP Error]', error);
    res.status(500).json({ success: false, message: 'Failed to create question paper', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Teacher links an already-uploaded file as a Question Paper for an Exam
// @route  POST /api/question-papers/upload-link
// @access Private (teacher)
// ─────────────────────────────────────────────────────────────────────────────
const linkUploadedQuestionPaper = async (req, res) => {
  try {
    const { examId, uploadedFileId, title, notes } = req.body;

    if (!examId || !uploadedFileId) {
      return res.status(400).json({ success: false, message: 'examId and uploadedFileId are required' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const file = await UploadedFile.findById(uploadedFileId);
    if (!file) {
      return res.status(404).json({ success: false, message: 'Uploaded file not found' });
    }

    if (file.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to use this file' });
    }

    const qp = await QuestionPaper.create({
      exam: examId,
      createdBy: req.user._id,
      title: title || `Uploaded Question Paper — ${exam.title}`,
      type: 'uploaded',
      status: 'draft',
      uploadedFile: uploadedFileId,
      sections: [],
      totalMarks: exam.totalMarks || 0,
      notes: notes || '',
    });

    await Exam.findByIdAndUpdate(examId, { questionPaperFile: uploadedFileId });

    await ActivityLog.create({
      user: req.user._id,
      action: 'QUESTION_PAPER_UPLOADED',
      details: `Teacher linked uploaded file to exam "${exam.title}"`,
      examId: exam._id,
      ipAddress: req.ip,
    });

    const populated = await QuestionPaper.findById(qp._id)
      .populate('exam', 'title subject classOrCourse examDate duration totalMarks instructions rules')
      .populate('createdBy', 'name email department')
      .populate('uploadedFile');

    res.status(201).json({ success: true, message: 'Question paper linked successfully', questionPaper: populated });
  } catch (error) {
    console.error('[Link Uploaded QP Error]', error);
    res.status(500).json({ success: false, message: 'Failed to link question paper', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Teacher extracts text from an uploaded question paper using AI
// @route  POST /api/question-papers/:id/extract
// @access Private (teacher)
// ─────────────────────────────────────────────────────────────────────────────
const extractTextFromPaper = async (req, res) => {
  try {
    const qp = await QuestionPaper.findById(req.params.id).populate('uploadedFile');
    if (!qp) {
      return res.status(404).json({ success: false, message: 'Question paper not found' });
    }
    if (qp.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to extract this question paper' });
    }
    if (qp.type !== 'uploaded' || !qp.uploadedFile) {
      return res.status(400).json({ success: false, message: 'This question paper does not have an uploaded file to extract from' });
    }

    console.log(`[Extraction] Step 1: Endpoint reached for QP ID: ${req.params.id}`);

    // Resolve the absolute file path safely (handles both relative and leading slash)
    let relativePath = qp.uploadedFile.filePath || '';
    if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
      relativePath = relativePath.slice(1);
    }
    let filePath = path.resolve(__dirname, '..', relativePath);
    if (!fs.existsSync(filePath) && qp.uploadedFile.fileName) {
      const fallbackPath = path.resolve(__dirname, '../uploads', qp.uploadedFile.fileName);
      if (fs.existsSync(fallbackPath)) {
        filePath = fallbackPath;
      }
    }

    const mimeType = qp.uploadedFile.mimeType;
    console.log(`[Extraction] Step 2: File record retrieved: ${qp.uploadedFile.fileName || 'unknown'}`);
    console.log(`[Extraction] Step 3: File info - type: ${mimeType || qp.uploadedFile.fileType}, size: ${qp.uploadedFile.fileSize} bytes, existsOnDisk: ${fs.existsSync(filePath)}`);

    console.log('[Extraction] Step 4: Calling Gemini extraction service...');
    const sections = await aiService.extractQuestionPaper(filePath, mimeType);
    console.log(`[Extraction] Step 5: Gemini extraction successful, sections count: ${sections.length}`);

    // Update the question paper with extracted sections
    const processedSections = sections.map(sec => ({
      ...sec,
      sectionMarks: computeSectionMarks(sec),
    }));

    qp.sections = processedSections;
    qp.totalMarks = computeTotalMarks(processedSections);
    await qp.save();

    await ActivityLog.create({
      user: req.user._id,
      action: 'QUESTION_PAPER_EXTRACTED',
      details: `Teacher extracted questions from file using AI for exam "${qp.exam}"`,
      examId: qp.exam,
      ipAddress: req.ip,
    });

    const updated = await QuestionPaper.findById(qp._id)
      .populate('exam', 'title subject classOrCourse examDate duration totalMarks instructions rules')
      .populate('createdBy', 'name email department')
      .populate('uploadedFile');

    console.log(`[Extraction] Step 6: Extracted QP response sent to frontend successfully for QP ID: ${qp._id}`);
    res.json({ success: true, message: 'Text extracted successfully', questionPaper: updated });
  } catch (error) {
    // Log full technical details on backend only — credentials/stack traces must NOT reach the client
    console.error('[Extract QP Error] Technical details:', {
      message: error.message,
      stack: error.stack,
    });

    // Determine the user-facing message:
    // Surface controlled AI-service errors (missing key, unsupported format) directly,
    // but suppress all raw SDK / Google auth errors.
    const safeMessages = [
      'AI extraction is not configured',
      'Unsupported file type',
      'Uploaded file not found',
      'AI service call failed',
      'AI returned an unreadable response',
      'No content could be extracted',
      'The Gemini API key is invalid',
      'The Gemini API key does not have permission',
      'Gemini API quota exceeded',
      'The Gemini model is not available',
    ];
    const isSafeMessage = safeMessages.some(m => error.message?.startsWith(m));
    const clientMessage = isSafeMessage
      ? error.message
      : 'Unable to extract the question paper. Please check the uploaded file and try again.';

    res.status(500).json({ success: false, message: clientMessage });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Teacher gets their own question papers
// @route  GET /api/question-papers/my
// @access Private (teacher)
// ─────────────────────────────────────────────────────────────────────────────
const getMyQuestionPapers = async (req, res) => {
  try {
    const qps = await QuestionPaper.find({ createdBy: req.user._id })
      .populate('exam', 'title subject classOrCourse examDate duration totalMarks status')
      .populate('uploadedFile', 'originalName fileType fileSize')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: qps.length, questionPapers: qps });
  } catch (error) {
    console.error('[Get My QPs Error]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch question papers', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Get a single Question Paper by ID
// @route  GET /api/question-papers/:id
// @access Private (teacher=own, college_admin=any)
// ─────────────────────────────────────────────────────────────────────────────
const getQuestionPaperById = async (req, res) => {
  try {
    const qp = await QuestionPaper.findById(req.params.id)
      .populate('exam', 'title subject classOrCourse examDate duration totalMarks status startTime endTime instructions rules')
      .populate('createdBy', 'name email department')
      .populate('uploadedFile');

    if (!qp) {
      return res.status(404).json({ success: false, message: 'Question paper not found' });
    }

    if (req.user.role === 'teacher' && qp.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this question paper' });
    }

    res.json({ success: true, questionPaper: qp });
  } catch (error) {
    console.error('[Get QP By ID Error]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch question paper', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Teacher updates their own DRAFT question paper
// @route  PUT /api/question-papers/:id
// @access Private (teacher, own draft only)
// ─────────────────────────────────────────────────────────────────────────────
const updateQuestionPaper = async (req, res) => {
  try {
    const qp = await QuestionPaper.findById(req.params.id);
    if (!qp) {
      return res.status(404).json({ success: false, message: 'Question paper not found' });
    }
    if (qp.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this question paper' });
    }
    if (qp.status !== 'draft' && qp.status !== 'rejected') {
      return res.status(403).json({ success: false, message: `Cannot edit a question paper in "${qp.status}" status. Only drafts or rejected papers can be edited.` });
    }

    // If it was rejected, editing it might bring it back to draft or keep it rejected until resubmitted.
    // Let's keep it as is, but clear the rejection reason if they edit it, maybe? Or leave it until submit.

    const { title, sections, notes } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (sections !== undefined) {
      const processedSections = sections.map(sec => ({
        ...sec,
        sectionMarks: computeSectionMarks(sec),
      }));
      updates.sections = processedSections;
      updates.totalMarks = computeTotalMarks(processedSections);
    }
    if (notes !== undefined) updates.notes = notes;

    const updated = await QuestionPaper.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('exam', 'title subject classOrCourse examDate duration totalMarks status startTime endTime instructions rules')
      .populate('createdBy', 'name email department')
      .populate('uploadedFile');

    res.json({ success: true, message: 'Question paper updated', questionPaper: updated });
  } catch (error) {
    console.error('[Update QP Error]', error);
    res.status(500).json({ success: false, message: 'Failed to update question paper', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Teacher submits their question paper (draft → submitted)
// @route  POST /api/question-papers/:id/submit
// @access Private (teacher, own only)
// ─────────────────────────────────────────────────────────────────────────────
const submitQuestionPaper = async (req, res) => {
  try {
    const qp = await QuestionPaper.findById(req.params.id).populate('exam', 'title totalMarks');
    if (!qp) {
      return res.status(404).json({ success: false, message: 'Question paper not found' });
    }
    if (qp.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (qp.status !== 'draft' && qp.status !== 'rejected') {
      return res.status(400).json({ success: false, message: `Cannot submit a question paper in "${qp.status}" status` });
    }

    if (qp.type === 'created') {
      const examTotalMarks = qp.exam?.totalMarks || 0;
      if (examTotalMarks > 0 && qp.totalMarks !== examTotalMarks) {
        return res.status(400).json({
          success: false,
          message: `Total marks mismatch: your question paper has ${qp.totalMarks} marks but the exam requires ${examTotalMarks} marks.`,
        });
      }
      if (qp.sections.length === 0 || qp.sections.every(s => s.questions.length === 0)) {
        return res.status(400).json({ success: false, message: 'Cannot submit an empty question paper. Please add at least one question.' });
      }
    }

    qp.status = 'submitted';
    // Clear rejection reason on resubmit
    qp.rejectionReason = null;
    await qp.save();

    // Update Exam status
    if (qp.exam) {
      qp.exam.status = 'question_paper_submitted';
      await qp.exam.save();
    }

    await ActivityLog.create({
      user: req.user._id,
      action: 'QUESTION_PAPER_SUBMITTED',
      details: `Teacher submitted question paper for exam "${qp.exam?.title}"`,
      examId: qp.exam?._id,
      ipAddress: req.ip,
    });

    const populated = await QuestionPaper.findById(qp._id)
      .populate('exam', 'title subject classOrCourse examDate duration totalMarks status startTime endTime instructions rules')
      .populate('createdBy', 'name email department')
      .populate('uploadedFile');

    res.json({ success: true, message: 'Question paper submitted successfully!', questionPaper: populated });
  } catch (error) {
    console.error('[Submit QP Error]', error);
    res.status(500).json({ success: false, message: 'Failed to submit question paper', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Admin views all Question Papers for a specific Exam
// @route  GET /api/question-papers/exam/:examId
// @access Private (college_admin)
// ─────────────────────────────────────────────────────────────────────────────
const getExamQuestionPapers = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const papers = await QuestionPaper.find({ exam: req.params.examId })
      .populate('createdBy', 'name email department')
      .populate('uploadedFile', 'originalName fileType fileSize uploadedAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: papers.length, questionPapers: papers });
  } catch (error) {
    console.error('[Get Exam QPs Error]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch question papers', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc   Admin reviews (approves or rejects) a submitted question paper
// @route  POST /api/question-papers/:id/review
// @access Private (college_admin)
// ─────────────────────────────────────────────────────────────────────────────
const reviewQuestionPaper = async (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'approve' or 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be approve or reject.' });
    }

    const qp = await QuestionPaper.findById(req.params.id).populate('exam');
    if (!qp) {
      return res.status(404).json({ success: false, message: 'Question paper not found' });
    }

    if (qp.status !== 'submitted') {
      return res.status(400).json({ success: false, message: `Cannot review a question paper in "${qp.status}" status` });
    }

    if (action === 'approve') {
      qp.status = 'approved';
      qp.rejectionReason = null;
      if (qp.exam) {
        qp.exam.status = 'question_paper_approved';
        await qp.exam.save();
      }
    } else if (action === 'reject') {
      if (!reason || reason.trim() === '') {
        return res.status(400).json({ success: false, message: 'Rejection reason is required' });
      }
      qp.status = 'rejected';
      qp.rejectionReason = reason;
      if (qp.exam) {
        // Just leave exam status as is or change it back. 'draft' might make sense so it's hidden from publish.
        qp.exam.status = 'draft';
        await qp.exam.save();
      }
    }

    await qp.save();

    await ActivityLog.create({
      user: req.user._id,
      action: action === 'approve' ? 'QUESTION_PAPER_APPROVED' : 'QUESTION_PAPER_REJECTED',
      details: `Admin ${action}d question paper for exam "${qp.exam?.title}"`,
      examId: qp.exam?._id,
      ipAddress: req.ip,
    });

    const populated = await QuestionPaper.findById(qp._id)
      .populate('exam', 'title subject classOrCourse examDate duration totalMarks status startTime endTime instructions rules')
      .populate('createdBy', 'name email department');

    res.json({ success: true, message: `Question paper ${action}d successfully`, questionPaper: populated });
  } catch (error) {
    console.error('[Review QP Error]', error);
    res.status(500).json({ success: false, message: 'Failed to review question paper', error: error.message });
  }
};

module.exports = {
  createQuestionPaper,
  linkUploadedQuestionPaper,
  getMyQuestionPapers,
  getQuestionPaperById,
  updateQuestionPaper,
  submitQuestionPaper,
  getExamQuestionPapers,
  reviewQuestionPaper,
  extractTextFromPaper,
};
