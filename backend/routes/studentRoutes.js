import express from 'express';
import { getResult, getGPA, submitTicket, getNews } from '../controllers/studentController.js';

const router = express.Router();

router.get('/result', getResult);
router.get('/gpa', getGPA);
router.post('/submit-ticket', submitTicket);
router.get('/news', getNews);

export default router; 