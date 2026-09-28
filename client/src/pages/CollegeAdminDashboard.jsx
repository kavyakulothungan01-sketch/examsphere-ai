import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building, UserPlus, BookOpen, ShieldCheck, GraduationCap, RefreshCw, Users,
  Eye, EyeOff, LayoutDashboard, FileText, Settings, Database, Activity, X,
  UploadCloud, PlusCircle, Edit3, Trash2, Calendar, Clock, MapPin, CheckCircle,
  AlertCircle, Search, Filter, CheckSquare, Square, UserX, Lock, Key
} from 'lucide-react';
import { authAPI, departmentAPI, examAPI, questionPaperAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Notification from '../components/Notification';

const CollegeAdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ type: '', message: '' });
  
  // Department View State
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [departmentTab, setDepartmentTab] = useState('teachers');

  // Data States
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [invigilatorDirectory, setInvigilatorDirectory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [exams, setExams] = useState([]);

  // Filters State
  const [userDepartmentFilter, setUserDepartmentFilter] = useState('');
  const [userYearFilter, setUserYearFilter]             = useState('');
  const [userRoleFilter, setUserRoleFilter]             = useState('');
  const [userSearchQuery, setUserSearchQuery]           = useState('');

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Modals & Single User Actions State
  const [userToRemove, setUserToRemove]                   = useState(null); // Individual remove confirmation
  const [userToEdit, setUserToEdit]                       = useState(null);   // Individual edit modal
  const [editFormData, setEditFormData]                   = useState({ name: '', department: '', year: '', employeeId: '', studentId: '', phone: '', role: 'teacher' });
  const [userToResetPass, setUserToResetPass]             = useState(null); // Reset password modal
  const [newPasswordInput, setNewPasswordInput]           = useState('');

  // Bulk Remove Modals State
  const [showBulkRemoveSelectedModal, setShowBulkRemoveSelectedModal] = useState(false);
  const [showBulkRemoveMatchingModal, setShowBulkRemoveMatchingModal] = useState(false);

  // Question Papers Modal State
  const [qpModalExam, setQpModalExam]       = useState(null);
  const [qpModalPapers, setQpModalPapers] = useState([]);
  const [qpModalLoading, setQpModalLoading] = useState(false);

  // Invigilator Management Modal State
  const [selectedInvigRecord, setSelectedInvigRecord] = useState(null); // { teacher, assignedExams }
  const [showAssignExamModal, setShowAssignExamModal] = useState(false);
  const [assignExamData, setAssignExamData]           = useState({
    examId: '',
    venue: 'Room 204 (Main Academic Block)',
    instructions: 'Report 15 minutes before exam start time.',
  });

  // Edit Invigilation Assignment Modal State
  const [editingAssignmentExam, setEditingAssignmentExam] = useState(null);
  const [editAssignData, setEditAssignData]               = useState({ venue: '', instructions: '' });

  // Provision / Department Creation Forms
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [submitting, setSubmitting]             = useState(false);

  const [userFormData, setUserFormData] = useState({
    name: '', email: '', password: '', role: 'teacher',
    phone: '', studentId: '', employeeId: '', department: 'BCA',
    courseOrClass: '', year: '2nd Year', semester: '', designation: '',
  });

  const [deptFormData, setDeptFormData] = useState({
    name: '', code: '', description: ''
  });

  // Initial Load
  useEffect(() => {
    fetchDashboardData();
    fetchExams();
    fetchDepartments();
  }, []);

  useEffect(() => {
    setSelectedUserIds([]);
    if (activeTab === 'dashboard') fetchDashboardData();
    else if (['teachers', 'students', 'users'].includes(activeTab)) fetchUsers();
    else if (activeTab === 'invigilators') fetchInvigilatorsDirectory();
    else if (activeTab === 'departments') { 
      fetchDepartments(); 
      fetchUsers();
      setSelectedDepartment(null); 
    }
    else if (activeTab === 'exams') fetchExams();
  }, [activeTab, userDepartmentFilter, userYearFilter, userRoleFilter, userSearchQuery]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await authAPI.getAdminStats();
      setStats(res.data.stats);
      setRecentActivity(res.data.recentActivity);
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to fetch dashboard stats' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab === 'teachers') params.role = 'teacher';
      else if (activeTab === 'students') params.role = 'student';
      else if (userRoleFilter) params.role = userRoleFilter;

      if (userDepartmentFilter) params.department = userDepartmentFilter;
      if (userYearFilter) params.year = userYearFilter;
      if (userSearchQuery) params.search = userSearchQuery;

      const res = await authAPI.getManagedUsers(params);
      setUsersList(res.data.users || []);
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvigilatorsDirectory = async () => {
    setLoading(true);
    try {
      const res = await examAPI.getInvigilatorsDirectory();
      const directory = res.data.invigilators || [];
      setInvigilatorDirectory(directory);
      if (selectedInvigRecord) {
        const updated = directory.find(i => String(i.teacher._id) === String(selectedInvigRecord.teacher._id));
        if (updated) setSelectedInvigRecord(updated);
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to fetch invigilators directory' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentAPI.getDepartments();
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error('Failed to fetch departments', err);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await examAPI.getAllExamsAdmin();
      setExams(res.data.exams || []);
    } catch (err) {
      console.error('Failed to fetch exams', err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authAPI.createManagedUser(userFormData);
      setNotification({ type: 'success', message: `${userFormData.role.toUpperCase()} account created successfully!` });
      setShowAddUserModal(false);
      setUserFormData({ name: '', email: '', password: '', role: 'teacher', phone: '', studentId: '', employeeId: '', department: 'BCA', courseOrClass: '', year: '2nd Year', semester: '', designation: '' });
      fetchInvigilatorsDirectory();
      fetchUsers();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to create user' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await departmentAPI.createDepartment(deptFormData);
      setNotification({ type: 'success', message: `Department created successfully!` });
      setShowAddDeptModal(false);
      setDeptFormData({ name: '', code: '', description: '' });
      fetchDepartments();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to create department' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Individual User Actions ───────────────────────────────────────────────────
  const handleConfirmSingleRemove = async () => {
    if (!userToRemove) return;
    setSubmitting(true);
    try {
      const res = await authAPI.removeUser(userToRemove._id);
      setNotification({
        type: 'success',
        message: res.data?.message || `User '${userToRemove.name}' was permanently removed successfully.`
      });
      setUserToRemove(null);
      setSelectedInvigRecord(null);
      fetchUsers();
      fetchInvigilatorsDirectory();
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.response?.data?.message || 'Unable to completely remove this user. The authentication account could not be deleted.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditUser = (u) => {
    setUserToEdit(u);
    setEditFormData({
      name: u.name || '',
      department: u.department || '',
      year: u.year || '',
      employeeId: u.employeeId || '',
      studentId: u.studentId || '',
      phone: u.phone || '',
      role: u.role || 'teacher',
    });
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!userToEdit) return;
    setSubmitting(true);
    try {
      await authAPI.updateManagedUser(userToEdit._id, editFormData);
      setNotification({ type: 'success', message: 'User details updated successfully!' });
      setUserToEdit(null);
      fetchUsers();
      fetchInvigilatorsDirectory();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to update user' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!userToResetPass || !newPasswordInput) return;
    setSubmitting(true);
    try {
      await authAPI.adminResetPassword(userToResetPass._id, { newPassword: newPasswordInput });
      setNotification({ type: 'success', message: `Password reset successfully for ${userToResetPass.email}` });
      setUserToResetPass(null);
      setNewPasswordInput('');
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to reset password' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Bulk Removal Actions ──────────────────────────────────────────────────────
  const toggleSelectUser = (id) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === usersList.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(usersList.map(u => u._id));
    }
  };

  const handleConfirmBulkRemoveSelected = async () => {
    if (selectedUserIds.length === 0) return;
    setSubmitting(true);
    try {
      const res = await authAPI.bulkRemoveUsers({ userIds: selectedUserIds });
      setNotification({ type: 'success', message: res.data.message || `Successfully removed ${selectedUserIds.length} user(s).` });
      setSelectedUserIds([]);
      setShowBulkRemoveSelectedModal(false);
      fetchUsers();
      fetchInvigilatorsDirectory();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed bulk removal.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmBulkRemoveMatching = async () => {
    setSubmitting(true);
    try {
      const res = await authAPI.bulkRemoveUsers({
        removeAllMatching: true,
        department: userDepartmentFilter,
        year: userYearFilter,
        role: userRoleFilter || (activeTab === 'teachers' ? 'teacher' : activeTab === 'students' ? 'student' : ''),
      });
      setNotification({ type: 'success', message: res.data.message || 'Successfully removed all matching users.' });
      setShowBulkRemoveMatchingModal(false);
      setSelectedUserIds([]);
      fetchUsers();
      fetchInvigilatorsDirectory();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed bulk matching removal.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Invigilation Management Actions ─────────────────────────────────────────
  const handleAssignExamToInvigilator = async (e) => {
    e.preventDefault();
    if (!assignExamData.examId) {
      return setNotification({ type: 'error', message: 'Please select an exam to assign.' });
    }

    const isAlreadyAssigned = selectedInvigRecord.assignedExams.some(ex => String(ex._id) === String(assignExamData.examId));
    if (isAlreadyAssigned) {
      return setNotification({ type: 'error', message: 'This Invigilator is already assigned to this exam.' });
    }

    setSubmitting(true);
    try {
      await examAPI.assignInvigilator(
        assignExamData.examId,
        selectedInvigRecord.teacher._id,
        assignExamData.venue,
        assignExamData.instructions
      );
      setNotification({ type: 'success', message: `Exam assigned to ${selectedInvigRecord.teacher.name} successfully!` });
      setShowAssignExamModal(false);
      setAssignExamData({ examId: '', venue: 'Room 204 (Main Academic Block)', instructions: 'Report 15 minutes before exam start time.' });
      await fetchInvigilatorsDirectory();
      await fetchExams();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to assign exam' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAssignment = async (e) => {
    e.preventDefault();
    if (!editingAssignmentExam) return;

    setSubmitting(true);
    try {
      await examAPI.assignInvigilator(
        editingAssignmentExam._id,
        selectedInvigRecord.teacher._id,
        editAssignData.venue,
        editAssignData.instructions
      );
      setNotification({ type: 'success', message: 'Invigilation assignment details updated!' });
      setEditingAssignmentExam(null);
      await fetchInvigilatorsDirectory();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to update assignment' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (examId, examTitle) => {
    if (!window.confirm(`Remove Invigilation Assignment?\n\n${selectedInvigRecord.teacher.name} will no longer be assigned as Invigilator for "${examTitle}".`)) return;

    setSubmitting(true);
    try {
      await examAPI.assignInvigilator(examId, null);
      setNotification({ type: 'success', message: 'Invigilation assignment removed.' });
      await fetchInvigilatorsDirectory();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to remove assignment' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDepartmentClick = (dept) => {
    setSelectedDepartment(dept);
  };

  // ── Dual-Role Management ──────────────────────────────────────────────────────
  const handleGrantInvigilatorRole = async (u) => {
    if (!window.confirm(`Grant Invigilator capability to "${u.name}"?\n\nThey will appear in the Invigilators Directory and can be assigned to conduct exams.`)) return;
    setSubmitting(true);
    try {
      await authAPI.updateManagedUser(u._id, { isInvigilator: true });
      setNotification({ type: 'success', message: `Invigilator role granted to ${u.name}!` });
      fetchUsers();
      fetchInvigilatorsDirectory();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to grant role' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvigilatorRole = async (u) => {
    if (!window.confirm(`Remove Invigilator capability from "${u.name}"?\n\nThey will be removed from the Invigilators Directory and unassigned from all future exams.`)) return;
    setSubmitting(true);
    try {
      await authAPI.removeInvigilatorRole(u._id);
      setNotification({ type: 'success', message: `Invigilator role removed from ${u.name}.` });
      fetchUsers();
      fetchInvigilatorsDirectory();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.message || 'Failed to remove role' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewQuestionPapers = async (exam) => {
    setQpModalExam(exam);
    setQpModalPapers([]);
    setQpModalLoading(true);
    try {
      const res = await questionPaperAPI.getExamQuestionPapers(exam._id);
      setQpModalPapers(res.data.questionPapers || []);
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to load question papers for this exam' });
    } finally {
      setQpModalLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: 900 }}>
            College Administration
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            User Provisioning, Invigilation Management & Department Control · <strong style={{ color: 'var(--text-main)' }}>{user?.name}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowAddDeptModal(true)} className="btn btn-secondary">
            <Building size={16} /> + New Department
          </button>
          <button onClick={() => setShowAddUserModal(true)} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <UserPlus size={16} /> + Provision User
          </button>
        </div>
      </div>

      <Notification
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ type: '', message: '' })}
      />

      {/* Main Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {[
          { id: 'dashboard', label: 'Overview', icon: <LayoutDashboard size={16} /> },
          { id: 'invigilators', label: 'Invigilators', icon: <ShieldCheck size={16} /> },
          { id: 'teachers', label: 'Teachers', icon: <BookOpen size={16} /> },
          { id: 'students', label: 'Students', icon: <GraduationCap size={16} /> },
          { id: 'users', label: 'All Users & Bulk', icon: <Users size={16} /> },
          { id: 'departments', label: 'Departments', icon: <Building size={16} /> },
          { id: 'exams', label: 'Exams', icon: <FileText size={16} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : ''}`}
            style={{
              background: activeTab === tab.id ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 700
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading administration data...</div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'dashboard' && stats && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Teachers</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)', marginTop: '0.5rem' }}>{stats.totalTeachers}</div>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Students</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)', marginTop: '0.5rem' }}>{stats.totalStudents}</div>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ color: 'var(--accent-cyan)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Invigilators Directory</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)', marginTop: '0.5rem' }}>{invigilatorDirectory.length}</div>
                </div>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <div style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Exams</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-heading)', marginTop: '0.5rem' }}>{exams.length}</div>
                </div>
              </div>

              <div className="glass-card">
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} color="#f59e0b" /> Recent Activity</h2>
                {recentActivity.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No recent activity.</p> : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {recentActivity.map(act => (
                      <li key={act._id} style={{ padding: '1rem 0', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(act.timestamp).toLocaleString()}</div>
                        <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{act.details}</div>
                        <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.2rem' }}>{act.action} by {act.user?.name || 'System'}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Invigilators Directory Tab */}
          {activeTab === 'invigilators' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={20} color="var(--accent-cyan)" />
                    Invigilators Directory ({invigilatorDirectory.length})
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                    All provisioned Invigilator accounts and Teachers assigned to conduct examinations
                  </p>
                </div>
                <button onClick={() => {
                  setUserFormData(prev => ({ ...prev, role: 'invigilator' }));
                  setShowAddUserModal(true);
                }} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', fontSize: '0.88rem' }}>
                  + Provision Invigilator Account
                </button>
              </div>

              {invigilatorDirectory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <ShieldCheck size={44} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                  <p style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>No Invigilator accounts or duty assignments found.</p>
                  <p style={{ fontSize: '0.85rem' }}>Provision a new Invigilator account or assign a teacher via the Exams section.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
                  {invigilatorDirectory.map((record) => {
                    const { teacher, assignedExams } = record;
                    const isTeacherRole = teacher.role === 'teacher';

                    return (
                      <div key={teacher._id} className="glass-card" style={{
                        background: 'rgba(6,182,212,0.04)',
                        border: '1px solid rgba(6,182,212,0.25)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '1.25rem',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      }}>
                        <div>
                          {/* Header badges */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                              <h3 style={{ fontWeight: 900, fontSize: '1.1rem', margin: 0, color: 'var(--text-main)' }}>{teacher.name}</h3>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                Department: <strong style={{ color: 'var(--text-main)' }}>{teacher.department || 'BCA'}</strong>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', marginTop: '0.15rem', fontFamily: 'monospace', fontWeight: 700 }}>
                                ID / Roll: {teacher.employeeId || '24suca51'}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.15rem', wordBreak: 'break-all' }}>{teacher.email}</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                              {isTeacherRole && (
                                <span style={{ padding: '0.15rem 0.55rem', borderRadius: '50px', fontSize: '0.68rem', fontWeight: 800, background: 'rgba(99,102,241,0.2)', color: 'var(--primary)' }}>TEACHER</span>
                              )}
                              <span style={{ padding: '0.15rem 0.55rem', borderRadius: '50px', fontSize: '0.68rem', fontWeight: 800, background: 'rgba(6,182,212,0.2)', color: 'var(--accent-cyan)' }}>
                                INVIGILATOR
                              </span>
                            </div>
                          </div>

                          {/* Assigned exams summary count */}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>Assigned Exams</span>
                              <span style={{ fontSize: '0.95rem', fontWeight: 900, color: assignedExams.length > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                                {assignedExams.length}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setSelectedInvigRecord(record)}
                            className="btn btn-secondary"
                            style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem', borderColor: 'rgba(6,182,212,0.3)', color: 'var(--accent-cyan)' }}
                          >
                            <Eye size={14} /> View / Manage
                          </button>
                          <button
                            onClick={() => setUserToRemove(teacher)}
                            className="btn"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                            title="Remove User Account"
                          >
                            <UserX size={14} /> Remove User
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              USERS DIRECTORIES (Teachers, Students, All Users & Bulk Management)
             ───────────────────────────────────────────────────────────────── */}
          {['teachers', 'students', 'users'].includes(activeTab) && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} color="var(--primary)" />
                  {activeTab === 'users' ? 'All Users Directory & Bulk Management' : `${activeTab} Directory`} ({usersList.length})
                </h2>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button onClick={toggleSelectAll} className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
                    {selectedUserIds.length === usersList.length && usersList.length > 0 ? <CheckSquare size={15} /> : <Square size={15} />}
                    {selectedUserIds.length === usersList.length && usersList.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>

                  {selectedUserIds.length > 0 && (
                    <button
                      onClick={() => setShowBulkRemoveSelectedModal(true)}
                      className="btn"
                      style={{ background: '#ef4444', color: '#fff', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <UserX size={15} /> Remove Selected ({selectedUserIds.length})
                    </button>
                  )}

                  {(userDepartmentFilter || userYearFilter || userRoleFilter) && (
                    <button
                      onClick={() => setShowBulkRemoveMatchingModal(true)}
                      className="btn"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: '1px solid #ef4444', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <Trash2 size={15} /> Remove All Matching ({usersList.length})
                    </button>
                  )}
                </div>
              </div>

              {/* FILTERS BAR */}
              <div style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.85rem',
                alignItems: 'end',
              }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Department Filter</label>
                  <select className="form-input" value={userDepartmentFilter} onChange={e => setUserDepartmentFilter(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d._id} value={d.name}>{d.name} ({d.code})</option>)}
                    <option value="BCA">BCA</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Year Filter</label>
                  <select className="form-input" value={userYearFilter} onChange={e => setUserYearFilter(e.target.value)}>
                    <option value="">All Years</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                {activeTab === 'users' && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Role Filter</label>
                    <select className="form-input" value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
                      <option value="">All Roles</option>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="invigilator">Invigilator</option>
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Search Name / Email / ID</label>
                  <input
                    className="form-input"
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name, email, ID..."
                  />
                </div>
              </div>

              {/* USER LIST TABLE */}
              {usersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <Users size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p>No users found matching current criteria.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.75rem 0.5rem', width: '40px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedUserIds.length === usersList.length && usersList.length > 0}
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th style={{ padding: '0.75rem 1rem' }}>User Name</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                        <th style={{ padding: '0.75rem 1rem' }}>ID / Roll No</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Department & Year</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map(u => {
                        const isSelected = selectedUserIds.includes(u._id);

                        return (
                          <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent' }}>
                            <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectUser(u._id)}
                              />
                            </td>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{u.name}</td>
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{u.email}</td>
                            <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-amber)' }}>
                              {u.employeeId || u.studentId || u.roll_no || '--'}
                            </td>
                            <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem' }}>
                              {u.department || 'BCA'}{u.year ? ` · ${u.year}` : ''}
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <span style={{ padding: '0.15rem 0.55rem', borderRadius: '50px', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', display: 'inline-block', width: 'fit-content' }}>
                                  {u.role?.toUpperCase()}
                                </span>
                                {u.isInvigilator && u.role === 'teacher' && (
                                  <span style={{ padding: '0.15rem 0.55rem', borderRadius: '50px', fontSize: '0.68rem', fontWeight: 800, background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', display: 'inline-block', width: 'fit-content' }}>
                                    + INVIGILATOR
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, background: u.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: u.isActive ? 'var(--accent-emerald)' : '#ef4444' }}>
                                {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <button onClick={() => handleOpenEditUser(u)} className="btn btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }} title="Edit User">
                                  <Edit3 size={13} /> Edit
                                </button>
                                <button onClick={() => setUserToResetPass(u)} className="btn btn-secondary" style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }} title="Reset Password">
                                  <Key size={13} />
                                </button>
                                {u.role === 'teacher' && !u.isInvigilator && (
                                  <button
                                    onClick={() => handleGrantInvigilatorRole(u)}
                                    className="btn"
                                    style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.25)', padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                                    title="Grant Invigilator Capability"
                                  >
                                    <ShieldCheck size={13} /> +Invig
                                  </button>
                                )}
                                {u.role === 'teacher' && u.isInvigilator && (
                                  <button
                                    onClick={() => handleRevokeInvigilatorRole(u)}
                                    className="btn"
                                    style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                                    title="Remove Invigilator Capability"
                                  >
                                    <ShieldCheck size={13} /> -Invig
                                  </button>
                                )}
                                <button onClick={() => setUserToRemove(u)} className="btn" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', padding: '0.25rem 0.55rem', fontSize: '0.78rem' }} title="Remove User Account">
                                  <UserX size={13} /> Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Departments */}
          {activeTab === 'departments' && !selectedDepartment && (
            <div className="glass-card">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem' }}>Departments Directory</h2>
              {departments.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No departments found.</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map(d => (
                        <tr 
                          key={d._id} 
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'background 0.2s' }}
                          onClick={() => handleDepartmentClick(d)}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{d.code}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>{d.name}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, background: d.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: d.isActive ? 'var(--accent-emerald)' : '#ef4444' }}>
                              {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Department Drill-Down View */}
          {activeTab === 'departments' && selectedDepartment && (
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedDepartment(null)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.82rem' }}
                >
                  ← Back to Departments
                </button>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>
                    <Building size={18} color="var(--primary)" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    {selectedDepartment.name}
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>({selectedDepartment.code})</span>
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    {selectedDepartment.description || 'No description provided.'}
                  </p>
                </div>
                <span style={{ marginLeft: 'auto', padding: '0.2rem 0.75rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 800, background: selectedDepartment.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: selectedDepartment.isActive ? 'var(--accent-emerald)' : '#ef4444' }}>
                  {selectedDepartment.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              {/* Sub-tabs: Teachers / Students */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                {['teachers', 'students'].map(t => (
                  <button
                    key={t}
                    onClick={() => setDepartmentTab(t)}
                    className={`btn ${departmentTab === t ? 'btn-primary' : ''}`}
                    style={{
                      background: departmentTab === t ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                      color: departmentTab === t ? '#fff' : 'var(--text-muted)',
                      fontWeight: 700, fontSize: '0.88rem', padding: '0.45rem 1rem'
                    }}
                  >
                    {t === 'teachers' ? <><BookOpen size={14} style={{ marginRight: '0.3rem' }} />Teachers</> : <><GraduationCap size={14} style={{ marginRight: '0.3rem' }} />Students</>}
                  </button>
                ))}
              </div>

              {/* Members list filtered by dept + sub-tab */}
              {usersList.filter(u => u.department === selectedDepartment.name && u.role === (departmentTab === 'teachers' ? 'teacher' : 'student')).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <Users size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p>No {departmentTab} found in {selectedDepartment.name}.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                        <th style={{ padding: '0.75rem 1rem' }}>ID / Roll No</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Year</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList
                        .filter(u => u.department === selectedDepartment.name && u.role === (departmentTab === 'teachers' ? 'teacher' : 'student'))
                        .map(u => (
                          <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{u.name}</td>
                            <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{u.email}</td>
                            <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-amber)' }}>{u.employeeId || u.studentId || '--'}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>{u.year || '--'}</td>
                            <td style={{ padding: '0.85rem 1rem' }}>
                              <span style={{ padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, background: u.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: u.isActive ? 'var(--accent-emerald)' : '#ef4444' }}>
                                {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Exams Tab */}
          {activeTab === 'exams' && (
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Exams Overview</h2>
                <Link to="/admin/exams/create" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', fontSize: '0.88rem' }}>
                  + Create New Exam
                </Link>
              </div>
              {exams.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No exams found.</p> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Title</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Subject</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exams.map(ex => (
                        <tr key={ex._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{ex.title}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>{ex.subject}</td>
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{new Date(ex.examDate).toLocaleDateString()}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(99,102,241,0.2)', color: 'var(--primary)' }}>
                              {ex.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <Link to={`/admin/exams/details/${ex._id}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', textDecoration: 'none', fontWeight: 700 }}>
                                View
                              </Link>
                              <button
                                onClick={() => handleViewQuestionPapers(ex)}
                                style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                              >
                                Question Papers
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODAL 1: PROVISION NEW USER (RESPONSIVE GRID LAYOUT FIX) ──────────────── */}
      {showAddUserModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '680px', background: 'var(--bg-primary)', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} color="var(--primary)" /> Provision New User Account
              </h2>
              <button onClick={() => setShowAddUserModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateUser}>
              {/* RESPONSIVE GRID: 2 COLUMNS, FIXED LAYOUT TO PREVENT EMAIL OVERFLOW */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                boxSizing: 'border-box',
                gap: '1.25rem',
                marginBottom: '1rem',
              }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Role *</label>
                  <select
                    className="form-input"
                    style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                    value={userFormData.role}
                    onChange={e => setUserFormData({ ...userFormData, role: e.target.value })}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="invigilator">Invigilator</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                    required
                    value={userFormData.name}
                    onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                    placeholder="e.g. Varshini"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }}
                    required
                    value={userFormData.email}
                    onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="e.g. varshini@example.com"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                    required
                    value={userFormData.password}
                    onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">ID / Roll No</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                    value={userFormData.employeeId}
                    onChange={e => setUserFormData({ ...userFormData, employeeId: e.target.value, studentId: e.target.value })}
                    placeholder="e.g. 24suca51"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Department</label>
                  <select
                    className="form-input"
                    style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                    value={userFormData.department}
                    onChange={e => setUserFormData({ ...userFormData, department: e.target.value })}
                  >
                    <option value="BCA">BCA</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    {departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Year (Academic)</label>
                  <select
                    className="form-input"
                    style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                    value={userFormData.year}
                    onChange={e => setUserFormData({ ...userFormData, year: e.target.value })}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                    value={userFormData.phone}
                    onChange={e => setUserFormData({ ...userFormData, phone: e.target.value })}
                    placeholder="+91..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CONFIRM SINGLE USER PERMANENT DELETION ─────────────────────── */}
      {userToRemove && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-primary)', border: '1px solid rgba(239,68,68,0.5)', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: '#ef4444' }}>
              <AlertCircle size={28} />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>Delete User Permanently?</h2>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-sm)', padding: '1.15rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>User:</span>
                <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>{userToRemove.name}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Email:</span>
                <strong style={{ color: 'var(--text-main)' }}>{userToRemove.email}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Role:</span>
                <strong style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>{userToRemove.role}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Department:</span>
                <strong style={{ color: 'var(--text-main)' }}>{userToRemove.department || 'BCA'}</strong>
              </div>
            </div>

            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#f59e0b', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <span>
                <strong>Warning:</strong> This will permanently remove the user's account and allow this email address to be registered again. Historical exam records will be preserved where applicable.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setUserToRemove(null)}>Cancel</button>
              <button className="btn" onClick={handleConfirmSingleRemove} disabled={submitting} style={{ background: '#ef4444', color: '#fff', fontWeight: 800 }}>
                {submitting ? 'Deleting Permanently...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: EDIT USER DETAILS ────────────────────────────────────────── */}
      {userToEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-primary)', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="var(--primary)" /> Edit Provisioned User Details
              </h2>
              <button onClick={() => setUserToEdit(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveEditUser}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Full Name</label>
                <input className="form-input" required value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Department</label>
                  <input className="form-input" value={editFormData.department} onChange={e => setEditFormData({ ...editFormData, department: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Year</label>
                  <select className="form-input" value={editFormData.year} onChange={e => setEditFormData({ ...editFormData, year: e.target.value })}>
                    <option value="">-- Select Year --</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Employee ID / Roll No</label>
                  <input className="form-input" value={editFormData.employeeId || editFormData.studentId} onChange={e => setEditFormData({ ...editFormData, employeeId: e.target.value, studentId: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Role</label>
                  <select className="form-input" value={editFormData.role} onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}>
                    <option value="teacher">Teacher</option>
                    <option value="invigilator">Invigilator</option>
                    <option value="student">Student</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setUserToEdit(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: CONFIRM BULK REMOVE SELECTED ───────────────────────────────── */}
      {showBulkRemoveSelectedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-primary)', border: '1px solid #ef4444', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#ef4444' }}>
              <AlertCircle size={28} />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>Confirm Bulk Remove Selected Users?</h2>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1rem' }}>
              You are about to remove access for <strong style={{ color: '#ef4444' }}>{selectedUserIds.length}</strong> selected user accounts:
            </p>

            <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.5rem', border: '1px solid rgba(239,68,68,0.2)' }}>
              {usersList.filter(u => selectedUserIds.includes(u._id)).map(u => (
                <div key={u._id} style={{ fontSize: '0.85rem', padding: '0.25rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{u.name}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>{u.department || 'BCA'} · {u.email}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowBulkRemoveSelectedModal(false)}>Cancel</button>
              <button className="btn" onClick={handleConfirmBulkRemoveSelected} disabled={submitting} style={{ background: '#ef4444', color: '#fff', fontWeight: 800 }}>
                {submitting ? 'Removing Users...' : `Confirm Remove (${selectedUserIds.length}) Users`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: CONFIRM BULK REMOVE MATCHING ───────────────────────────────── */}
      {showBulkRemoveMatchingModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-primary)', border: '1px solid #ef4444', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#ef4444' }}>
              <AlertCircle size={28} />
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>Remove All Matching Users?</h2>
            </div>

            <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-sm)', padding: '1rem', marginBottom: '1.5rem', border: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Department: <strong style={{ color: 'var(--text-main)' }}>{userDepartmentFilter || 'All Departments'}</strong></div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Year: <strong style={{ color: 'var(--text-main)' }}>{userYearFilter || 'All Years'}</strong></div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ef4444', marginTop: '0.5rem' }}>
                Total Matching Users: {usersList.length}
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              This will deactivate access for all {usersList.length} matching users. Administrator accounts will be automatically preserved.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowBulkRemoveMatchingModal(false)}>Cancel</button>
              <button className="btn" onClick={handleConfirmBulkRemoveMatching} disabled={submitting} style={{ background: '#ef4444', color: '#fff', fontWeight: 800 }}>
                {submitting ? 'Removing...' : 'Confirm Remove All Matching Users'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 6: ADMIN RESET USER PASSWORD ─────────────────────────────────── */}
      {userToResetPass && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-primary)', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={18} color="var(--primary)" /> Reset Password
              </h2>
              <button onClick={() => setUserToResetPass(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleAdminResetPassword}>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                User: <strong style={{ color: 'var(--text-main)' }}>{userToResetPass.name}</strong> ({userToResetPass.email})
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-input"
                  required
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new password (min 6 chars)..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setUserToResetPass(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 7: INVIGILATOR DETAILS & MANAGEMENT ─────────────────────────── */}
      {selectedInvigRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '750px', background: 'var(--bg-primary)', border: '1px solid rgba(6,182,212,0.3)', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                  Invigilator Management Details
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>{selectedInvigRecord.teacher.name}</h2>
              </div>
              <button onClick={() => setSelectedInvigRecord(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.85rem', marginBottom: '1.75rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Department</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '0.15rem' }}>{selectedInvigRecord.teacher.department || 'BCA'}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>ID / Roll No</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', marginTop: '0.15rem', color: 'var(--accent-amber)', fontFamily: 'monospace' }}>{selectedInvigRecord.teacher.employeeId || '24suca51'}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Email</div>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', marginTop: '0.15rem', color: 'var(--text-muted)', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>{selectedInvigRecord.teacher.email}</div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Role</div>
                <div style={{ marginTop: '0.15rem' }}>
                  <span style={{ padding: '0.15rem 0.55rem', borderRadius: '50px', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(6,182,212,0.2)', color: 'var(--accent-cyan)', display: 'inline-block' }}>
                    {selectedInvigRecord.teacher.role === 'teacher' ? 'TEACHER + INVIGILATOR' : 'INVIGILATOR'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="var(--accent-cyan)" />
                  Assigned Exams ({selectedInvigRecord.assignedExams.length})
                </h3>
                <button
                  onClick={() => setShowAssignExamModal(true)}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', fontSize: '0.85rem' }}
                >
                  <PlusCircle size={16} /> + Assign New Exam
                </button>
              </div>

              {selectedInvigRecord.assignedExams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <FileText size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>No exams assigned yet.</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>Click "+ Assign New Exam" above to assign an examination schedule to this invigilator.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selectedInvigRecord.assignedExams.map((ex) => (
                    <div key={ex._id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>{ex.title}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Subject: <strong>{ex.subject}</strong></div>
                        </div>
                        <span style={{ padding: '0.2rem 0.6rem', borderRadius: '50px', fontSize: '0.73rem', fontWeight: 800, background: 'rgba(99,102,241,0.2)', color: 'var(--primary)' }}>
                          {ex.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.83rem', color: 'var(--text-muted)', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                        <span><Calendar size={13} style={{ marginRight: '0.25rem' }} />{ex.examDate}</span>
                        <span><Clock size={13} style={{ marginRight: '0.25rem' }} />{ex.startTime} – {ex.endTime} ({ex.duration} mins)</span>
                        <span><MapPin size={13} style={{ marginRight: '0.25rem' }} />Venue: <strong style={{ color: 'var(--accent-amber)' }}>{ex.venue || 'Room 204'}</strong></span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                          onClick={() => {
                            setEditingAssignmentExam(ex);
                            setEditAssignData({ venue: ex.venue || 'Room 204', instructions: 'Report 15 minutes before exam start.' });
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          <Edit3 size={14} /> Edit Assignment
                        </button>
                        <button
                          onClick={() => handleRemoveAssignment(ex._id, ex.title)}
                          className="btn"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          <Trash2 size={14} /> Remove Assignment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn"
                onClick={() => setUserToRemove(selectedInvigRecord.teacher)}
                style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <UserX size={15} /> Remove User Account
              </button>
              <button className="btn btn-secondary" onClick={() => setSelectedInvigRecord(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 8: ASSIGN NEW EXAM TO INVIGILATOR ────────────────────────────────────────── */}
      {showAssignExamModal && selectedInvigRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '520px', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={18} color="var(--accent-cyan)" /> Assign Invigilation
              </h2>
              <button onClick={() => setShowAssignExamModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignExamToInvigilator}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Invigilator</label>
                <input className="form-input" disabled value={`${selectedInvigRecord.teacher.name} (${selectedInvigRecord.teacher.department || 'BCA'})`} />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Select Exam *</label>
                <select
                  className="form-input"
                  required
                  value={assignExamData.examId}
                  onChange={e => setAssignExamData({ ...assignExamData, examId: e.target.value })}
                >
                  <option value="">-- Choose Administrator Exam --</option>
                  {exams.map(ex => (
                    <option key={ex._id} value={ex._id}>
                      {ex.title} ({ex.subject} · {ex.examDate} · {ex.startTime}–{ex.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Venue / Room</label>
                <input
                  className="form-input"
                  value={assignExamData.venue}
                  onChange={e => setAssignExamData({ ...assignExamData, venue: e.target.value })}
                  placeholder="e.g. Room 204 (Main Academic Block)"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Additional Instructions</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={assignExamData.instructions}
                  onChange={e => setAssignExamData({ ...assignExamData, instructions: e.target.value })}
                  placeholder="e.g. Report 15 minutes before exam start time..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignExamModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Assigning...' : 'Assign Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 9: EDIT INVIGILATION ASSIGNMENT ────────────────────────────────────────── */}
      {editingAssignmentExam && selectedInvigRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Edit Invigilation Assignment</h2>
              <button onClick={() => setEditingAssignmentExam(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateAssignment}>
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label className="form-label">Invigilator</label>
                <input className="form-input" disabled value={selectedInvigRecord.teacher.name} />
              </div>

              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label className="form-label">Exam (Read Only)</label>
                <input className="form-input" disabled value={`${editingAssignmentExam.title} (${editingAssignmentExam.subject})`} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Exam Date</label>
                  <input className="form-input" disabled value={editingAssignmentExam.examDate} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Time Window</label>
                  <input className="form-input" disabled value={`${editingAssignmentExam.startTime}–${editingAssignmentExam.endTime}`} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label className="form-label">Venue / Room</label>
                <input
                  className="form-input"
                  value={editAssignData.venue}
                  onChange={e => setEditAssignData({ ...editAssignData, venue: e.target.value })}
                  placeholder="Room 204"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Instructions</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={editAssignData.instructions}
                  onChange={e => setEditAssignData({ ...editAssignData, instructions: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingAssignmentExam(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 10: QUESTION PAPERS VIEW ────────────────────────────────────── */}
      {qpModalExam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '700px', background: 'var(--bg-primary)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.2rem' }}>Question Papers</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{qpModalExam.title} · {qpModalExam.subject}</p>
              </div>
              <button onClick={() => setQpModalExam(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={20} />
              </button>
            </div>

            {qpModalLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>
            ) : qpModalPapers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                <FileText size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p>No question papers have been submitted for this exam yet.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>Teachers can create or upload a question paper by selecting this exam.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {qpModalPapers.map(qp => {
                  const statusColor = { draft: 'var(--accent-amber)', submitted: 'var(--primary)', published: 'var(--accent-emerald)' }[qp.status] || 'var(--text-muted)';
                  const statusBg   = { draft: 'rgba(245,158,11,0.15)', submitted: 'rgba(99,102,241,0.15)', published: 'rgba(16,185,129,0.15)' }[qp.status] || 'rgba(255,255,255,0.07)';
                  return (
                    <div key={qp._id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <span style={{ padding: '0.15rem 0.55rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 800, background: qp.type === 'created' ? 'rgba(6,182,212,0.12)' : 'rgba(139,92,246,0.12)', color: qp.type === 'created' ? 'var(--accent-cyan)' : '#a78bfa' }}>
                              {qp.type === 'created' ? 'CREATED' : 'UPLOADED'}
                            </span>
                            <span style={{ padding: '0.15rem 0.55rem', borderRadius: '50px', fontSize: '0.7rem', fontWeight: 800, background: statusBg, color: statusColor }}>
                              {qp.status.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '1rem' }}>{qp.title || 'Untitled'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.83rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        <span><strong style={{ color: 'var(--text-main)' }}>Teacher:</strong> {qp.createdBy?.name || '—'} ({qp.createdBy?.department || 'No Dept'})</span>
                        {qp.type === 'created' && <span><strong style={{ color: 'var(--text-main)' }}>Questions:</strong> {qp.totalQuestions ?? 0}</span>}
                        {qp.type === 'created' && <span><strong style={{ color: 'var(--text-main)' }}>Marks:</strong> {qp.totalMarks}</span>}
                        {qp.type === 'uploaded' && qp.uploadedFile && <span><strong style={{ color: 'var(--text-main)' }}>File:</strong> {qp.uploadedFile.originalName}</span>}
                        <span><strong style={{ color: 'var(--text-main)' }}>Submitted:</strong> {new Date(qp.updatedAt || qp.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 11: CREATE DEPARTMENT ────────────────────────────────────────── */}
      {showAddDeptModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-primary)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>Create New Department</h2>
            <form onSubmit={handleCreateDepartment}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Department Name *</label>
                <input type="text" className="form-input" required value={deptFormData.name} onChange={e => setDeptFormData({ ...deptFormData, name: e.target.value })} placeholder="e.g. Computer Science & Engineering" />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Department Code *</label>
                <input type="text" className="form-input" required value={deptFormData.code} onChange={e => setDeptFormData({ ...deptFormData, code: e.target.value })} placeholder="e.g. CSE, BCA" />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={deptFormData.description} onChange={e => setDeptFormData({ ...deptFormData, description: e.target.value })} placeholder="Brief department description..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddDeptModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollegeAdminDashboard;
