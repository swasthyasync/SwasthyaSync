// packages/api/src/controllers/appointmentController.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabaseClient';
import { sendMail, getAppointmentConfirmationEmail } from '../services/emailService';

// Controller for appointments (create, list, update)
export const appointmentController = {
  /**
   * Book an appointment.
   * Expected body:
   * {
   *   userEmail, appointmentType, patientName, patientPhone, patientEmail,
   *   patientAge, patientGender, serviceType, appointmentDate, appointmentTime,
   *   amount, paymentId, notes
   * }
   */
  async bookAppointment(req: Request, res: Response) {
    try {
      const {
        userEmail,
        appointmentType,
        patientName,
        patientPhone,
        patientEmail,
        patientAge,
        patientGender,
        serviceType,
        appointmentDate,
        appointmentTime,
        amount,
        paymentId,
        notes
      } = req.body;

      // basic validation
      const required = ['userEmail', 'patientName', 'serviceType', 'appointmentDate', 'appointmentTime', 'amount', 'paymentId'];
      for (const field of required) {
        if (!req.body[field]) {
          return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
        }
      }

      // Check conflicts (simple example)
      const { data: conflicts, error: conflictError } = await supabase
        .from('appointments')
        .select('id')
        .eq('appointment_date', appointmentDate)
        .eq('appointment_time', appointmentTime)
        .neq('status', 'cancelled');

      if (conflictError) {
        console.warn('Supabase conflict query error:', conflictError);
      }

      if (conflicts && conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'The selected time slot is already booked. Please choose another time.'
        });
      }

      // Insert appointment in Supabase
      const { data: appointment, error: insertError } = await supabase
        .from('appointments')
        .insert([{
          patient_user_email: userEmail || null,
          appointment_type: appointmentType || 'self',
          patient_name: patientName,
          patient_phone: patientPhone || null,
          patient_email: patientEmail || null,
          patient_age: patientAge || null,
          patient_gender: patientGender || null,
          service_type: serviceType,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          amount: amount,
          payment_id: paymentId,
          payment_status: 'paid',
          notes: notes || null,
          status: 'confirmed',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError || !appointment) {
        console.error('Failed to create appointment:', insertError);
        return res.status(500).json({ success: false, error: 'Failed to create appointment' });
      }

      // send confirmation email to patient (optional, if email provided)
      if (patientEmail) {
        try {
          const emailTemplate = getAppointmentConfirmationEmail({
            appointmentId: appointment.id ?? appointment.appointment_id ?? 'N/A',
            patientName,
            serviceType,
            appointmentDate,
            appointmentTime,
            amount,
            paymentId
          });

          // sendMail throws on failure
          await sendMail({
            to: patientEmail,
            subject: `Appointment Confirmed - ${appointment.id ?? 'Booking'}`,
            ...emailTemplate
          });

          console.log(`Appointment confirmation email sent to ${patientEmail}`);
        } catch (emailErr) {
          console.warn('Failed to send appointment email (non-fatal):', emailErr);
          // continue — don't break appointment creation if email fails
        }
      }

      return res.json({
        success: true,
        appointment,
        message: 'Appointment booked successfully'
      });
    } catch (err: any) {
      console.error('bookAppointment error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
    }
  },

  // Example: fetch appointments for a user by email (GET /appointments/:userEmail)
  async getAppointmentsForUser(req: Request, res: Response) {
    try {
      const userEmail = req.params.userEmail;
      if (!userEmail) {
        return res.status(400).json({ success: false, error: 'userEmail param is required' });
      }

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_user_email', userEmail)
        .order('appointment_date', { ascending: false });

      if (error) {
        console.error('Supabase fetch appointments error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
      }

      return res.json({ success: true, appointments: data ?? [] });
    } catch (err: any) {
      console.error('getAppointmentsForUser error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
    }
  },

  // Example: update status (PUT /appointments/:appointmentId/status)
  async updateStatus(req: Request, res: Response) {
    try {
      const appointmentId = req.params.appointmentId;
      const { status } = req.body;
      if (!appointmentId || !status) {
        return res.status(400).json({ success: false, error: 'appointmentId and status are required' });
      }

      const { data, error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update appointment status:', error);
        return res.status(500).json({ success: false, error: 'Failed to update status' });
      }

      return res.json({ success: true, appointment: data });
    } catch (err: any) {
      console.error('updateStatus error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
    }
  }
};

export default appointmentController;
