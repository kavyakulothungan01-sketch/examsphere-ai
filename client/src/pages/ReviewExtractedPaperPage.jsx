import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionPaperAPI } from '../services/api';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import { Bot, Save, Send, ArrowLeft, AlertTriangle } from 'lucide-react';

const ReviewExtractedPaperPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qp, setQp] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchQP();
  }, [id]);

  const fetchQP = async () => {
    try {
      setLoading(true);
      const res = await questionPaperAPI.getQuestionPaperById(id);
      setQp(res.data.questionPaper);
      setSections(res.data.questionPaper.sections || []);
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to load question paper' });
    } finally {
      setLoading(false);
    }
  };

  const handleExtract = async () => {
    try {
      setExtracting(true);
      setNotification({ type: '', message: '' });
      const res = await questionPaperAPI.extractPaper(id);
      setQp(res.data.questionPaper);
      setSections(res.data.questionPaper.sections || []);
      setNotification({ type: 'success', message: 'Text extracted successfully! Please review for OCR errors.' });
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to extract text.' });
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async (submit = false) => {
    try {
      setSaving(true);
      setNotification({ type: '', message: '' });
      await questionPaperAPI.updateQuestionPaper(id, { sections });
      
      if (submit) {
        await questionPaperAPI.submitQuestionPaper(id);
        setNotification({ type: 'success', message: 'Question paper submitted successfully!' });
        setTimeout(() => navigate('/teacher/question-papers'), 2000);
      } else {
        setNotification({ type: 'success', message: 'Changes saved successfully!' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  const updateSectionTitle = (sIdx, title) => {
    const newSec = [...sections];
    newSec[sIdx].title = title;
    setSections(newSec);
  };

  const updateSectionInstructions = (sIdx, instructions) => {
    const newSec = [...sections];
    newSec[sIdx].instructions = instructions;
    setSections(newSec);
  };

  const updateQuestionText = (sIdx, qIdx, text) => {
    const newSec = [...sections];
    newSec[sIdx].questions[qIdx].questionText = text;
    setSections(newSec);
  };

  const updateQuestionInstructions = (sIdx, qIdx, instructions) => {
    const newSec = [...sections];
    newSec[sIdx].questions[qIdx].instructions = instructions;
    setSections(newSec);
  };
  
  const updateQuestionType = (sIdx, qIdx, type) => {
    const newSec = [...sections];
    newSec[sIdx].questions[qIdx].type = type;
    if (type === 'mcq' && (!newSec[sIdx].questions[qIdx].options || newSec[sIdx].questions[qIdx].options.length === 0)) {
      newSec[sIdx].questions[qIdx].options = [
        { label: 'A', text: '' },
        { label: 'B', text: '' },
        { label: 'C', text: '' },
        { label: 'D', text: '' }
      ];
    }
    setSections(newSec);
  };

  const updateQuestionOptionText = (sIdx, qIdx, oIdx, text) => {
    const newSec = [...sections];
    newSec[sIdx].questions[qIdx].options[oIdx].text = text;
    setSections(newSec);
  };

  const updateQuestionOptionLabel = (sIdx, qIdx, oIdx, label) => {
    const newSec = [...sections];
    newSec[sIdx].questions[qIdx].options[oIdx].label = label;
    setSections(newSec);
  };

  const addQuestionOption = (sIdx, qIdx) => {
    const newSec = [...sections];
    const opts = newSec[sIdx].questions[qIdx].options || [];
    const nextLabel = String.fromCharCode(65 + opts.length); // A, B, C...
    opts.push({ label: nextLabel, text: '' });
    newSec[sIdx].questions[qIdx].options = opts;
    setSections(newSec);
  };

  const removeQuestionOption = (sIdx, qIdx, oIdx) => {
    const newSec = [...sections];
    newSec[sIdx].questions[qIdx].options.splice(oIdx, 1);
    setSections(newSec);
  };

  const updateQuestionMarks = (sIdx, qIdx, marks) => {
    const newSec = [...sections];
    newSec[sIdx].questions[qIdx].marks = Number(marks);
    setSections(newSec);
  };
  
  const updateQuestionNumber = (sIdx, qIdx, num) => {
    const newSec = [...sections];
    newSec[sIdx].questions[qIdx].questionNumber = num;
    setSections(newSec);
  };

  const addQuestion = (sIdx) => {
    const newSec = [...sections];
    newSec[sIdx].questions.push({
      questionNumber: '',
      questionText: 'New Question',
      marks: newSec[sIdx].defaultMarks || 2,
      type: 'short_answer',
    });
    setSections(newSec);
  };

  const removeQuestion = (sIdx, qIdx) => {
    const newSec = [...sections];
    newSec[sIdx].questions.splice(qIdx, 1);
    setSections(newSec);
  };

  const [imageError, setImageError] = useState(false);

  if (loading) return <LoadingSpinner text="Loading question paper..." />;
  if (!qp) return <div>Not found</div>;

  // In local dev the Vite proxy forwards /uploads to localhost:5000.
  // In production, VITE_SERVER_URL or VITE_API_URL is e.g. "https://examsphere-backend-lzp3.onrender.com"
  const rawServerUrl = (import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || '').trim();
  const backendOrigin = rawServerUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
  const rawPath = qp?.uploadedFile?.filePath || '';
  const fileUrl = rawPath ? (backendOrigin ? `${backendOrigin}${rawPath}` : rawPath) : '';

  return (
    <div className="animate-fade-in" style={{ padding: '1rem', height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/teacher/question-papers')}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontFamily: 'var(--font-heading)' }}>
            Review Extracted Content: {qp.title}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => handleSave(false)} disabled={saving || sections.length === 0}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving || sections.length === 0}>
            <Send size={18} /> Submit to Admin
          </button>
        </div>
      </div>

      <Notification type={notification.type} message={notification.message} onClose={() => setNotification({type: '', message: ''})} />

      {sections.length === 0 && !extracting && (
        <div style={{ padding: '2rem', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', textAlign: 'center', marginBottom: '1rem' }}>
          <Bot size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3>Extract Text Using AI</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            We'll use AI OCR to extract sections and questions from your uploaded document.
          </p>
          <button className="btn btn-primary" onClick={handleExtract} style={{ margin: '0 auto' }}>
            Extract Now
          </button>
        </div>
      )}

      {extracting && <LoadingSpinner text="AI is extracting text. This might take a few moments..." />}

      {sections.length > 0 && (
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflow: 'hidden' }}>
          {/* Left Panel: Original Document */}
          <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Original Uploaded File</h3>
            <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {!fileUrl ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>
                  <AlertTriangle size={48} style={{ margin: '0 auto', opacity: 0.5 }} />
                  <p style={{ marginTop: '1rem' }}>No original file available</p>
                </div>
              ) : imageError ? (
                <div style={{ color: '#ef4444', textAlign: 'center', padding: '2rem' }}>
                  <AlertTriangle size={48} style={{ margin: '0 auto' }} />
                  <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>Unable to load original file</p>
                  <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>File URL: {fileUrl}</p>
                </div>
              ) : qp.uploadedFile?.fileType === 'pdf' ? (
                <iframe 
                  src={fileUrl} 
                  width="100%" 
                  height="100%" 
                  title="Original Paper" 
                  style={{ border: 'none' }} 
                  onError={(e) => {
                    console.error('Failed to load PDF iframe:', fileUrl);
                    setImageError(true);
                  }}
                />
              ) : (
                <img 
                  src={fileUrl} 
                  alt="Original Paper" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  onError={(e) => {
                    console.error('Failed to load image:', e.target.src);
                    setImageError(true);
                  }}
                />
              )}
            </div>
          </div>

          {/* Right Panel: Editable Questions */}
          <div className="glass-card" style={{ flex: 1.2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Editable Extracted Content</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.85rem' }}>
                <AlertTriangle size={16} />
                <span>Please review for OCR errors</span>
              </div>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
              {sections.map((sec, sIdx) => (
                <div key={sIdx} style={{ marginBottom: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                  <input 
                    type="text" 
                    value={sec.title || ''} 
                    onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                    placeholder="Section Title (e.g. Section A)"
                    style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem', width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-card)', color: 'var(--text-color)' }}
                  />
                  <textarea 
                    value={sec.instructions || ''} 
                    onChange={(e) => updateSectionInstructions(sIdx, e.target.value)}
                    placeholder="Section Instructions (Optional)"
                    className="form-input"
                    rows={2}
                    style={{ marginBottom: '1rem', padding: '0.4rem', resize: 'vertical' }}
                  />
                  
                  {sec.questions.map((q, qIdx) => (
                    <div key={qIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ width: '60px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Q. No.</label>
                          <input 
                            type="text" 
                            value={q.questionNumber || ''} 
                            onChange={(e) => updateQuestionNumber(sIdx, qIdx, e.target.value)}
                            className="form-input"
                            style={{ padding: '0.4rem' }}
                          />
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Question Text</label>
                          <textarea 
                            value={q.questionText || ''} 
                            onChange={(e) => updateQuestionText(sIdx, qIdx, e.target.value)}
                            className="form-input"
                            rows={3}
                            style={{ padding: '0.4rem', resize: 'vertical' }}
                          />
                        </div>
                        
                        <div style={{ width: '80px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Marks</label>
                          <input 
                            type="number" 
                            value={q.marks || 0} 
                            onChange={(e) => updateQuestionMarks(sIdx, qIdx, e.target.value)}
                            className="form-input"
                            style={{ padding: '0.4rem' }}
                          />
                        </div>
                        
                        <div style={{ width: '120px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Type</label>
                          <select 
                            value={q.type || 'short_answer'} 
                            onChange={(e) => updateQuestionType(sIdx, qIdx, e.target.value)}
                            className="form-input"
                            style={{ padding: '0.4rem' }}
                          >
                            <option value="short_answer">Short Answer</option>
                            <option value="long_answer">Long Answer</option>
                            <option value="descriptive">Descriptive</option>
                            <option value="essay">Essay</option>
                            <option value="mcq">MCQ</option>
                            <option value="true_false">True/False</option>
                            <option value="fill_in_blank">Fill in Blank</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        
                        <div>
                          <button type="button" onClick={() => removeQuestion(sIdx, qIdx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginTop: '1.5rem', padding: '0.2rem' }}>
                            Remove
                          </button>
                        </div>
                      </div>

                      <div style={{ paddingLeft: 'calc(60px + 1rem)' }}>
                        <input
                          type="text"
                          value={q.instructions || ''}
                          onChange={(e) => updateQuestionInstructions(sIdx, qIdx, e.target.value)}
                          placeholder="Question-specific instructions (Optional)"
                          className="form-input"
                          style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                        />
                      </div>

                      {q.type === 'mcq' && (
                        <div style={{ paddingLeft: 'calc(60px + 1rem)' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Options</label>
                          {(q.options || []).map((opt, oIdx) => (
                            <div key={oIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <input 
                                type="text"
                                value={opt.label || ''}
                                onChange={(e) => updateQuestionOptionLabel(sIdx, qIdx, oIdx, e.target.value)}
                                style={{ width: '40px', padding: '0.3rem', textAlign: 'center' }}
                                className="form-input"
                              />
                              <input 
                                type="text"
                                value={opt.text || ''}
                                onChange={(e) => updateQuestionOptionText(sIdx, qIdx, oIdx, e.target.value)}
                                style={{ flex: 1, padding: '0.3rem' }}
                                className="form-input"
                                placeholder="Option text"
                              />
                              <button type="button" onClick={() => removeQuestionOption(sIdx, qIdx, oIdx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}>✕</button>
                            </div>
                          ))}
                          <button type="button" onClick={() => addQuestionOption(sIdx, qIdx)} style={{ fontSize: '0.75rem', background: 'none', border: '1px dashed var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>+ Add Option</button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <button type="button" className="btn btn-secondary" onClick={() => addQuestion(sIdx)} style={{ fontSize: '0.85rem' }}>
                    + Add Question
                  </button>
                </div>
              ))}
              
              <button type="button" className="btn btn-secondary" onClick={() => setSections([...sections, { title: 'New Section', instructions: '', questions: [] }])}>
                + Add Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewExtractedPaperPage;
