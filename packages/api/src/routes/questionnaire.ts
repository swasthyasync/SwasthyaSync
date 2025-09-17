// packages/api/src/routes/questionnaire.ts
import express from 'express';
import { questionnaireController } from '../controllers/questionnaireController';

const router = express.Router();

// Submit questionnaire answers
router.post('/submit', questionnaireController.submitQuestionnaire);

// Get questionnaire results for a user
router.get('/:userId', questionnaireController.getQuestionnaire);

export default router;