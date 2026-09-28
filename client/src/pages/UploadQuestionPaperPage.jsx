import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, CheckCircle, ArrowLeft, AlertCircle, BookOpen } from 'lucide-react';
import { uploadAPI, examAPI, questionPaperAPI } from '../services/api';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';

const UploadQuestionPaperPage = () => {
  const [searchParams] = useSearchParams();
  const examIdParam = searchParams.get('examId');
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(examIdParam || '');
  const [selectedExam, setSelectedExam] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingExams, setLoadingExams] = useState(true);
  const [notification, setNotification] = useState({ type: '', message: '' });

  useEffect(() => {
    const fetchExams = async () => {
      try {
        // Fetch ALL admin-created exams (not just drafts) for teacher to select
        const res = await examAPI.getAllExamsForTeacher();
        const allExams = res.data.exams || [];
        setExams(allExams);
        if (examIdParam) {
          const found = allExams.find(e => e._id === examIdParam);
          if (found) setSelectedExam(found);
        }
      } catch (err) {
        setNotification({ type: 'error', message: 'Failed to load exams. Please try again.' });
      } finally {
        setLoadingExams(false);
      }
    };
    fetchExams();
  }, []);

  const handleExamChange = (e) => {
    const id = e.target.value;
    setSelectedExamId(id);
    const found = exams.find(ex => ex._id === id);
    setSelectedExam(found || null);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setNotification({ type: 'error', message: 'Please select a question paper file to upload.' });
      return;
    }
    if (!selectedExamId) {
      setNotification({ type: 'error', message: 'Please select an exam to associate this question paper with.' });
      return;
    }

    setUploading(true);
    try {
      // Step 1: Upload the file
      const formData = new FormData();
      formData.append('questionPaper', file);
      const uploadRes = await uploadAPI.uploadPaper(formData);
      const uploadedFileId = uploadRes.data.file._id;

      // Step 2: Create a QuestionPaper record linking the file to the exam
      const linkRes = await questionPaperAPI.linkUploadedQuestionPaper({
        examId: selectedExamId,
        uploadedFileId,
        title: `Uploaded Paper — ${selectedExam?.title || 'Exam'}`,
      });
      const newQpId = linkRes.data.questionPaper._id;

      setNotification({
        type: 'success',
        message: 'Question paper uploaded successfully! Redirecting to extraction...',
      });
      setTimeout(() => navigate(`/teacher/question-papers/extract/${newQpId}`), 1800);
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Failed to upload question paper.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/teacher/dashboard')}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800 }}>
            Upload Question Paper
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Upload an existing question paper file and link it to an exam
          </p>
        </div>
      </div>

      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      <div className="glass-card">
        <form onSubmit={handleUpload}>
          {/* Exam Selection */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="examSelect">
              Select Exam <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Choose the administrator-created exam this question paper belongs to.
            </p>
            {loadingExams ? (
              <LoadingSpinner text="Loading exams..." />
            ) : exams.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-amber)', fontSize: '0.85rem' }}>
                <AlertCircle size={15} />
                No exams found. Please ask your administrator to create an exam first.
              </div>
            ) : (
              <select
                id="examSelect"
                className="form-input"
                value={selectedExamId}
                onChange={handleExamChange}
                required
              >
                <option value="">-- Select an Exam --</option>
                {exams.map(exam => (
                  <option key={exam._id} value={exam._id}>
                    {exam.title} ({exam.subject}{exam.classOrCourse ? ` · ${exam.classOrCourse}` : ''} · {exam.examDate})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Exam Info Card (read-only) */}
          {selectedExam && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.03))',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '0.6rem',
            }}>
              {[
                { label: 'Subject',      value: selectedExam.subject },
                { label: 'Class',        value: selectedExam.classOrCourse || '—' },
                { label: 'Total Marks',  value: selectedExam.totalMarks },
                { label: 'Date',         value: selectedExam.examDate },
                { label: 'Duration',     value: `${selectedExam.duration} mins` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '0.15rem' }}>{value}</div>
                </div>
              ))}
            </div>
          )}

          {/* File Drop Zone */}
          <div
            style={{
              border: '2px dashed var(--primary)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              background: 'rgba(99,102,241,0.05)',
              marginBottom: '1.5rem',
              cursor: 'pointer',
            }}
          >
            <UploadCloud size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              Select Question Paper File
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Supported formats: PDF, DOC, DOCX, PNG, JPG, JPEG (Max 20MB)
            </p>

            <input
              type="file"
              id="fileInput"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label htmlFor="fileInput" className="btn btn-secondary">
              Browse Local Files
            </label>

            {file && (
              <div style={{ marginTop: '1.25rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16,185,129,0.15)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-emerald)', fontSize: '0.9rem', fontWeight: 600 }}>
                <FileText size={16} />
                <span>Selected: {file.name} ({Math.round(file.size / 1024)} KB)</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/teacher/dashboard')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading || !file || !selectedExamId}>
              <UploadCloud size={18} />
              <span>{uploading ? 'Uploading…' : 'Upload & Link to Exam'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadQuestionPaperPage;
