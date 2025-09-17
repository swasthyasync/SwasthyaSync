// packages/api/src/routes/appointments.ts
import express from 'express';
import appointmentController from '../controllers/appointmentController';
const router = express.Router();

router.post('/', appointmentController.bookAppointment);
router.get('/user/:userEmail', appointmentController.getAppointmentsForUser);
router.put('/:appointmentId/status', appointmentController.updateStatus);

export default router;
