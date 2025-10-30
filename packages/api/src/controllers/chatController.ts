// packages/api/src/controllers/chatController.ts
import { Request, Response } from 'express';
import { supabase } from '../db/supabaseClient';

export const chatController = {
  // Get all threads for a user
  async getThreads(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[chatController] getThreads for user:', user.id, 'role:', user.role);

      // Build query based on user role
      let query = supabase
        .from('chat_threads')
        .select('*');

      if (user.role === 'practitioner') {
        // Practitioners see threads assigned to them
        query = query.eq('practitioner_id', user.id);
      } else if (user.role === 'patient') {
        // Patients see their own threads
        query = query.eq('patient_id', user.id);
      } else if (user.role === 'admin') {
        // Admins see all threads (no additional filter)
      } else {
        // Default: user's threads
        query = query.or(`patient_id.eq.${user.id},practitioner_id.eq.${user.id}`);
      }

      // Add ordering
      query = query.order('updated_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('[chatController] getThreads error:', error);
        return res.status(500).json({ error: 'Failed to fetch threads', detail: error.message });
      }

      console.log('[chatController] Found threads:', data?.length || 0);
      return res.json({ success: true, threads: data || [] });
    } catch (err: any) {
      console.error('[chatController] getThreads catch:', err);
      return res.status(500).json({ error: 'Server error', detail: err.message });
    }
  },

  // Create a new thread
  async createThread(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[chatController] createThread for user:', user.id);

      const { title, practitioner_id } = req.body;

      const payload: any = {
        title: title || 'Health Consultation',
        patient_id: user.id,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (practitioner_id) {
        payload.practitioner_id = practitioner_id;
      }

      const { data, error } = await supabase
        .from('chat_threads')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[chatController] createThread insert error:', error);
        return res.status(500).json({ error: 'Failed to create thread', detail: error.message });
      }

      console.log('[chatController] Thread created:', data?.id);

      // Send welcome message
      if (data) {
        const welcomeMessage = {
          thread_id: data.id,
          sender_id: user.id,
          content: `Welcome to Swastya Sync! 🙏\n\nI'm your AI health assistant, here to help you with:\n• Understanding Ayurvedic principles\n• Booking appointments\n• Diet and lifestyle guidance\n• Connecting with practitioners\n\nHow can I assist you today?`,
          metadata: { isBot: true, botName: 'Swastya AI Assistant' },
          is_read: false,
          created_at: new Date().toISOString()
        };

        const { error: msgError } = await supabase.from('chat_messages').insert(welcomeMessage);
        if (msgError) {
          console.error('[chatController] Welcome message error:', msgError);
          // Don't fail the thread creation if welcome message fails
        }
      }

      return res.json({ success: true, thread: data });
    } catch (err: any) {
      console.error('[chatController] createThread catch:', err);
      return res.status(500).json({ error: 'Server error', detail: err.message });
    }
  },

  // Get messages for a thread
  async getMessages(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { threadId } = req.params;
      console.log('[chatController] getMessages for thread:', threadId);

      // Verify user has access to this thread
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .single();

      if (threadError || !thread) {
        console.error('[chatController] Thread not found:', threadError);
        return res.status(404).json({ error: 'Thread not found' });
      }

      // Check if user has access
      const hasAccess =
        thread.patient_id === user.id ||
        thread.practitioner_id === user.id ||
        user.role === 'admin';

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get messages with sender info
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:users!chat_messages_sender_id_fkey(
            id,
            first_name,
            last_name,
            role
          )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[chatController] getMessages error:', error);
        return res.status(500).json({ error: 'Failed to fetch messages', detail: error.message });
      }

      // Mark messages as read (those not sent by current user)
      if (messages && messages.length > 0) {
        const unreadMessageIds = messages
          .filter((m: any) => m.sender_id !== user.id && !m.is_read)
          .map((m: any) => m.id);

        if (unreadMessageIds.length > 0) {
          await supabase
            .from('chat_messages')
            .update({ is_read: true })
            .in('id', unreadMessageIds);
        }
      }

      console.log('[chatController] Found messages:', messages?.length || 0);
      return res.json({ success: true, messages: messages || [] });
    } catch (err: any) {
      console.error('[chatController] getMessages catch:', err);
      return res.status(500).json({ error: 'Server error', detail: err.message });
    }
  },

  // Send a message
  async createMessage(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { thread_id, content, metadata } = req.body;
      console.log('[chatController] createMessage for thread:', thread_id);

      if (!thread_id || !content) {
        return res.status(400).json({ error: 'thread_id and content are required' });
      }

      // Verify user has access to this thread
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', thread_id)
        .single();

      if (threadError || !thread) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      const hasAccess =
        thread.patient_id === user.id ||
        thread.practitioner_id === user.id ||
        user.role === 'admin';

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const payload = {
        thread_id,
        sender_id: user.id,
        content,
        metadata: metadata || {},
        is_read: false,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chat_messages')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[chatController] createMessage error:', error);
        return res.status(500).json({ error: 'Failed to send message', detail: error.message });
      }

      // Update thread's updated_at
      await supabase
        .from('chat_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', thread_id);

      console.log('[chatController] Message created:', data?.id);
      return res.json({ success: true, message: data });
    } catch (err: any) {
      console.error('[chatController] createMessage catch:', err);
      return res.status(500).json({ error: 'Server error', detail: err.message });
    }
  },

  // Assign practitioner to thread
  async assignPractitioner(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { threadId } = req.params;
      const { practitioner_id } = req.body;

      console.log('[chatController] assignPractitioner to thread:', threadId);

      // Only patients or admins can assign practitioners
      if (user.role !== 'patient' && user.role !== 'admin') {
        return res.status(403).json({ error: 'Only patients can request practitioner assignment' });
      }

      // Verify thread belongs to patient
      const { data: thread, error: threadError } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('id', threadId)
        .single();

      if (threadError || !thread) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      if (thread.patient_id !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Find available practitioner if not specified
      let assignedPractitionerId = practitioner_id;

      if (!assignedPractitionerId) {
        const { data: practitioners } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('role', 'practitioner')
          .eq('is_active', true)
          .limit(1);

        if (!practitioners || practitioners.length === 0) {
          return res.status(404).json({ error: 'No practitioners available' });
        }

        assignedPractitionerId = practitioners[0].id;
      }

      // Update thread
      const { error: updateError } = await supabase
        .from('chat_threads')
        .update({
          practitioner_id: assignedPractitionerId,
          title: thread.title || 'Medical Consultation',
          updated_at: new Date().toISOString()
        })
        .eq('id', threadId);

      if (updateError) {
        console.error('[chatController] assignPractitioner error:', updateError);
        return res.status(500).json({ error: 'Failed to assign practitioner', detail: updateError.message });
      }

      // Get practitioner details
      const { data: practitioner } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', assignedPractitionerId)
        .single();

      // Send notification message
      const notificationMessage = {
        thread_id: threadId,
        sender_id: user.id,
        content: `Connected with Dr. ${practitioner?.first_name} ${practitioner?.last_name}. They will respond to your queries soon.`,
        metadata: { isBot: true, isNotification: true },
        is_read: false,
        created_at: new Date().toISOString()
      };

      await supabase.from('chat_messages').insert(notificationMessage);

      console.log('[chatController] Practitioner assigned:', assignedPractitionerId);
      return res.json({
        success: true,
        practitioner_id: assignedPractitionerId,
        practitioner_name: `Dr. ${practitioner?.first_name} ${practitioner?.last_name}`
      });
    } catch (err: any) {
      console.error('[chatController] assignPractitioner catch:', err);
      return res.status(500).json({ error: 'Server error', detail: err.message });
    }
  },

  // Get unread message count
  async getUnreadCount(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log('[chatController] getUnreadCount for user:', user.id);

      // Get all user's threads
      let threadQuery = supabase
        .from('chat_threads')
        .select('id');

      if (user.role === 'practitioner') {
        threadQuery = threadQuery.eq('practitioner_id', user.id);
      } else {
        threadQuery = threadQuery.eq('patient_id', user.id);
      }

      const { data: threads, error: threadsError } = await threadQuery;

      if (threadsError) {
        console.error('[chatController] getUnreadCount threads error:', threadsError);
        return res.status(500).json({ error: 'Failed to get threads', detail: threadsError.message });
      }

      if (!threads || threads.length === 0) {
        return res.json({ success: true, unread_count: 0 });
      }

      const threadIds = threads.map((t: any) => t.id);

      // Count unread messages
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .in('thread_id', threadIds)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (error) {
        console.error('[chatController] getUnreadCount error:', error);
        return res.status(500).json({ error: 'Failed to get unread count', detail: error.message });
      }

      console.log('[chatController] Unread count:', count || 0);
      return res.json({ success: true, unread_count: count || 0 });
    } catch (err: any) {
      console.error('[chatController] getUnreadCount catch:', err);
      return res.status(500).json({ error: 'Server error', detail: err.message });
    }
  }
};

export default chatController;