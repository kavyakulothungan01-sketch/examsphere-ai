import axios from 'axios';

// In local development Vite proxy forwards '/api' to localhost:5000.
// In production (Vercel), supports either VITE_SERVER_URL or VITE_API_URL:
// e.g. "https://examsphere-backend-lzp3.onrender.com" or "https://examsphere-backend-lzp3.onrender.com/api"
const rawServerUrl = (import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_API_URL || '').trim();
const cleanServerUrl = rawServerUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
const API_BASE_URL = cleanServerUrl ? `${cleanServerUrl}/api` : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach JWT Token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('examsphere_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor to handle unauthenticated responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('examsphere_token');
      localStorage.removeItem('examsphere_user');
    }
    return Promise.reject(error);
  }
);

// Auth & Profile Services
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  registerAdmin: (data) => api.post('/auth/admin/register', data),
  registerPublicUser: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  // Admin Management API Services
  createManagedUser: (data) => api.post('/auth/admin/create-user', data),
  getManagedUsers: (params) => api.get('/auth/admin/users', { params }),
  getManagedUserById: (id) => api.get(`/auth/admin/users/${id}`),
  updateManagedUser: (id, data) => api.put(`/auth/admin/users/${id}`, data),
  removeUser: (id) => api.delete(`/auth/admin/users/${id}`),
  removeTeacherRole: (id) => api.put(`/auth/admin/users/${id}/remove-teacher-role`),
  removeInvigilatorRole: (id) => api.put(`/auth/admin/users/${id}/remove-invigilator-role`),
  bulkRemoveUsers: (data) => api.post('/auth/admin/users/bulk-remove', data),
  toggleUserStatus: (id) => api.put(`/auth/admin/users/${id}/toggle-status`),
  adminResetPassword: (id, data) => api.put(`/auth/admin/users/${id}/reset-password`, data),
  getAdminStats: () => api.get('/auth/admin/stats'),
  getActivityLogs: (params) => api.get('/auth/admin/activity', { params }),
};

// Department Services
export const departmentAPI = {
  getDepartments: (params) => api.get('/departments', { params }),
  getDepartmentById: (id) => api.get(`/departments/${id}`),
  createDepartment: (data) => api.post('/departments', data),
  updateDepartment: (id, data) => api.put(`/departments/${id}`, data),
  toggleDepartmentStatus: (id) => api.put(`/departments/${id}/toggle-status`),
};

// Course Services
export const courseAPI = {
  getCourses: (params) => api.get('/courses', { params }),
  getCourseById: (id) => api.get(`/courses/${id}`),
  createCourse: (data) => api.post('/courses', data),
  updateCourse: (id, data) => api.put(`/courses/${id}`, data),
  toggleCourseStatus: (id) => api.put(`/courses/${id}/toggle-status`),
};

// Exam Services (Teacher & General)
export const examAPI = {
  getExams: () => api.get('/exams'),
  getAllExamsAdmin: (params) => api.get('/exams/admin/all', { params }),
  getAllExamsForTeacher: () => api.get('/exams/all-for-teachers'),
  getTeacherQPAssignments: () => api.get('/exams/teacher/qp-assignments'),
  getTeacherInvigilationDuties: () => api.get('/exams/teacher/invigilation-duties'),
  getExamById: (id) => api.get(`/exams/${id}`),
  createExam: (data) => api.post('/exams', data),
  updateExam: (id, data) => api.put(`/exams/${id}`, data),
  updateExamTotalMarks: (id, totalMarks) => api.put(`/exams/${id}/total-marks`, { totalMarks }),
  deleteExam: (id) => api.delete(`/exams/${id}`),
  publishExam: (id) => api.put(`/exams/${id}/publish`),
  lockExam: (id) => api.put(`/exams/${id}/lock`),
  assignInvigilator: (id, invigilatorId, venue, instructions) => api.put(`/exams/${id}/assign-invigilator`, { invigilatorId, venue, instructions }),
  assignQuestionPaperCreator: (id, teacherId) => api.put(`/exams/${id}/assign-creator`, { teacherId }),
  assignStudents: (id, studentIds) => api.put(`/exams/${id}/assign-students`, { studentIds }),
  getInvigilators: () => api.get('/exams/invigilators'),
  getInvigilatorsDirectory: (params) => api.get('/exams/invigilators-directory', { params }),
  getEligibleStudents: (params) => api.get('/exams/students/eligible', { params }),
  downloadQuestionPaper: (id) => api.get(`/exams/${id}/question-paper`, { responseType: 'blob' }),
};

// Question Paper Services (Teacher creates/uploads, Admin views)
export const questionPaperAPI = {
  // Teacher — create structured question paper
  createQuestionPaper: (data) => api.post('/question-papers', data),
  // Teacher — link an uploaded file as a question paper
  linkUploadedQuestionPaper: (data) => api.post('/question-papers/upload-link', data),
  // Teacher — get own question papers
  getMyQuestionPapers: () => api.get('/question-papers/my'),
  // Get a single QP by ID
  getQuestionPaperById: (id) => api.get(`/question-papers/${id}`),
  // Teacher — update own draft QP
  updateQuestionPaper: (id, data) => api.put(`/question-papers/${id}`, data),
  // Teacher — submit a draft QP
  submitQuestionPaper: (id) => api.post(`/question-papers/${id}/submit`),
  // Admin — get all QPs for a specific exam
  getExamQuestionPapers: (examId) => api.get(`/question-papers/exam/${examId}`),
  // Admin - review QP
  reviewQuestionPaper: (id, data) => api.post(`/question-papers/${id}/review`, data),
  // Teacher - extract text using AI from uploaded paper
  extractPaper: (id) => api.post(`/question-papers/${id}/extract`),
};

// Invigilator Services (Conductor Workflow)
export const invigilatorAPI = {
  getAssignedExams: () => api.get('/invigilator/exams'),
  getExamStudents: (examId) => api.get(`/invigilator/exams/${examId}/students`),
  markAttendance: (examId, studentId, status) => api.post(`/invigilator/exams/${examId}/attendance`, { studentId, status }),
  grantStudentAccess: (examId, studentId) => api.post(`/invigilator/exams/${examId}/access`, { studentId }),
  getExamMonitoring: (examId) => api.get(`/invigilator/exams/${examId}/monitor`),
  recordTechnicalAssistance: (examId, data) => api.post(`/invigilator/exams/${examId}/technical-assistance`, data),
  pauseStudentExam: (examId, studentId, reason) => api.post(`/invigilator/exams/${examId}/pause-student`, { studentId, reason }),
  resumeStudentExam: (examId, studentId) => api.post(`/invigilator/exams/${examId}/resume-student`, { studentId }),
  closeStudentExam: (examId, studentId, reason) => api.post(`/invigilator/exams/${examId}/close-student`, { studentId, reason }),
  getExamReport: (examId) => api.get(`/invigilator/exams/${examId}/report`),
  getExamQuestionPaper: (examId) => api.get(`/invigilator/exams/${examId}/question-paper`),
};

// File Upload Services
export const uploadAPI = {
  uploadPaper: (formData) =>
    api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  getUploadedFiles: () => api.get('/upload/files'),
};

// Student Exam Services
export const studentAPI = {
  getStudentExams: () => api.get('/student/exams'),
  startExam: (examId) => api.post(`/student/start/${examId}`),
  saveAnswers: (examId, data) => api.post(`/student/save-answers/${examId}`, data),
  submitExam: (examId, data) => api.post(`/student/submit/${examId}`, data),
};

// Accessibility Services
export const accessibilityAPI = {
  classifyCommand: (speech) => api.post('/accessibility/classify-command', { speech }),
};

export default api;
