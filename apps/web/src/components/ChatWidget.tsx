// apps/web/src/components/ChatWidget.tsx
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import websocketService from '../utils/websocket';

type Thread = {
  id: string;
  title?: string | null;
  patient_id?: string | null;
  practitioner_id?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type Message = {
  id: string;
  thread_id: string;
  sender_id?: string | null;
  content: string;
  metadata?: any;
  is_read?: boolean;
  created_at?: string;
  isBot?: boolean;
  senderName?: string;
  senderRole?: string;
};

type User = {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
};

const ChatWidget: React.FC<{ 
  initialThreadId?: string;
  isPractitionerView?: boolean;
}> = ({ initialThreadId, isPractitionerView = false }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [isConnectingToPractitioner, setIsConnectingToPractitioner] = useState(false);
  
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const realtimeRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Add this right after the useState declarations in ChatWidget
useEffect(() => {
  console.log('[ChatWidget] Current userId:', userId);
  console.log('[ChatWidget] Current user:', currentUser);
  console.log('[ChatWidget] Selected thread:', selectedThread);
}, [userId, currentUser, selectedThread]);

// ADD THIS NEW useEffect RIGHT HERE - After the debugging useEffect
useEffect(() => {
  // Show quick actions for new threads or threads with only welcome message
  if (selectedThread && messages.length <= 1) {
    setShowQuickActions(true);
  }
}, [selectedThread, messages.length]);
  // Quick action buttons for common queries
  const quickActions = [
    { id: 'prakriti', label: '🧘 About Prakriti', query: 'What is Prakriti and how does it work?' },
    { id: 'appointment', label: '📅 Book Appointment', query: 'How can I book an appointment?' },
    { id: 'diet', label: '🥗 Diet Tips', query: 'What diet should I follow for my constitution?' },
    { id: 'symptoms', label: '💊 Symptoms Help', query: 'I need help with my symptoms' },
    { id: 'practitioner', label: '👨‍⚕️ Talk to Practitioner', query: 'CONNECT_PRACTITIONER' }
  ];

  // AI Bot responses based on keywords
  const getBotResponse = async (message: string): Promise<string> => {
    const lowerMessage = message.toLowerCase();

    // Prakriti related
    if (lowerMessage.includes('prakriti') || lowerMessage.includes('constitution')) {
      return `Prakriti is your unique Ayurvedic constitution determined at birth. It consists of three doshas:

🔵 **Vata** (Air & Space): Governs movement, creativity, and communication
🔴 **Pitta** (Fire & Water): Controls digestion, metabolism, and transformation  
🟢 **Kapha** (Earth & Water): Manages structure, stability, and lubrication

Your Prakriti assessment helps determine:
• Personalized diet recommendations
• Suitable lifestyle practices
• Optimal exercise routines
• Preventive health measures

Would you like to take the Prakriti assessment or learn more about a specific dosha?`;
    }

    // Appointment booking
    if (lowerMessage.includes('appointment') || lowerMessage.includes('book') || lowerMessage.includes('consultation')) {
      return `I can help you book an appointment! Here's how:

📅 **Booking Options:**
1. Click on "Book Appointment" in your dashboard
2. Choose your preferred practitioner
3. Select date and time
4. Describe your health concerns

**Available Consultation Types:**
• Initial Prakriti Assessment (60 mins)
• Follow-up Consultation (30 mins)
• Diet & Lifestyle Planning (45 mins)
• Therapy Sessions (varies)

Our practitioners are available Mon-Sat, 9 AM - 6 PM.

Would you like me to help you book an appointment now?`;
    }

    // Diet recommendations
    if (lowerMessage.includes('diet') || lowerMessage.includes('food') || lowerMessage.includes('eat')) {
      const userPrakriti = await getUserPrakriti();
      if (userPrakriti) {
        return getDietRecommendations(userPrakriti);
      }
      return `For personalized diet recommendations, I need to know your Prakriti type first. 

**General Ayurvedic Diet Principles:**
• Eat freshly cooked, warm meals
• Follow regular meal times
• Avoid incompatible food combinations
• Drink warm water throughout the day
• Eat your largest meal at lunch

Please complete your Prakriti assessment for personalized recommendations. Would you like to start now?`;
    }

    // Symptoms and health concerns
    if (lowerMessage.includes('symptom') || lowerMessage.includes('pain') || lowerMessage.includes('sick') || lowerMessage.includes('health')) {
      return `I understand you're experiencing health concerns. While I can provide general Ayurvedic guidance, it's important to consult with our practitioners for proper diagnosis and treatment.

**How I Can Help:**
• Explain Ayurvedic perspective on symptoms
• Suggest general lifestyle modifications
• Connect you with a practitioner
• Provide preventive health tips

**For immediate assistance:**
Would you like to describe your symptoms so I can connect you with the right practitioner?

⚠️ For emergencies, please contact emergency services immediately.`;
    }

    // Medications and treatments
    if (lowerMessage.includes('medicine') || lowerMessage.includes('treatment') || lowerMessage.includes('therapy')) {
      return `Ayurvedic treatments are personalized based on your unique constitution and current imbalances.

**Common Ayurvedic Therapies:**
• **Panchakarma**: Detoxification procedures
• **Herbal Medicine**: Natural formulations
• **Yoga & Meditation**: Mind-body practices
• **Abhyanga**: Therapeutic oil massage
• **Dietary Therapy**: Customized nutrition plans

All treatments should be prescribed by qualified practitioners after proper assessment.

Would you like to schedule a consultation to discuss treatment options?`;
    }

    // Mental health
    if (lowerMessage.includes('stress') || lowerMessage.includes('anxiety') || lowerMessage.includes('depression') || lowerMessage.includes('mental')) {
      return `Mental wellness is integral to Ayurvedic health. I'm here to support you.

**Ayurvedic Approach to Mental Health:**
• Mind-body balance through daily routines
• Meditation and breathing exercises
• Herbal support for emotional balance
• Lifestyle modifications
• Yoga for stress relief

**Immediate Practices:**
🧘 Try deep breathing: Inhale for 4, hold for 4, exhale for 6
🌅 Maintain regular sleep schedule
🚶 Take daily nature walks
📿 Practice gratitude meditation

Would you like to connect with a practitioner specializing in mental wellness?`;
    }

    // Default response
    return `I'm here to help you with your Ayurvedic health journey! I can assist with:

• Understanding your Prakriti (constitution)
• Booking appointments with practitioners
• Diet and lifestyle recommendations
• General health queries
• Connecting you with specialists

What would you like to know more about?`;
  };

  // Get user's Prakriti from database
  const getUserPrakriti = async (): Promise<string | null> => {
    if (!userId) return null;
    try {
      const { data } = await supabase
        .from('questionnaire_answers')
        .select('dominant')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      return data?.dominant || null;
    } catch (error) {
      console.error('Error fetching Prakriti:', error);
      return null;
    }
  };

  // Get diet recommendations based on Prakriti
  const getDietRecommendations = (prakriti: string): string => {
    const recommendations: Record<string, string> = {
      vata: `**Diet for Vata Constitution:**

✅ **Favor:**
• Warm, cooked, moist foods
• Sweet, sour, and salty tastes
• Cooked vegetables, whole grains
• Warm milk, ghee, oils
• Regular meal times

❌ **Avoid:**
• Cold, dry, raw foods
• Bitter, astringent tastes
• Excessive beans, cruciferous vegetables
• Cold drinks, ice cream
• Irregular eating

**Best Practices:**
• Eat in a calm environment
• Include healthy fats
• Stay hydrated with warm liquids`,

      pitta: `**Diet for Pitta Constitution:**

✅ **Favor:**
• Cool, refreshing foods
• Sweet, bitter, and astringent tastes
• Fresh fruits, vegetables
• Cooling herbs like coriander, fennel
• Moderate portions

❌ **Avoid:**
• Hot, spicy, oily foods
• Sour, salty, pungent tastes
• Alcohol, caffeine
• Red meat, fried foods
• Eating when angry

**Best Practices:**
• Eat at regular times
• Include cooling foods
• Avoid overheating`,

      kapha: `**Diet for Kapha Constitution:**

✅ **Favor:**
• Light, warm, spicy foods
• Pungent, bitter, astringent tastes
• Cooked vegetables, legumes
• Warming spices
• Light breakfast

❌ **Avoid:**
• Heavy, cold, oily foods
• Sweet, sour, salty tastes
• Dairy, wheat, sugar
• Excessive water with meals
• Late-night eating

**Best Practices:**
• Eat largest meal at lunch
• Include metabolism-boosting spices
• Stay active after meals`
    };

    return recommendations[prakriti.toLowerCase()] || getDietRecommendations('vata');
  };

  // Load current user
  useEffect(() => {
    const init = async () => {
  try {
    console.log('[ChatWidget] Initializing user...');
    
    // Initialize WebSocket connection
    websocketService.connect();
    
    // First try Supabase auth
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user?.id) {
      console.log('[ChatWidget] Found user from Supabase:', data.user.id);
      setUserId(data.user.id);
          
          // Get user details from database
          const { data: userData } = await supabase
            .from('users')
            .select('id, first_name, last_name, role')
            .eq('id', data.user.id)
            .single();
          
          if (userData) {
            setCurrentUser(userData);
            console.log('[ChatWidget] User details loaded:', userData.first_name, userData.last_name);
          }
          return; // Success, exit early
        }
        
        // Method 2: Fallback to localStorage (same as Dashboard does)
        const storedUserJson = localStorage.getItem('user');
    if (storedUserJson) {
      try {
        const parsed = JSON.parse(storedUserJson);
        if (parsed?.id && parsed?.email) {
          console.log('[ChatWidget] Creating Supabase session for:', parsed.email);
          
          // Create a Supabase session using the stored user data
          // This is a workaround - ideally you'd have the password or use a different method
          const { data: authData, error: authError } = await supabase.auth.signInAnonymously({
            options: {
              data: {
                user_id: parsed.id,
                email: parsed.email,
                role: parsed.role
              }
            }
          });
          
          if (!authError && authData.user) {
            setUserId(parsed.id);
            setCurrentUser({
              id: parsed.id,
              first_name: parsed.first_name,
              last_name: parsed.last_name,
              role: parsed.role || 'patient'
            });
            return;
          }
        }
      } catch (e) {
        console.error('[ChatWidget] Failed to create Supabase session:', e);
      }
    }
    
    console.warn('[ChatWidget] No user found - chat will be disabled');
  } catch (e) {
    console.error('[ChatWidget] getUser failed', e);
  }
};
    
    init();
    
    // Cleanup WebSocket connection on unmount
    return () => {
      websocketService.disconnect();
    };
  }, []);

  // Load threads
  useEffect(() => {
    if (!userId) return;

    const loadThreads = async () => {
      try {
        let query = supabase
          .from('chat_threads')
          .select('*')
          .order('updated_at', { ascending: false });

        // Filter based on user role
        if (isPractitionerView && currentUser?.role === 'practitioner') {
          query = query.eq('practitioner_id', userId);
        } else {
          query = query.or(`patient_id.eq.${userId},practitioner_id.eq.${userId}`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('[ChatWidget] loadThreads error', error);
          return;
        }

        const typed = (data ?? []) as Thread[];
        setThreads(typed);

        // Select initial thread
        if (initialThreadId) {
          const thread = typed.find(t => t.id === initialThreadId);
          if (thread) setSelectedThread(thread);
        } else if (!selectedThread && typed.length > 0) {
          setSelectedThread(typed[0]);
        }
      } catch (e) {
        console.error('[ChatWidget] loadThreads catch', e);
      }
    };

    loadThreads();
  }, [userId, currentUser, isPractitionerView, initialThreadId]);

  // Load messages for selected thread
  useEffect(() => {
    if (!selectedThread) {
      setMessages([]);
      return;
    }
    
    let mounted = true;

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
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
          .eq('thread_id', selectedThread.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[ChatWidget] loadMessages error', error);
          return;
        }

        const formattedMessages = data?.map((msg: any) => ({
          ...msg,
          senderName: msg.sender ? `${msg.sender.first_name} ${msg.sender.last_name}` : 'Unknown',
          senderRole: msg.sender?.role || 'unknown',
          isBot: msg.metadata?.isBot || false
        })) || [];

        if (mounted) {
          setMessages(formattedMessages);
          setTimeout(() => messagesRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50);
        }
      } catch (e) {
        console.error('[ChatWidget] loadMessages catch', e);
      }
    };

    loadMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`chat:${selectedThread.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `thread_id=eq.${selectedThread.id}` 
        },
        async (payload: any) => {
          const newMsg = payload.new;
          
          // Get sender info
          const { data: senderData } = await supabase
            .from('users')
            .select('first_name, last_name, role')
            .eq('id', newMsg.sender_id)
            .single();

          const formattedMsg = {
            ...newMsg,
            senderName: senderData ? `${senderData.first_name} ${senderData.last_name}` : 'Unknown',
            senderRole: senderData?.role || 'unknown',
            isBot: newMsg.metadata?.isBot || false
          };

          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, formattedMsg];
          });
          
          setTimeout(() => messagesRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 50);
        }
      )
      .subscribe();

    realtimeRef.current = channel;

    return () => {
      mounted = false;
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
  }, [selectedThread]);

  // Send message
  const sendMessage = async (content?: string) => {
  const messageContent = content || input.trim();
  if (!selectedThread || !userId || !messageContent) return;

  const payload = {
    thread_id: selectedThread.id,
    sender_id: userId,
    content: messageContent,
    metadata: { isBot: false },
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('chat_messages').insert(payload);
    if (error) {
      console.error('[ChatWidget] sendMessage error', error);
      return;
    }

    setInput('');
     

      // Check if it's a request to connect with practitioner
      if (messageContent === 'CONNECT_PRACTITIONER' || messageContent.toLowerCase().includes('talk to practitioner')) {
      await connectToPractitioner();
    } else if (!selectedThread.practitioner_id) {
      // If no practitioner assigned, provide bot response
      await sendBotResponse(messageContent);
    }
  } catch (e) {
    console.error('[ChatWidget] sendMessage catch', e);
  }
};


  // Send bot response
  const sendBotResponse = async (userMessage: string) => {
    setIsTyping(true);
    
    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const botResponse = await getBotResponse(userMessage);
    
    const botPayload = {
      thread_id: selectedThread!.id,
      sender_id: userId,
      content: botResponse,
      metadata: { isBot: true, botName: 'Swastya AI Assistant' },
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('chat_messages').insert(botPayload);
    } catch (e) {
      console.error('[ChatWidget] sendBotResponse error', e);
    }

    setIsTyping(false);
  };

  // Connect to practitioner
  const connectToPractitioner = async () => {
    if (!selectedThread || !userId) return;

    setIsConnectingToPractitioner(true);

    try {
      // Find available practitioner
      const { data: practitioners } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('role', 'practitioner')
        .eq('is_active', true)
        .limit(1);

      if (practitioners && practitioners.length > 0) {
        const practitioner = practitioners[0];
        
        // Update thread with practitioner
        await supabase
          .from('chat_threads')
          .update({ 
            practitioner_id: practitioner.id,
            title: `Consultation with Dr. ${practitioner.first_name} ${practitioner.last_name}`
          })
          .eq('id', selectedThread.id);

        // Send notification message
        const notificationPayload = {
          thread_id: selectedThread.id,
          sender_id: userId,
          content: `🔗 Connected with Dr. ${practitioner.first_name} ${practitioner.last_name}. They will respond to your queries soon.`,
          metadata: { isBot: true, isNotification: true },
          created_at: new Date().toISOString(),
        };

        await supabase.from('chat_messages').insert(notificationPayload);
        
        // Reload thread
        const { data: updatedThread } = await supabase
          .from('chat_threads')
          .select('*')
          .eq('id', selectedThread.id)
          .single();
        
        if (updatedThread) {
          setSelectedThread(updatedThread);
        }
      } else {
        // No practitioners available
        const notificationPayload = {
          thread_id: selectedThread.id,
          sender_id: userId,
          content: `⏰ All practitioners are currently busy. Your message has been queued and you'll receive a response soon.`,
          metadata: { isBot: true, isNotification: true },
          created_at: new Date().toISOString(),
        };

        await supabase.from('chat_messages').insert(notificationPayload);
      }
    } catch (e) {
      console.error('[ChatWidget] connectToPractitioner error', e);
    } finally {
      setIsConnectingToPractitioner(false);
    }
  };

  // Create new thread
  const createThreadAndSend = async (title?: string) => {

    // Ensure we have a user ID (try to get it again if not)
    let currentUserId = userId;
    
    if (!currentUserId) {
      console.log('[ChatWidget] No userId, attempting to get from localStorage...');
      
      // Try localStorage
      const storedUserJson = localStorage.getItem('user');
      if (storedUserJson) {
        try {
          const parsed = JSON.parse(storedUserJson);
          if (parsed?.id) {
            currentUserId = parsed.id;
            setUserId(parsed.id); // Update state for next time
            setCurrentUser({
              id: parsed.id,
              first_name: parsed.first_name,
              last_name: parsed.last_name,
              role: parsed.role || 'patient'
            });
          }
        } catch (e) {
          console.error('[ChatWidget] Failed to parse user from localStorage:', e);
        }
      }
      
      // Still no user? Try Supabase one more time
      if (!currentUserId) {
        const { data } = await supabase.auth.getUser();
        if (data?.user?.id) {
          currentUserId = data.user.id;
          setUserId(data.user.id);
        }
      }
      
      // Final check
      if (!currentUserId) {
        console.error('[ChatWidget] Cannot create thread - no user ID available');
        alert('Please log in to start a conversation');
        return;
      }
    }
    
    console.log('[ChatWidget] Creating new thread for user:', currentUserId);
    
     try {
    const insertPayload = {
      title: title || 'Health Consultation',
      patient_id: currentUserId,
      practitioner_id: null,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('[ChatWidget] Inserting thread:', insertPayload);
    
    const { data, error } = await supabase
      .from('chat_threads')
      .insert(insertPayload)
      .select()
      .single();
    
    if (error) {
      console.error('[ChatWidget] Supabase createThread error:', error);
      if (error.message.includes('permission') || error.message.includes('policy')) {
        alert('Permission denied. Please ensure you are logged in properly.');
      } else {
        alert(`Failed to create conversation: ${error.message}`);
      }
      return;
    }
    
      if (data) {
      console.log('[ChatWidget] Thread created successfully:', data.id);
      setThreads(prev => [data as Thread, ...prev]);
      setSelectedThread(data as Thread);
      
      // Reset quick actions to show them for new thread
      setShowQuickActions(true);

      // Send welcome message
      const welcomePayload = {
        thread_id: data.id,
        sender_id: currentUserId,
        content: `Welcome to Swastya Sync! 🙏\n\nI'm your AI health assistant, here to help you with:\n• Understanding Ayurvedic principles\n• Booking appointments\n• Diet and lifestyle guidance\n• Connecting with practitioners\n\nHow can I assist you today?`,
        metadata: { isBot: true, botName: 'Swastya AI Assistant' },
        is_read: false,
        created_at: new Date().toISOString(),
      };

      console.log('[ChatWidget] Sending welcome message...');
      
      const { error: msgError } = await supabase.from('chat_messages').insert(welcomePayload);
      if (msgError) {
        console.error('[ChatWidget] Welcome message error:', msgError);
      } else {
        console.log('[ChatWidget] Welcome message sent successfully');
      }
      
      // Clear messages array - it will be reloaded by useEffect
      setMessages([]);
    }
  } catch (error: any) {
    console.error('[ChatWidget] createThread failed:', error);
    alert('Unable to start conversation. Please try refreshing the page.');
  }
};


  // Handle quick action click
  const handleQuickAction = (action: typeof quickActions[0]) => {
  console.log('[ChatWidget] Handling quick action:', action.id);
  
  if (action.query === 'CONNECT_PRACTITIONER') {
    connectToPractitioner();
  } else {
    // Send the query as a message
    sendMessage(action.query);
  }
  
  // Only hide quick actions after they select a non-practitioner option
  if (action.id !== 'practitioner') {
    setTimeout(() => setShowQuickActions(false), 100);
  }
};

  // Widget UI
  return (
    <>
      {/* Floating button when collapsed */}
      {!isExpanded && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {threads.some(t => messages.some(m => !m.is_read && m.sender_id !== userId)) && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          )}
        </motion.button>
      )}

      {/* Expanded chat widget */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-t-2xl p-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">🕉️</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">
                    {selectedThread?.practitioner_id ? 'Medical Consultation' : 'Health Assistant'}
                  </h3>
                  <p className="text-amber-100 text-xs">
                    {isTyping ? 'Typing...' : selectedThread?.practitioner_id ? 'Connected to practitioner' : 'AI-powered support'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-white/80 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Thread selector for practitioner view */}
            {isPractitionerView && threads.length > 1 && (
              <div className="border-b p-2 bg-gray-50">
                <select
                  value={selectedThread?.id || ''}
                  onChange={(e) => {
                    const thread = threads.find(t => t.id === e.target.value);
                    if (thread) setSelectedThread(thread);
                  }}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  {threads.map(thread => (
                    <option key={thread.id} value={thread.id}>
                      {thread.title || `Thread ${thread.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Messages area */}
            <div 
              ref={messagesRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
            >
              {messages.length === 0 && !selectedThread && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Start a conversation to get health guidance</p>
                  <button
                    onClick={() => {
                      console.log('[ChatWidget] Start button clicked');
                      createThreadAndSend('Health Consultation');
                    }}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Start New Conversation
                  </button>
                </div>
              )}

              {messages.map((msg, idx) => (
  <motion.div
    key={msg.id}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.05 }}
    className={`flex ${msg.sender_id === userId && !msg.isBot ? 'justify-end' : 'justify-start'}`}
  >
    <div className={`max-w-[80%] shadow-lg ${
      msg.sender_id === userId && !msg.isBot
        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl rounded-br-sm border-l-4 border-amber-300'
        : msg.isBot
        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-800 rounded-2xl rounded-bl-sm border-l-4 border-blue-400 border'
        : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl rounded-bl-sm border-l-4 border-green-300'
    } px-4 py-3`}>
      {(msg.isBot || msg.sender_id !== userId) && (
        <div className={`flex items-center mb-2 ${
          msg.isBot ? 'text-blue-600' : 'text-white'
        }`}>
          <span className="text-sm font-bold">
            {msg.isBot ? '🤖 AI Assistant' : msg.senderRole === 'practitioner' ? `👨‍⚕️ Dr. ${msg.senderName}` : `👤 ${msg.senderName}`}
          </span>
        </div>
      )}
      
      <div className={`${
        msg.isBot ? 'text-gray-800' : 'text-white'
      } leading-relaxed`}>
        {/* Enhanced bot message formatting */}
        {msg.isBot ? (
          <div className="space-y-2">
            {msg.content.split('\n\n').map((paragraph, pIdx) => (
              <div key={pIdx}>
                {paragraph.split('\n').map((line, lIdx) => (
                  <div key={lIdx} className={`${
                    line.startsWith('**') ? 'font-bold text-blue-700 text-base mt-3 mb-2' :
                    line.startsWith('•') ? 'ml-4 text-gray-700 flex items-start' :
                    line.startsWith('✅') || line.startsWith('❌') ? 'ml-2 font-medium text-gray-800' :
                    line.startsWith('🔵') || line.startsWith('🔴') || line.startsWith('🟢') ? 'font-semibold text-gray-800 bg-white bg-opacity-50 rounded-lg p-2 my-1' :
                    'text-gray-700'
                  }`}>
                    {line.startsWith('•') && <span className="text-blue-500 mr-2 font-bold">•</span>}
                    <span className={line.includes('**') ? 'font-semibold' : ''}>{line.replace(/\*\*/g, '')}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
        )}
      </div>
      
      <div className={`text-xs mt-2 flex items-center justify-between ${
        msg.isBot ? 'text-gray-500' : 'text-white text-opacity-80'
      }`}>
        <span>{new Date(msg.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        {!msg.isBot && (
          <span className="ml-2">
            {msg.sender_id === userId ? '✓ Sent' : '📨 Received'}
          </span>
        )}
      </div>
    </div>
  </motion.div>
))}

{isTyping && (
  <div className="flex justify-start">
    <div className="bg-gradient-to-r from-purple-100 to-pink-100 border-l-4 border-purple-400 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
        <span className="text-sm font-medium text-purple-700">AI is thinking...</span>
      </div>
    </div>
  </div>
)}

{isConnectingToPractitioner && (
  <div className="text-center py-4">
    <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 rounded-xl border border-emerald-300 shadow-md">
      <svg className="animate-spin h-5 w-5 mr-3 text-emerald-600" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="font-semibold">Connecting to practitioner...</span>
    </div>
  </div>
)}
</div>

{/* Quick actions */}
{showQuickActions && selectedThread && messages.length <= 1 && (
  <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200">
    <p className="text-sm font-semibold text-amber-800 mb-3">✨ Quick actions:</p>
    <div className="flex flex-wrap gap-2">
      {quickActions.map(action => (
        <button
          key={action.id}
          onClick={() => {
            console.log('[ChatWidget] Quick action clicked:', action.label);
            handleQuickAction(action);
            // Hide quick actions after user selects one
            if (action.id !== 'practitioner') {
              setShowQuickActions(false);
            }
          }}
          className="px-3 py-2 bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 rounded-full text-sm font-medium text-amber-800 border border-amber-300 transition-all duration-200 transform hover:scale-105 shadow-sm"
        >
          {action.label}
        </button>
      ))}
    </div>
  </div>
)}

{/* Input area */}
<div className="p-4 bg-white border-t rounded-b-2xl">
  {!selectedThread ? (
    <button
      onClick={() => {
        console.log('[ChatWidget] Bottom button clicked');
        createThreadAndSend('Health Consultation');
      }}
      className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg border-2 border-blue-400"
    >
      🚀 Start New Conversation
    </button>
  ) : (
    <div className="flex space-x-2">
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
          }
        }}
        placeholder={selectedThread?.practitioner_id ? "Type your message..." : "Ask me anything about your health..."}
        className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-gray-50 focus:bg-white transition-all"
      />
      <button
        onClick={() => sendMessage()}
        disabled={!input.trim()}
        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-600 hover:to-amber-700 transition-all transform hover:scale-105 shadow-md"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  )}
</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;