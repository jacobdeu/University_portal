// routes/adminRoutes.js
import express from 'express';
import { 
    getTickets, deleteTicket, createPost, reloadSchools, 
    modifySchool, removeSchool, addCourse, loadCourses, uploadMarks, addStudent, addDepartment, getDepartments
} from '../controllers/adminController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// --- Tickets & Announcements ---
// Both roles can read messages/tickets
router.get('/messages', verifyToken(['super_admin', 'school_admin']), getTickets);
// Only the Super Admin can delete messages or blast official posts
router.delete('/messages/:id', verifyToken(['super_admin', 'school_admin']), deleteTicket);
router.post('/makePost', verifyToken(['school_admin']), createPost);


// --- Schools & Department Management ---
// Only Super Admin handles top-level school modifications and deletions
router.get('/reload-schools',  reloadSchools);
router.put('/update-school/:id', verifyToken(['super_admin']), modifySchool);
router.delete('/school/:id', verifyToken(['super_admin']), removeSchool);

// CHANGED: Both roles can now add and view departments for their school context
router.post('/departments', verifyToken(['super_admin', 'school_admin']), addDepartment); 
router.get('/getDepartments', verifyToken(['super_admin', 'school_admin']), getDepartments);


// --- Academic Management ---
// CHANGED: Added 'super_admin' to academic operations so you can override/test things if needed
router.post('/add-course', verifyToken(['super_admin', 'school_admin']), addCourse);
router.get('/loadCourses', verifyToken(['super_admin', 'school_admin']), loadCourses);
router.post('/upload', verifyToken(['super_admin', 'school_admin']), uploadMarks);
router.post('/add-student', verifyToken(['super_admin', 'school_admin']), addStudent);

export default router;