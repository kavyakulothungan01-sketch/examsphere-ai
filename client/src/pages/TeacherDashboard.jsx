import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud, FileText, CheckCircle, Lock, BookOpen,
  Clock, Calendar, Shield, AlertCircle, PlusCircle, Edit3,
  Send, Award, ArrowRight, Eye, MapPin, Info, Bell, X, RefreshCw
} from 'lucide-react';
import { questionPaperAPI, examAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';

// ── Helpers ───────────────────────────────────────────────────────────────────
const getExamStatusBadge = (status) => {
  switch (status) {
    case 'draft':                    return <span className="badge badge-active" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent-amber)' }}>Draft</span>;
    case 'question_paper_submitted': return <span className="badge badge-active" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--primary)' }}>QP Submitted</span>;
    case 'question_paper_approved':  return <span className="badge badge-active" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)' }}>QP Approved</span>;
    case 'ready_to_publish':         return <span className="badge badge-active" style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)' }}>Ready to Publish</span>;
    case 'published':   return <span className="badge badge-active" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-cyan)' }}>Published</span>;
    case 'locked':      return <span className="badge badge-active" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)' }}>Locked</span>;
    case 'in_progress': return <span className="badge badge-active" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>In Progress</span>;
    case 'completed':   return <span className="badge badge-completed">Completed</span>;
    default:            return <span className="badge">{status}</span>;
  }
};

const getQPStatusBadge = (status) => {
  const map = {
    draft:     { bg: 'rgba(245,158,11,0.15)',  color: 'var(--accent-amber)',   label: 'Draft' },
    submitted: { bg: 'rgba(99,102,241,0.15)',  color: 'var(--primary)',        label: 'Submitted – Under Review' },
    approved:  { bg: 'rgba(16,185,129,0.15)',  color: 'var(--accent-emerald)', label: 'Approved ✓' },
    rejected:  { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444',               label: 'Rejected – Revise' },
    published: { bg: 'rgba(16,185,129,0.15)',  color: 'var(--accent-emerald)', label: 'Published' },
  };
  const s = map[status] || { bg: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)', label: status };
  return (
    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

// ── Invigilation Details Modal ────────────────────────────────────────────────
const InvigilationDetailsModal = ({ exam, onClose }) => {
  if (!exam) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '650px', background: 'var(--bg-primary)', border: '1px solid rgba(6,182,212,0.3)', padding: '2rem' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', marginBottom: '0.3rem' }}>
              <Shield size={20} />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Invigilation Duty Details</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>{exam.title}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Role Badge */}
        <div style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontWeight: 800, fontSize: '0.9rem' }}>
            <Shield size={16} /> YOUR ASSIGNED ROLE: EXAM INVIGILATOR
          </div>
          {getExamStatusBadge(exam.status)}
        </div>

        {/* Grid Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Subject</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem' }}>{exam.subject}</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Course / Class</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem' }}>{exam.classOrCourse || '—'}</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Exam Date</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--accent-cyan)' }}>{exam.examDate}</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Exam Window / Time</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--accent-emerald)' }}>{exam.startTime} – {exam.endTime}</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Duration & Marks</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem' }}>{exam.duration} Mins · {exam.totalMarks} Marks</div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Assigned Venue / Room</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--accent-amber)' }}>{exam.venue || 'Room 204 (Academic Block)'}</div>
          </div>
        </div>

        {/* Instructions */}
        {exam.instructions && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Exam Instructions</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.5 }}>{exam.instructions}</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard Component ──────────────────────────────────────────────────
const TeacherDashboard = () => {
  const { user } = useAuth();

  // Data States
  const [qpAssignedExams, setQpAssignedExams] = useState([]);
  const [invigilatorExams, setInvigilatorExams] = useState([]);
  const [myQuestionPapers, setMyQuestionPapers] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [invigTab, setInvigTab] = useState('upcoming'); // 'upcoming' or 'completed'
  const [selectedInvigExam, setSelectedInvigExam] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Question Paper Preparation assignments for this teacher
      const qpExamsRes = await examAPI.getTeacherQPAssignments();
      setQpAssignedExams(qpExamsRes.data.exams || []);

      // 2. Fetch Invigilation duties strictly for this teacher
      const invigRes = await examAPI.getTeacherInvigilationDuties();
      setInvigilatorExams(invigRes.data.exams || []);

      // 3. Fetch Question Papers created/uploaded by this teacher
      const qpRes = await questionPaperAPI.getMyQuestionPapers();
      setMyQuestionPapers(qpRes.data.questionPapers || []);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load teacher dashboard details.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Invigilation Duties: Upcoming vs Completed
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingInvigilations = invigilatorExams.filter(e => e.examDate >= todayStr || e.status !== 'completed');
  const completedInvigilations = invigilatorExams.filter(e => e.examDate < todayStr || e.status === 'completed');

  const displayedInvigilations = invigTab === 'upcoming' ? upcomingInvigilations : completedInvigilations;

  // Stats
  const stats = {
    totalQP: myQuestionPapers.length,
    draftQP: myQuestionPapers.filter(p => p.status === 'draft').length,
    submittedQP: myQuestionPapers.filter(p => p.status === 'submitted').length,
    invigDuties: invigilatorExams.length,
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Top Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: 900 }}>
            Teacher Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Welcome back, <strong style={{ color: 'var(--text-main)' }}>{user?.name || 'Teacher'}</strong> · {user?.department || 'Department Faculty'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/teacher/question-papers/create" className="btn btn-primary">
            <PlusCircle size={18} /> Create Question Paper
          </Link>
          <Link to="/teacher/upload" className="btn btn-secondary">
            <UploadCloud size={18} /> Upload Paper
          </Link>
          <button className="btn btn-secondary" onClick={fetchData} title="Refresh Dashboard Data">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Question Papers', value: stats.totalQP,     color: 'var(--primary)',        icon: <FileText size={22} />,     bg: 'rgba(99,102,241,0.15)' },
          { label: 'Draft Papers',          value: stats.draftQP,     color: 'var(--accent-amber)',   icon: <AlertCircle size={22} />,  bg: 'rgba(245,158,11,0.15)' },
          { label: 'Submitted Papers',      value: stats.submittedQP, color: 'var(--accent-emerald)', icon: <CheckCircle size={22} />, bg: 'rgba(16,185,129,0.15)' },
          { label: 'Invigilation Duties',   value: stats.invigDuties, color: 'var(--accent-cyan)',    icon: <Shield size={22} />,       bg: 'rgba(6,182,212,0.15)' },
        ].map(({ label, value, color, icon, bg }) => (
          <div key={label} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ padding: '0.7rem', borderRadius: 'var(--radius-sm)', background: bg, color }}>{icon}</div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-heading)', marginTop: '0.15rem' }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Fetching your teacher portfolio & duty assignments..." />
      ) : (
        <>
          {/* ─────────────────────────────────────────────────────────────────
              SECTION 1: EXAMS ASSIGNED TO ME (For Question Paper Preparation)
             ───────────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <FileText size={18} color="var(--primary)" />
                  Exams Assigned To Me
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
                  Exams where you are assigned to prepare or upload the Question Paper
                </p>
              </div>
            </div>

            {qpAssignedExams.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <BookOpen size={40} style={{ opacity: 0.35, marginBottom: '0.75rem' }} />
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.3rem' }}>No Question Paper Assignments</h3>
                <p style={{ fontSize: '0.88rem' }}>When an administrator assigns an exam to you for Question Paper preparation, it will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
                {qpAssignedExams.map((exam) => {
                  // Check if a question paper exists for this exam
                  const existingQP = myQuestionPapers.find(p => p.exam?._id === exam._id || p.exam === exam._id);

                  return (
                    <div key={exam._id} className="glass-card" style={{
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      border: '1px solid rgba(99,102,241,0.25)',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(99,102,241,0.02))',
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span style={{ padding: '0.2rem 0.65rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)' }}>
                            {exam.subject}
                          </span>
                          {getExamStatusBadge(exam.status)}
                        </div>

                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-main)' }}>{exam.title}</h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                          Course/Class: <strong style={{ color: 'var(--text-main)' }}>{exam.classOrCourse || 'Standard'}</strong>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={13} color="var(--accent-cyan)" /><span>{exam.examDate}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={13} color="var(--accent-emerald)" /><span>{exam.duration} Mins</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Award size={13} color="var(--accent-amber)" /><span>{exam.totalMarks} Marks</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={13} color="#a78bfa" /><span>{exam.startTime} – {exam.endTime}</span>
                          </div>
                        </div>

                        {/* Question Paper Status Indicator */}
                        <div style={{ padding: '0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>QP Status:</span>
                          {existingQP ? getQPStatusBadge(existingQP.status) : (
                            <span style={{ padding: '0.2rem 0.55rem', borderRadius: '50px', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(245,158,11,0.12)', color: 'var(--accent-amber)' }}>
                              NOT STARTED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                        {existingQP ? (
                          existingQP.status === 'draft' ? (
                            <Link to={`/teacher/question-papers/create?paperId=${existingQP._id}&examId=${exam._id}`} className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}>
                              <Edit3 size={15} /><span>Continue Editing</span>
                            </Link>
                          ) : (
                            <Link to={`/teacher/question-papers`} className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}>
                              <Eye size={15} /><span>View Question Paper</span>
                            </Link>
                          )
                        ) : (
                          <>
                            <Link to={`/teacher/question-papers/create?examId=${exam._id}`} className="btn btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'center' }}>
                              <PlusCircle size={15} /><span>Create Paper</span>
                            </Link>
                            <Link to={`/teacher/upload?examId=${exam._id}`} className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.82rem', justifyContent: 'center' }}>
                              <UploadCloud size={15} /><span>Upload Paper</span>
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              SECTION 2: MY INVIGILATION DUTIES
             ───────────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Shield size={18} />
                  My Invigilation Duties
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
                  Exams assigned to you as Exam Conductor / Invigilator by the Administrator
                </p>
              </div>

              {/* Tabs: Upcoming vs Completed */}
              <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.04)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className={`btn ${invigTab === 'upcoming' ? 'btn-primary' : ''}`}
                  onClick={() => setInvigTab('upcoming')}
                  style={{
                    padding: '0.35rem 0.85rem', fontSize: '0.8rem',
                    background: invigTab === 'upcoming' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                    color: invigTab === 'upcoming' ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  Upcoming ({upcomingInvigilations.length})
                </button>
                <button
                  type="button"
                  className={`btn ${invigTab === 'completed' ? 'btn-primary' : ''}`}
                  onClick={() => setInvigTab('completed')}
                  style={{
                    padding: '0.35rem 0.85rem', fontSize: '0.8rem',
                    background: invigTab === 'completed' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                    color: invigTab === 'completed' ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  Completed ({completedInvigilations.length})
                </button>
              </div>
            </div>

            {displayedInvigilations.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <Shield size={40} style={{ opacity: 0.35, marginBottom: '0.75rem', color: 'var(--accent-cyan)' }} />
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.3rem' }}>
                  {invigTab === 'upcoming' ? 'No invigilation duties have been assigned to you yet.' : 'No completed invigilation duties found.'}
                </h3>
                <p style={{ fontSize: '0.88rem' }}>When an administrator assigns you as an invigilator for an exam, it will appear here automatically.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
                {displayedInvigilations.map((exam) => (
                  <div key={exam._id} className="glass-card" style={{
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    border: '1px solid rgba(6,182,212,0.3)',
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.07), rgba(6,182,212,0.02))',
                  }}>
                    <div>
                      {/* Badge header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <span style={{ padding: '0.2rem 0.65rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)' }}>
                          {exam.subject}
                        </span>
                        {getExamStatusBadge(exam.status)}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                        <Shield size={13} /> Role: Exam Invigilator
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-main)' }}>{exam.title}</h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                        Department: <strong style={{ color: 'var(--text-main)' }}>{exam.department || 'Computer Science'}</strong>
                        {exam.classOrCourse ? ` · Class: ${exam.classOrCourse}` : ''}
                      </div>

                      {/* Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} color="var(--accent-cyan)" /><span>{exam.examDate}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} color="var(--accent-emerald)" /><span>{exam.startTime} – {exam.endTime}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} color="#a78bfa" /><span>{exam.duration} Mins</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <MapPin size={13} color="var(--accent-amber)" /><span>{exam.venue || 'Room 204'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ paddingTop: '0.85rem', borderTop: '1px solid rgba(6,182,212,0.15)', display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setSelectedInvigExam(exam)}
                        style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center', borderColor: 'rgba(6,182,212,0.3)', color: 'var(--accent-cyan)' }}
                      >
                        <Eye size={15} /><span>View Exam Details</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              SECTION 3: MANAGE MY QUESTION PAPERS
             ───────────────────────────────────────────────────────────────── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Award size={18} color="var(--accent-emerald)" />
                  Manage My Question Papers
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
                  Recent question papers created or uploaded by you
                </p>
              </div>
              <Link to="/teacher/question-papers" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}>
                View All Papers ({myQuestionPapers.length})
              </Link>
            </div>

            {myQuestionPapers.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <FileText size={36} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.88rem' }}>You haven't created or uploaded any question papers yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {myQuestionPapers.slice(0, 3).map(paper => (
                  <div key={paper._id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ padding: '0.15rem 0.55rem', borderRadius: '50px', fontSize: '0.72rem', fontWeight: 800, background: paper.type === 'created' ? 'rgba(6,182,212,0.12)' : 'rgba(139,92,246,0.12)', color: paper.type === 'created' ? 'var(--accent-cyan)' : '#a78bfa' }}>
                        {paper.type === 'created' ? 'CREATED' : 'UPLOADED'}
                      </span>
                      {getQPStatusBadge(paper.status)}
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{paper.title}</h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Exam: {paper.exam?.title || '—'} · {paper.exam?.subject || '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Invigilation Exam Details Modal */}
      {selectedInvigExam && (
        <InvigilationDetailsModal
          exam={selectedInvigExam}
          onClose={() => setSelectedInvigExam(null)}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
