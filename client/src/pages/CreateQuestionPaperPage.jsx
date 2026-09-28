import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, Plus, Trash2, GripVertical,
  ChevronDown, ChevronUp, Eye, Save, Send, CheckCircle,
  AlertCircle, Calendar, Clock, Award, FileText, Info, Code,
  HelpCircle, Printer, X, Edit3, Settings, Layers
} from 'lucide-react';
import { examAPI, questionPaperAPI } from '../services/api';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';

// ── Question Types Definition ──────────────────────────────────────────────────
const QUESTION_TYPES = [
  { value: 'very_short_answer', label: 'Very Short Answer' },
  { value: 'short_answer',      label: 'Short Answer' },
  { value: 'descriptive',       label: 'Descriptive Answer' },
  { value: 'long_answer',       label: 'Long Answer' },
  { value: 'essay',             label: 'Essay' },
  { value: 'mcq',               label: 'Multiple Choice (MCQ)' },
  { value: 'true_false',        label: 'True / False' },
  { value: 'fill_in_blank',     label: 'Fill in the Blank' },
  { value: 'match_following',   label: 'Match the Following' },
  { value: 'numerical',         label: 'Numerical / Problem Solving' },
  { value: 'coding',            label: 'Coding / Programming' },
  { value: 'case_study',        label: 'Case Study' },
  { value: 'other',             label: 'Other' },
];

const DIFFICULTY_LEVELS = [
  { value: '',       label: 'Not Specified' },
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
];

const PROGRAMMING_LANGUAGES = [
  'Java', 'Python', 'C++', 'C', 'JavaScript', 'SQL', 'Data Structures (Pseudocode)', 'HTML/CSS', 'Other'
];

const COMMON_MARKS_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];

const DEFAULT_MCQ_OPTIONS = [
  { label: 'A', text: '' },
  { label: 'B', text: '' },
  { label: 'C', text: '' },
  { label: 'D', text: '' },
];

const DEFAULT_TF_OPTIONS = [
  { label: 'True',  text: 'True' },
  { label: 'False', text: 'False' },
];

// ── Factories ─────────────────────────────────────────────────────────────────
const makeQuestion = (type = 'short_answer', marks = 2, order = 0) => ({
  _tmpId: `q_${Date.now()}_${Math.random()}`,
  questionNumber: '',
  questionText: '',
  type,
  marks: Number(marks) || 2,
  options: type === 'mcq'
    ? DEFAULT_MCQ_OPTIONS.map(o => ({ ...o }))
    : type === 'true_false'
    ? DEFAULT_TF_OPTIONS.map(o => ({ ...o }))
    : [],
  correctAnswer: '',
  difficulty: '',
  instructions: '',
  codeSnippet: '',
  codeLanguage: 'Java',
  order,
});

const makeSection = (order = 0, name = '', marks = 2, type = 'short_answer', count = 5, answerCount = 5, instructions = '') => {
  const sectionTitle = name || `Section ${String.fromCharCode(65 + order)}`;
  const defaultInst = instructions || (answerCount > 0 && answerCount < count
    ? `Answer any ${answerCount} questions.`
    : 'Answer all questions.');

  const questions = [];
  for (let i = 0; i < count; i++) {
    questions.push(makeQuestion(type, marks, i));
  }

  return {
    _tmpId: `s_${Date.now()}_${Math.random()}`,
    title: sectionTitle,
    instructions: defaultInst,
    defaultMarks: Number(marks) || 2,
    defaultQuestionType: type,
    questionCount: Number(count) || 5,
    questionsToAnswer: Number(answerCount) || 0,
    sectionMarks: 0,
    order,
    questions,
  };
};

// ── Calculations ──────────────────────────────────────────────────────────────
const computeSectionContribution = (sec) => {
  const defaultMarks = Number(sec.defaultMarks) || 0;
  const qToAnswer = Number(sec.questionsToAnswer) || 0;
  const questions = sec.questions || [];

  if (qToAnswer > 0 && qToAnswer <= questions.length) {
    const sortedMarks = questions
      .map(q => (q.marks !== undefined && q.marks !== null ? Number(q.marks) : defaultMarks))
      .sort((a, b) => b - a);
    return sortedMarks.slice(0, qToAnswer).reduce((sum, m) => sum + m, 0);
  } else if (qToAnswer > 0) {
    return qToAnswer * defaultMarks;
  }
  return questions.reduce((sum, q) => sum + (q.marks !== undefined && q.marks !== null ? Number(q.marks) : defaultMarks), 0);
};

const computeTotalPaperMarks = (sections) =>
  sections.reduce((sum, sec) => sum + computeSectionContribution(sec), 0);

const countTotalQuestionsProvided = (sections) =>
  sections.reduce((sum, sec) => sum + sec.questions.length, 0);

// ── Components ────────────────────────────────────────────────────────────────
const ExamInfoBanner = ({ exam }) => (
  <div style={{
    background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.03))',
    border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: 'var(--radius-md)',
    padding: '1.25rem 1.5rem',
    marginBottom: '1.5rem',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
      <BookOpen size={16} />
      <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Selected Exam Details</span>
    </div>
    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>{exam.title}</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
      {[
        { icon: <BookOpen size={13} />, label: 'Subject',     value: exam.subject },
        { icon: <FileText size={13} />, label: 'Class/Course',value: exam.classOrCourse || '—' },
        { icon: <Award size={13} />,    label: 'Target Marks',value: `${exam.totalMarks} Marks` },
        { icon: <Calendar size={13} />, label: 'Exam Date',   value: exam.examDate },
        { icon: <Clock size={13} />,    label: 'Duration',    value: `${exam.duration} Minutes` },
      ].map(({ icon, label, value }) => (
        <div key={label} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700 }}>{label}</div>
          <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '0.15rem' }}>{value}</div>
        </div>
      ))}
    </div>
  </div>
);

// Summary Card
const SummaryCard = ({ sections, examTotalMarks }) => {
  const currentTotal = computeTotalPaperMarks(sections);
  const totalQuestions = countTotalQuestionsProvided(sections);
  const isOver = currentTotal > examTotalMarks && examTotalMarks > 0;
  const isMatch = currentTotal === examTotalMarks && examTotalMarks > 0;
  const isUnder = currentTotal < examTotalMarks && examTotalMarks > 0;

  return (
    <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={18} color="var(--primary)" />
          Question Paper Summary & Marks Breakdown
        </h3>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          {sections.length} Section{sections.length !== 1 ? 's' : ''} · {totalQuestions} Questions Provided
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        {sections.map((sec, idx) => {
          const contrib = computeSectionContribution(sec);
          const qCount = sec.questions.length;
          const ansCount = sec.questionsToAnswer > 0 && sec.questionsToAnswer <= qCount ? sec.questionsToAnswer : qCount;
          return (
            <div key={sec._tmpId || idx} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem',
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                {sec.title || `Section ${String.fromCharCode(65 + idx)}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {qCount} Questions Provided · {sec.defaultMarks} Marks each
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', marginTop: '0.2rem', fontWeight: 600 }}>
                {sec.questionsToAnswer > 0 && sec.questionsToAnswer < qCount
                  ? `Answer Any ${sec.questionsToAnswer}`
                  : 'Answer All Questions'}
              </div>
              <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-emerald)' }}>
                Contribution: {contrib} Marks
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress & Target Comparison */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        padding: '1rem 1.25rem', borderRadius: 'var(--radius-sm)',
        background: isOver ? 'rgba(239,68,68,0.1)' : isMatch ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)',
        border: `1px solid ${isOver ? '#ef4444' : isMatch ? 'var(--accent-emerald)' : 'var(--primary)'}`,
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Exam Target: {examTotalMarks} Marks
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)', color: isOver ? '#ef4444' : isMatch ? 'var(--accent-emerald)' : 'var(--primary)', marginTop: '0.15rem' }}>
            Calculated Total: {currentTotal} / {examTotalMarks || '?'} Marks
          </div>
        </div>

        <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>
          {isMatch && (
            <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle size={18} /> Question paper marks perfectly match exam total!
            </span>
          )}
          {isOver && (
            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={18} /> Question paper total ({currentTotal} marks) exceeds exam requirement ({examTotalMarks} marks).
            </span>
          )}
          {isUnder && (
            <span style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertCircle size={18} /> Question paper total ({currentTotal} marks) is less than exam requirement ({examTotalMarks} marks).
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Question Card Component ──────────────────────────────────────────────────
const FlexibleQuestionCard = ({ question, globalNumber, sIdx, qIdx, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [collapsed, setCollapsed] = useState(false);

  const update = (field, val) => onChange(sIdx, qIdx, field, val);

  const handleTypeChange = (newType) => {
    let newOptions = [];
    let newCorrect = '';
    if (newType === 'mcq') {
      newOptions = DEFAULT_MCQ_OPTIONS.map(o => ({ ...o }));
    } else if (newType === 'true_false') {
      newOptions = DEFAULT_TF_OPTIONS.map(o => ({ ...o }));
    }
    onChange(sIdx, qIdx, '__type_change', { type: newType, options: newOptions, correctAnswer: newCorrect });
  };

  const handleOptionText = (optIdx, text) => {
    const opts = [...(question.options || [])];
    opts[optIdx] = { ...opts[optIdx], text };
    update('options', opts);
  };

  const qType = question.type || 'short_answer';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-sm)',
      marginBottom: '1rem',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: 'rgba(99,102,241,0.05)',
        borderBottom: collapsed ? 'none' : '1px solid var(--border-color)',
      }}>
        <GripVertical size={16} color="var(--text-muted)" style={{ cursor: 'grab' }} />
        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)', flex: 1 }}>
          Q{globalNumber}
          {question.questionText && (
            <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.83rem', marginLeft: '0.5rem' }}>
              — {question.questionText.slice(0, 60)}{question.questionText.length > 60 ? '…' : ''}
            </span>
          )}
        </span>

        {/* Type pill */}
        <span style={{ padding: '0.15rem 0.55rem', borderRadius: '50px', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)' }}>
          {QUESTION_TYPES.find(t => t.value === qType)?.label || qType}
        </span>

        {/* Marks pill */}
        <span style={{ padding: '0.15rem 0.55rem', borderRadius: '50px', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)' }}>
          {question.marks} Mark{question.marks !== 1 ? 's' : ''}
        </span>

        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {!isFirst && <button type="button" onClick={() => onMoveUp(sIdx, qIdx)} style={btnStyle} title="Move Up"><ChevronUp size={14} /></button>}
          {!isLast  && <button type="button" onClick={() => onMoveDown(sIdx, qIdx)} style={btnStyle} title="Move Down"><ChevronDown size={14} /></button>}
          <button type="button" onClick={() => setCollapsed(!collapsed)} style={btnStyle}>
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button type="button" onClick={() => onDelete(sIdx, qIdx)} style={{ ...btnStyle, color: '#ef4444' }} title="Delete Question">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: '1rem' }}>
          {/* Question Text */}
          <div className="form-group" style={{ marginBottom: '0.9rem' }}>
            <label className="form-label">Question Text</label>
            <textarea
              className="form-input"
              rows={2}
              value={question.questionText || ''}
              onChange={e => update('questionText', e.target.value)}
              placeholder="Type the question prompt here..."
              style={{ resize: 'vertical', minHeight: '60px' }}
            />
          </div>

          {/* Controls row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '0.9rem' }}>
            <div className="form-group">
              <label className="form-label">Question Type</label>
              <select className="form-input" value={qType} onChange={e => handleTypeChange(e.target.value)}>
                {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Marks</label>
              <input
                type="number"
                min={0}
                className="form-input"
                value={question.marks}
                onChange={e => update('marks', Math.max(0, Number(e.target.value)))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Difficulty Level</label>
              <select className="form-input" value={question.difficulty || ''} onChange={e => update('difficulty', e.target.value)}>
                {DIFFICULTY_LEVELS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>

          {/* DYNAMIC UI PER QUESTION TYPE */}
          {/* MCQ / True-False Options */}
          {['mcq', 'true_false'].includes(qType) && (
            <div style={{ marginBottom: '0.9rem', background: 'rgba(0,0,0,0.15)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <label className="form-label" style={{ marginBottom: '0.5rem' }}>Options & Correct Answer</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {(question.options || []).map((opt, oi) => (
                  <div key={opt.label || oi} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{
                      width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(99,102,241,0.2)', color: 'var(--primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.78rem',
                    }}>{opt.label}</span>
                    {qType === 'true_false' ? (
                      <span className="form-input" style={{ flex: 1, cursor: 'default', opacity: 0.8 }}>{opt.text}</span>
                    ) : (
                      <input
                        className="form-input"
                        style={{ flex: 1 }}
                        value={opt.text || ''}
                        onChange={e => handleOptionText(oi, e.target.value)}
                        placeholder={`Option ${opt.label} text...`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Correct Option:</label>
                <select
                  className="form-input"
                  style={{ maxWidth: '160px' }}
                  value={question.correctAnswer || ''}
                  onChange={e => update('correctAnswer', e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {(question.options || []).map(opt => (
                    <option key={opt.label} value={opt.label}>{opt.label}{opt.text ? ` (${opt.text.slice(0, 20)})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Fill in the Blank */}
          {qType === 'fill_in_blank' && (
            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label className="form-label">Expected Answer Key</label>
              <input
                className="form-input"
                value={question.correctAnswer || ''}
                onChange={e => update('correctAnswer', e.target.value)}
                placeholder="Enter expected word/phrase for the blank..."
              />
            </div>
          )}

          {/* Coding / Programming */}
          {qType === 'coding' && (
            <div style={{ marginBottom: '0.9rem', background: 'rgba(0,0,0,0.15)', padding: '0.85rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Language</label>
                  <select className="form-input" value={question.codeLanguage || 'Java'} onChange={e => update('codeLanguage', e.target.value)}>
                    {PROGRAMMING_LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Optional Guidance / Code Instructions</label>
                  <input
                    className="form-input"
                    value={question.instructions || ''}
                    onChange={e => update('instructions', e.target.value)}
                    placeholder="e.g. Include sample main method and exception handling..."
                  />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Code size={14} color="var(--accent-cyan)" /> Code Starter / Skeleton (optional)
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  value={question.codeSnippet || ''}
                  onChange={e => update('codeSnippet', e.target.value)}
                  placeholder="public class Solution {\n    public static void main(String[] args) {\n        // Write code here\n    }\n}"
                />
              </div>
            </div>
          )}

          {/* Case Study */}
          {qType === 'case_study' && (
            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label className="form-label">Case Scenario / Background Context</label>
              <textarea
                className="form-input"
                rows={3}
                value={question.instructions || ''}
                onChange={e => update('instructions', e.target.value)}
                placeholder="Enter the case study scenario context here..."
              />
            </div>
          )}

          {/* Short / Long Answer / Descriptive / Numerical / Essay optional instructions */}
          {['very_short_answer', 'short_answer', 'descriptive', 'long_answer', 'essay', 'numerical', 'other'].includes(qType) && (
            <div className="form-group" style={{ marginBottom: '0.4rem' }}>
              <label className="form-label">Optional Note / Model Answer Hint</label>
              <input
                className="form-input"
                value={question.instructions || ''}
                onChange={e => update('instructions', e.target.value)}
                placeholder="e.g. Include architectural diagram; max 250 words..."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const btnStyle = {
  background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px',
  padding: '3px 6px', cursor: 'pointer', color: 'var(--text-muted)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ── Realistic College Examination Print Preview Modal ─────────────────────────
const CollegeExamPreviewModal = ({ sections, exam, paperTitle, paperNotes, onClose }) => {
  const previewRef = useRef();

  const handlePrint = () => {
    window.print();
  };

  let questionCounter = 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, overflowY: 'auto', padding: '1.5rem' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        {/* Actions header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: '#fff' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="var(--accent-cyan)" /> Official Examination Paper Preview
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} /> Print / Export PDF
            </button>
            <button className="btn btn-secondary" onClick={onClose}>
              <X size={16} /> Close Preview
            </button>
          </div>
        </div>

        {/* Printable Examination Paper Sheet */}
        <div
          ref={previewRef}
          className="printable-paper"
          style={{
            background: '#ffffff',
            color: '#111827',
            padding: '3rem 3rem',
            borderRadius: '4px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            fontFamily: "'Times New Roman', Times, serif",
            lineHeight: 1.5,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              EXAMSPHERE UNIVERSITY
            </h1>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, textTransform: 'uppercase', margin: '0.25rem 0' }}>
              INTERNAL SEMESTER EXAMINATION
            </h2>
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>
              {exam?.subject ? `SUBJECT: ${exam.subject.toUpperCase()}` : 'EXAMINATION QUESTION PAPER'}
              {exam?.classOrCourse ? ` (${exam.classOrCourse})` : ''}
            </div>
          </div>

          {/* Exam Info Table */}
          <table style={{ width: '100%', marginBottom: '1.25rem', fontSize: '0.95rem', fontWeight: 600, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '0.25rem 0' }}><strong>Exam Title:</strong> {exam?.title || paperTitle || 'Semester Exam'}</td>
                <td style={{ padding: '0.25rem 0', textAlign: 'right' }}><strong>Maximum Marks:</strong> {computeTotalPaperMarks(sections)}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.25rem 0' }}><strong>Date of Exam:</strong> {exam?.examDate || '13-08-2026'}</td>
                <td style={{ padding: '0.25rem 0', textAlign: 'right' }}><strong>Time Allowed:</strong> {exam?.duration || 180} Minutes</td>
              </tr>
            </tbody>
          </table>

          {/* General Instructions */}
          <div style={{ border: '1px solid #000', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <strong>General Instructions:</strong>
            <ol style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
              <li>Read all questions carefully before attempting.</li>
              <li>Write clean, legible answers. Figures to the right indicate full marks.</li>
              {exam?.instructions && <li>{exam.instructions}</li>}
            </ol>
          </div>

          {/* Sections */}
          {sections.map((sec, sIdx) => {
            const secContrib = computeSectionContribution(sec);
            const qCount = sec.questions.length;
            const ansCount = sec.questionsToAnswer > 0 && sec.questionsToAnswer <= qCount ? sec.questionsToAnswer : qCount;

            return (
              <div key={sec._tmpId || sIdx} style={{ marginBottom: '2rem' }}>
                {/* Section Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  borderBottom: '1px solid #000', paddingBottom: '0.25rem', marginBottom: '1rem',
                  fontWeight: 'bold', fontSize: '1.05rem',
                }}>
                  <span>{sec.title || `SECTION ${String.fromCharCode(65 + sIdx)}`}</span>
                  <span>({ansCount} × {sec.defaultMarks} = {secContrib} Marks)</span>
                </div>

                {sec.instructions && (
                  <div style={{ fontStyle: 'italic', marginBottom: '1rem', fontSize: '0.95rem' }}>
                    Note: {sec.instructions}
                  </div>
                )}

                {/* Questions */}
                {sec.questions.map((q) => {
                  questionCounter++;
                  const qNum = questionCounter;
                  const qType = q.type || 'short_answer';

                  return (
                    <div key={q._tmpId || qNum} style={{ marginBottom: '1.25rem', fontSize: '0.98rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, paddingRight: '1rem' }}>
                          <strong>{qNum}.</strong> {q.questionText || <em style={{ color: '#6b7280' }}>Question text pending...</em>}
                        </div>
                        <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          [{q.marks} Mark{q.marks !== 1 ? 's' : ''}]
                        </div>
                      </div>

                      {/* MCQ / True-False Options */}
                      {['mcq', 'true_false'].includes(qType) && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem 1.5rem', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                          {(q.options || []).map(opt => (
                            <div key={opt.label}>
                              <strong>({opt.label})</strong> {opt.text || '______________'}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Fill in Blank */}
                      {qType === 'fill_in_blank' && !q.questionText.includes('___') && (
                        <div style={{ paddingLeft: '1.5rem', color: '#4b5563', fontStyle: 'italic', fontSize: '0.88rem' }}>
                          Answer: _______________________
                        </div>
                      )}

                      {/* Coding */}
                      {qType === 'coding' && (
                        <div style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                          {q.instructions && <div style={{ fontStyle: 'italic', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Note: {q.instructions}</div>}
                          {q.codeSnippet && (
                            <pre style={{ background: '#f3f4f6', padding: '0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontFamily: 'monospace', margin: '0.25rem 0' }}>
                              {q.codeSnippet}
                            </pre>
                          )}
                        </div>
                      )}

                      {/* Case Study Context */}
                      {qType === 'case_study' && q.instructions && (
                        <div style={{ background: '#f9fafb', borderLeft: '3px solid #3b82f6', padding: '0.5rem 0.75rem', marginTop: '0.35rem', marginLeft: '1.5rem', fontSize: '0.9rem' }}>
                          {q.instructions}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* End of paper footer */}
          <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', fontSize: '0.9rem', color: '#6b7280', fontStyle: 'italic' }}>
            *** End of Question Paper ***
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-paper, .printable-paper * { visibility: visible; }
          .printable-paper {
            position: absolute;
            left: 0; top: 0; width: 100%;
            padding: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

// ── Main Page Component ───────────────────────────────────────────────────────
const CreateQuestionPaperPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Navigation Steps: Step 1 = Select Exam, Step 2 = Question Designer
  const [step, setStep] = useState(1);

  // Data
  const [allExams, setAllExams]       = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState(searchParams.get('examId') || '');
  const [sections, setSections]       = useState([
    makeSection(0, 'Section A', 2, 'short_answer', 5, 5, 'Answer all questions.')
  ]);
  const [paperTitle, setPaperTitle]   = useState('');
  const [paperNotes, setPaperNotes]   = useState('');
  const [existingPaperId, setExistingPaperId] = useState(null);

  // Modal for New Section Configuration
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [newSectionConfig, setNewSectionConfig] = useState({
    name: 'Section B',
    defaultMarks: 5,
    defaultQuestionType: 'descriptive',
    questionCount: 5,
    questionsToAnswer: 5,
    instructions: 'Answer any 5 questions.',
  });

  // UI State
  const [loadingExams, setLoadingExams] = useState(true);
  const [saving, setSaving]             = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [updatingMarks, setUpdatingMarks] = useState(false);
  const [showPreview, setShowPreview]   = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [customTotalMarks, setCustomTotalMarks] = useState('');

  // Load Exams
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await examAPI.getAllExamsForTeacher();
        setAllExams(res.data.exams || []);
      } catch {
        setNotification({ type: 'error', message: 'Failed to load exams.' });
      } finally {
        setLoadingExams(false);
      }
    };
    fetchExams();
  }, []);

  // Sync selected exam from URL or dropdown
  useEffect(() => {
    if (selectedExamId && allExams.length > 0) {
      const found = allExams.find(e => e._id === selectedExamId);
      if (found) {
        setSelectedExam(found);
        setCustomTotalMarks(found.totalMarks || '');
      }
    }
  }, [selectedExamId, allExams]);

  // Section Configuration Modal submit
  const handleCreateSectionFromModal = (e) => {
    e.preventDefault();
    const sec = makeSection(
      sections.length,
      newSectionConfig.name || `Section ${String.fromCharCode(65 + sections.length)}`,
      newSectionConfig.defaultMarks,
      newSectionConfig.defaultQuestionType,
      newSectionConfig.questionCount,
      newSectionConfig.questionsToAnswer,
      newSectionConfig.instructions
    );
    setSections(prev => [...prev, sec]);
    setShowSectionModal(false);
    setNotification({ type: 'success', message: `${sec.title} added with ${sec.questionCount} questions!` });
  };

  // Section manipulation
  const deleteSection = (si) => {
    if (sections.length === 1) {
      return setNotification({ type: 'error', message: 'Question paper must have at least one section.' });
    }
    setSections(prev => prev.filter((_, i) => i !== si).map((s, i) => ({ ...s, order: i })));
  };

  const updateSectionMeta = (si, field, val) => {
    setSections(prev => prev.map((sec, i) => i === si ? { ...sec, [field]: val } : sec));
  };

  // Question manipulation inside section
  const addQuestionToSection = (si) => {
    setSections(prev => prev.map((sec, i) => {
      if (i !== si) return sec;
      const newQ = makeQuestion(sec.defaultQuestionType, sec.defaultMarks, sec.questions.length);
      return { ...sec, questions: [...sec.questions, newQ] };
    }));
  };

  const deleteQuestion = (si, qi) => {
    setSections(prev => prev.map((sec, i) => {
      if (i !== si) return sec;
      if (sec.questions.length === 1) {
        setNotification({ type: 'error', message: 'Each section must contain at least one question.' });
        return sec;
      }
      return { ...sec, questions: sec.questions.filter((_, j) => j !== qi) };
    }));
  };

  const updateQuestion = (si, qi, field, val) => {
    setSections(prev => prev.map((sec, i) => {
      if (i !== si) return sec;
      const qs = sec.questions.map((q, j) => {
        if (j !== qi) return q;
        if (field === '__type_change') return { ...q, ...val };
        return { ...q, [field]: val };
      });
      return { ...sec, questions: qs };
    }));
  };

  const moveQuestionUp = (si, qi) => {
    if (qi === 0) return;
    setSections(prev => prev.map((sec, i) => {
      if (i !== si) return sec;
      const qs = [...sec.questions];
      [qs[qi - 1], qs[qi]] = [qs[qi], qs[qi - 1]];
      return { ...sec, questions: qs };
    }));
  };

  const moveQuestionDown = (si, qi) => {
    setSections(prev => prev.map((sec, i) => {
      if (i !== si) return sec;
      if (qi >= sec.questions.length - 1) return sec;
      const qs = [...sec.questions];
      [qs[qi], qs[qi + 1]] = [qs[qi + 1], qs[qi]];
      return { ...sec, questions: qs };
    }));
  };

  // Save / Submit logic
  const buildPayload = () => ({
    examId: selectedExam._id,
    title: paperTitle || `Question Paper — ${selectedExam.title}`,
    notes: paperNotes,
    sections: sections.map((sec, si) => ({
      title: sec.title,
      instructions: sec.instructions,
      defaultMarks: sec.defaultMarks,
      defaultQuestionType: sec.defaultQuestionType,
      questionCount: sec.questions.length,
      questionsToAnswer: sec.questionsToAnswer,
      sectionMarks: computeSectionContribution(sec),
      order: si,
      questions: sec.questions.map((q, qi) => ({
        questionNumber: q.questionNumber || '',
        questionText: q.questionText,
        type: q.type || sec.defaultQuestionType,
        marks: Number(q.marks) || sec.defaultMarks,
        options: q.options || [],
        correctAnswer: q.correctAnswer || '',
        difficulty: q.difficulty || '',
        instructions: q.instructions || '',
        order: qi,
      })),
    })),
  });

  const handleSaveDraft = async () => {
    if (!selectedExam) return setNotification({ type: 'error', message: 'Please select an exam first.' });
    setSaving(true);
    try {
      const payload = buildPayload();
      let res;
      if (existingPaperId) {
        res = await questionPaperAPI.updateQuestionPaper(existingPaperId, payload);
      } else {
        res = await questionPaperAPI.createQuestionPaper(payload);
        setExistingPaperId(res.data.questionPaper._id);
      }
      setNotification({ type: 'success', message: 'Question paper saved as draft!' });
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to save draft.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedExam) return setNotification({ type: 'error', message: 'Please select an exam first.' });
    const currentTotal = computeTotalPaperMarks(sections);
    const targetTotal = selectedExam.totalMarks || 0;

    if (targetTotal > 0 && currentTotal !== targetTotal) {
      return setNotification({
        type: 'error',
        message: `Total marks mismatch: paper has ${currentTotal} marks but exam requires ${targetTotal} marks.`,
      });
    }

    setSubmitting(true);
    try {
      const payload = buildPayload();
      let paperId = existingPaperId;
      if (!paperId) {
        const res = await questionPaperAPI.createQuestionPaper(payload);
        paperId = res.data.questionPaper._id;
        setExistingPaperId(paperId);
      } else {
        await questionPaperAPI.updateQuestionPaper(paperId, payload);
      }
      await questionPaperAPI.submitQuestionPaper(paperId);
      setNotification({ type: 'success', message: 'Question paper submitted successfully!' });
      setTimeout(() => navigate('/teacher/question-papers'), 1800);
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to submit.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueToDesigner = async () => {
    if (!selectedExam) return;
    
    // If the teacher has changed the target total marks, update the exam in the backend
    if (customTotalMarks !== '' && Number(customTotalMarks) !== selectedExam.totalMarks) {
      setUpdatingMarks(true);
      try {
        await examAPI.updateExamTotalMarks(selectedExamId, customTotalMarks);
        setSelectedExam(prev => ({ ...prev, totalMarks: Number(customTotalMarks) }));
        setNotification({ type: 'success', message: 'Exam target marks updated successfully.' });
      } catch (err) {
        setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to update target marks.' });
        setUpdatingMarks(false);
        return; // Don't proceed if it failed
      }
      setUpdatingMarks(false);
    }
    
    setStep(2);
  };

  // ── Step 1: Select Exam ────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="glass-card" style={{ maxWidth: '650px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.4rem' }}>Step 1: Select Administrator Exam</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Select the exam created by your institution administrator to design its question paper.
      </p>

      {loadingExams ? (
        <LoadingSpinner text="Fetching exams list..." />
      ) : allExams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <BookOpen size={44} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
          <p>No exams available. Contact your administrator to create an exam schedule first.</p>
        </div>
      ) : (
        <>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="examSelector">Choose Examination</label>
            <select
              id="examSelector"
              className="form-input"
              value={selectedExamId}
              onChange={e => {
                setSelectedExamId(e.target.value);
                const found = allExams.find(ex => ex._id === e.target.value);
                setSelectedExam(found || null);
                if (found) {
                  setCustomTotalMarks(found.totalMarks || '');
                } else {
                  setCustomTotalMarks('');
                }
              }}
            >
              <option value="">-- Select an Exam --</option>
              {allExams.map(ex => (
                <option key={ex._id} value={ex._id}>
                  {ex.title} ({ex.subject}{ex.classOrCourse ? ` · ${ex.classOrCourse}` : ''} · {ex.examDate})
                </option>
              ))}
            </select>
          </div>

          {selectedExam && (
            <>
              <ExamInfoBanner exam={selectedExam} />
              
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="customTotalMarks">
                  Total Exam Marks * (Edit if different from default)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="number"
                    id="customTotalMarks"
                    className="form-input"
                    value={customTotalMarks}
                    onChange={e => setCustomTotalMarks(e.target.value)}
                    min={1}
                    required
                    style={{ maxWidth: '200px' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Current System Value: {selectedExam.totalMarks}
                  </span>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-primary" 
              disabled={!selectedExam || updatingMarks} 
              onClick={handleContinueToDesigner}
            >
              <span>{updatingMarks ? 'Updating Marks...' : 'Continue to Question Designer'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );

  // ── Step 2: Flexible Question Designer ────────────────────────────────────
  let globalQNum = 0; // Continuous numbering tracker

  const renderStep2 = () => (
    <div>
      {selectedExam && <ExamInfoBanner exam={selectedExam} />}

      <SummaryCard sections={sections} examTotalMarks={selectedExam?.totalMarks || 0} />

      {/* Paper Metadata */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Question Paper Title</label>
            <input
              className="form-input"
              value={paperTitle}
              onChange={e => setPaperTitle(e.target.value)}
              placeholder={`Question Paper — ${selectedExam?.title || ''}`}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Internal Notes / Instructions (Optional)</label>
            <input
              className="form-input"
              value={paperNotes}
              onChange={e => setPaperNotes(e.target.value)}
              placeholder="e.g. Approved by Head of Department..."
            />
          </div>
        </div>
      </div>

      {/* Sections List */}
      {sections.map((sec, sIdx) => {
        const secContrib = computeSectionContribution(sec);

        return (
          <div key={sec._tmpId || sIdx} className="glass-card" style={{ marginBottom: '1.75rem', border: '1px solid rgba(99,102,241,0.25)' }}>
            {/* Section Header & Settings */}
            <div style={{
              background: 'rgba(99,102,241,0.08)',
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '1.25rem',
              borderLeft: '4px solid var(--primary)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                  <Layers size={18} color="var(--primary)" />
                  <input
                    className="form-input"
                    style={{ fontWeight: 800, fontSize: '1.1rem', background: 'transparent', border: '1px solid var(--border-color)', maxWidth: '280px' }}
                    value={sec.title}
                    onChange={e => updateSectionMeta(sIdx, 'title', e.target.value)}
                    placeholder="Section Name"
                  />
                  <span style={{ fontSize: '0.83rem', padding: '0.2rem 0.65rem', borderRadius: '50px', background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)', fontWeight: 800 }}>
                    Section Total: {secContrib} Marks
                  </span>
                </div>

                {sections.length > 1 && (
                  <button type="button" onClick={() => deleteSection(sIdx)} style={{ ...btnStyle, color: '#ef4444', padding: '0.35rem 0.65rem' }}>
                    <Trash2 size={15} style={{ marginRight: '0.3rem' }} /> Delete Section
                  </button>
                )}
              </div>

              {/* Section Controls Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Section Instructions</label>
                  <input
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    value={sec.instructions}
                    onChange={e => updateSectionMeta(sIdx, 'instructions', e.target.value)}
                    placeholder="Answer all questions / Answer any 5..."
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Default Marks/Question</label>
                  <input
                    type="number"
                    min={1}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    value={sec.defaultMarks}
                    onChange={e => updateSectionMeta(sIdx, 'defaultMarks', Math.max(1, Number(e.target.value)))}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Default Question Type</label>
                  <select
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    value={sec.defaultQuestionType}
                    onChange={e => updateSectionMeta(sIdx, 'defaultQuestionType', e.target.value)}
                  >
                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Questions to Answer</label>
                  <input
                    type="number"
                    min={0}
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    value={sec.questionsToAnswer}
                    onChange={e => updateSectionMeta(sIdx, 'questionsToAnswer', Math.max(0, Number(e.target.value)))}
                    placeholder="0 = Answer all"
                  />
                </div>
              </div>
            </div>

            {/* Questions List */}
            {sec.questions.map((q, qIdx) => {
              globalQNum++;
              return (
                <FlexibleQuestionCard
                  key={q._tmpId || qIdx}
                  question={q}
                  globalNumber={globalQNum}
                  sIdx={sIdx}
                  qIdx={qIdx}
                  onChange={updateQuestion}
                  onDelete={deleteQuestion}
                  onMoveUp={moveQuestionUp}
                  onMoveDown={moveQuestionDown}
                  isFirst={qIdx === 0}
                  isLast={qIdx === sec.questions.length - 1}
                />
              );
            })}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => addQuestionToSection(sIdx)}
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
            >
              <Plus size={16} /> Add Question to {sec.title || `Section ${String.fromCharCode(65 + sIdx)}`}
            </button>
          </div>
        );
      })}

      {/* Add New Section Button */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const nextOrder = sections.length;
            setNewSectionConfig({
              name: `Section ${String.fromCharCode(65 + nextOrder)}`,
              defaultMarks: nextOrder === 1 ? 5 : nextOrder === 2 ? 10 : 2,
              defaultQuestionType: nextOrder === 1 ? 'descriptive' : nextOrder === 2 ? 'long_answer' : 'short_answer',
              questionCount: 5,
              questionsToAnswer: 5,
              instructions: 'Answer all questions.',
            });
            setShowSectionModal(true);
          }}
          style={{ background: 'linear-gradient(135deg, var(--primary), #4f46e5)', padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 800 }}
        >
          <Plus size={20} /> Add New Section
        </button>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-main)' }}>{countTotalQuestionsProvided(sections)}</strong> Questions Provided across <strong style={{ color: 'var(--text-main)' }}>{sections.length}</strong> Sections · Maximum Marks: <strong style={{ color: 'var(--accent-emerald)' }}>{computeTotalPaperMarks(sections)}</strong>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
            <ArrowLeft size={16} /> Back to Selection
          </button>

          <button type="button" className="btn btn-secondary" onClick={() => setShowPreview(true)}>
            <Eye size={16} /> Preview Official Paper
          </button>

          <button type="button" className="btn btn-secondary" onClick={handleSaveDraft} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || (selectedExam?.totalMarks > 0 && computeTotalPaperMarks(sections) !== selectedExam.totalMarks)}
          >
            <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Question Paper'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/teacher/dashboard')}>
          <ArrowLeft size={18} /> <span>Back</span>
        </button>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800 }}>
            Flexible Question Paper Designer
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Design multi-section examination papers (Short Answer, Long Answer, Descriptive, Coding, MCQ, etc.)
          </p>
        </div>
      </div>

      <Notification type={notification.type} message={notification.message} onClose={() => setNotification({ type: '', message: '' })} />

      {/* Step Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', padding: '0.5rem', width: 'fit-content' }}>
        {[
          { n: 1, label: 'Select Exam' },
          { n: 2, label: 'Design Question Paper' },
        ].map(({ n, label }) => (
          <div key={n} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-sm)',
            fontWeight: 800, fontSize: '0.88rem',
            background: step === n ? 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(99,102,241,0.15))' : 'transparent',
            color: step === n ? '#fff' : 'var(--text-muted)',
          }}>
            <span style={{
              width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
              background: step >= n ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 800,
            }}>{n}</span>
            {label}
          </div>
        ))}
      </div>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}

      {/* Add New Section Modal */}
      {showSectionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} color="var(--primary)" /> Configure New Section
              </h2>
              <button onClick={() => setShowSectionModal(false)} style={btnStyle}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateSectionFromModal}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Section Name</label>
                <input
                  className="form-input"
                  required
                  value={newSectionConfig.name}
                  onChange={e => setNewSectionConfig({ ...newSectionConfig, name: e.target.value })}
                  placeholder="e.g. Section A, Section B, Section C..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Marks Per Question</label>
                  <input
                    type="number"
                    min={1}
                    className="form-input"
                    required
                    value={newSectionConfig.defaultMarks}
                    onChange={e => setNewSectionConfig({ ...newSectionConfig, defaultMarks: Math.max(1, Number(e.target.value)) })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Question Type</label>
                  <select
                    className="form-input"
                    value={newSectionConfig.defaultQuestionType}
                    onChange={e => setNewSectionConfig({ ...newSectionConfig, defaultQuestionType: e.target.value })}
                  >
                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Number of Questions</label>
                  <input
                    type="number"
                    min={1}
                    className="form-input"
                    required
                    value={newSectionConfig.questionCount}
                    onChange={e => setNewSectionConfig({ ...newSectionConfig, questionCount: Math.max(1, Number(e.target.value)) })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Questions to Answer</label>
                  <input
                    type="number"
                    min={0}
                    className="form-input"
                    value={newSectionConfig.questionsToAnswer}
                    onChange={e => setNewSectionConfig({ ...newSectionConfig, questionsToAnswer: Math.max(0, Number(e.target.value)) })}
                    placeholder="e.g. 5 (0 = Answer All)"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Section Instructions</label>
                <input
                  className="form-input"
                  value={newSectionConfig.instructions}
                  onChange={e => setNewSectionConfig({ ...newSectionConfig, instructions: e.target.value })}
                  placeholder="e.g. Answer any 5 questions..."
                />
              </div>

              <div style={{ background: 'rgba(99,102,241,0.1)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Section Contribution:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent-emerald)' }}>
                  {(newSectionConfig.questionsToAnswer > 0 && newSectionConfig.questionsToAnswer <= newSectionConfig.questionCount
                    ? newSectionConfig.questionsToAnswer
                    : newSectionConfig.questionCount) * newSectionConfig.defaultMarks} Marks
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSectionModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Section</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* College Examination Print Preview */}
      {showPreview && (
        <CollegeExamPreviewModal
          sections={sections}
          exam={selectedExam}
          paperTitle={paperTitle}
          paperNotes={paperNotes}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export default CreateQuestionPaperPage;
