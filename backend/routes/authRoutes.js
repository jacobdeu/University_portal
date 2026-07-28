import express from 'express';
import { loginSchool, createSchoolAccount } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/login', loginSchool);
router.post('/register-school', verifyToken(['super_admin']),createSchoolAccount);

export default router;
