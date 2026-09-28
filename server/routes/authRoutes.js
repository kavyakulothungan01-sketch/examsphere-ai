const express = require('express');
const router = express.Router();
const {
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  createManagedUser,
  getManagedUsers,
  getManagedUserById,
  updateManagedUser,
  removeTeacherRole,
  removeInvigilatorRole,
  removeManagedUser,
  bulkRemoveUsers,
  toggleUserStatus,
  adminResetPassword,
  getAdminStats,
  getActivityLogs,
  registerCollegeAdmin,
  registerPublicUser,
} = require('../controllers/authController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many password reset requests. Please try again after 15 minutes.' }
});

// ── Public Authentication Routes ─────────────────────────────
router.post('/login', loginUser);
router.post('/register', registerPublicUser);
router.post('/admin/register', registerCollegeAdmin);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.put('/reset-password/:token', resetPassword);

// ── Profile Routes (any authenticated user) ──────────────────
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);
router.get('/me', protect, getUserProfile);
router.put('/me/profile', protect, updateUserProfile);

// ── College Admin — Dashboard Stats & Logs ───────────────────
router.get('/admin/stats', protect, authorizeRoles('college_admin'), getAdminStats);
router.get('/admin/activity', protect, authorizeRoles('college_admin'), getActivityLogs);

// ── College Admin — User Management ─────────────────────────
router.post('/admin/create-user', protect, authorizeRoles('college_admin'), createManagedUser);
router.post('/admin/users/bulk-remove', protect, authorizeRoles('college_admin'), bulkRemoveUsers);
router.get('/admin/users', protect, authorizeRoles('college_admin'), getManagedUsers);
router.get('/admin/users/:id', protect, authorizeRoles('college_admin'), getManagedUserById);
router.put('/admin/users/:id', protect, authorizeRoles('college_admin'), updateManagedUser);
router.delete('/admin/users/:id', protect, authorizeRoles('college_admin'), removeManagedUser);
router.put('/admin/users/:id/toggle-status', protect, authorizeRoles('college_admin'), toggleUserStatus);
router.put('/admin/users/:id/reset-password', protect, authorizeRoles('college_admin'), adminResetPassword);
router.put('/admin/users/:id/remove-teacher-role', protect, authorizeRoles('college_admin'), removeTeacherRole);
router.put('/admin/users/:id/remove-invigilator-role', protect, authorizeRoles('college_admin'), removeInvigilatorRole);

module.exports = router;
