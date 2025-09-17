// apps/web/src/utils/questions.ts

export interface QuestionOption {
  id: string;
  text: string;
  trait: 'vata' | 'pitta' | 'kapha';
  weight: number;
}

export interface Question {
  id: string;
  category: string;
  text: string;
  type: 'single' | 'multiple';
  options: QuestionOption[];
}

export const prakritiQuestions: Question[] = [
  // Body Frame & Build
  {
    id: 'q1',
    category: 'Physical',
    text: 'How would you describe your body frame?',
    type: 'single',
    options: [
      { id: 'q1_1', text: 'Thin, light, and narrow', trait: 'vata', weight: 1 },
      { id: 'q1_2', text: 'Medium build with good muscle definition', trait: 'pitta', weight: 1 },
      { id: 'q1_3', text: 'Large, broad, and well-developed', trait: 'kapha', weight: 1 }
    ]
  },
  {
    id: 'q2',
    category: 'Physical',
    text: 'How is your skin texture?',
    type: 'single',
    options: [
      { id: 'q2_1', text: 'Dry, rough, and thin', trait: 'vata', weight: 1 },
      { id: 'q2_2', text: 'Soft, warm with tendency to redness', trait: 'pitta', weight: 1 },
      { id: 'q2_3', text: 'Thick, smooth, and moist', trait: 'kapha', weight: 1 }
    ]
  },
  {
    id: 'q3',
    category: 'Physical',
    text: 'How would you describe your hair?',
    type: 'single',
    options: [
      { id: 'q3_1', text: 'Dry, brittle, and tends to be frizzy', trait: 'vata', weight: 1 },
      { id: 'q3_2', text: 'Fine, soft, tends toward early graying or thinning', trait: 'pitta', weight: 1 },
      { id: 'q3_3', text: 'Thick, lustrous, and wavy', trait: 'kapha', weight: 1 }
    ]
  },

  // Appetite & Digestion
  {
    id: 'q4',
    category: 'Physiological',
    text: 'How is your appetite?',
    type: 'single',
    options: [
      { id: 'q4_1', text: 'Variable and irregular', trait: 'vata', weight: 1 },
      { id: 'q4_2', text: 'Strong and sharp, get irritable if I miss meals', trait: 'pitta', weight: 1 },
      { id: 'q4_3', text: 'Steady but can skip meals easily', trait: 'kapha', weight: 1 }
    ]
  },
  {
    id: 'q5',
    category: 'Physiological',
    text: 'How is your digestion?',
    type: 'single',
    options: [
      { id: 'q5_1', text: 'Irregular, tends toward gas and bloating', trait: 'vata', weight: 1 },
      { id: 'q5_2', text: 'Quick and strong, sometimes too acidic', trait: 'pitta', weight: 1 },
      { id: 'q5_3', text: 'Slow but steady', trait: 'kapha', weight: 1 }
    ]
  },
  {
    id: 'q6',
    category: 'Physiological',
    text: 'What type of food do you prefer?',
    type: 'single',
    options: [
      { id: 'q6_1', text: 'Warm, moist, and oily foods', trait: 'vata', weight: 1 },
      { id: 'q6_2', text: 'Cool, refreshing foods and drinks', trait: 'pitta', weight: 1 },
      { id: 'q6_3', text: 'Light, dry, and warm foods', trait: 'kapha', weight: 1 }
    ]
  },

  // Sleep Patterns
  {
    id: 'q7',
    category: 'Sleep',
    text: 'How is your sleep pattern?',
    type: 'single',
    options: [
      { id: 'q7_1', text: 'Light and interrupted, difficulty falling asleep', trait: 'vata', weight: 1 },
      { id: 'q7_2', text: 'Moderate, around 6-8 hours', trait: 'pitta', weight: 1 },
      { id: 'q7_3', text: 'Deep and prolonged, hard to wake up', trait: 'kapha', weight: 1 }
    ]
  },
  {
    id: 'q8',
    category: 'Sleep',
    text: 'How quickly do you fall asleep?',
    type: 'single',
    options: [
      { id: 'q8_1', text: 'Takes long time, mind is active', trait: 'vata', weight: 1 },
      { id: 'q8_2', text: 'Fall asleep within reasonable time', trait: 'pitta', weight: 1 },
      { id: 'q8_3', text: 'Fall asleep quickly and easily', trait: 'kapha', weight: 1 }
    ]
  },

  // Temperature Preference
  {
    id: 'q9',
    category: 'Preferences',
    text: 'What weather do you prefer?',
    type: 'single',
    options: [
      { id: 'q9_1', text: 'Warm and humid weather', trait: 'vata', weight: 1 },
      { id: 'q9_2', text: 'Cool and dry weather', trait: 'pitta', weight: 1 },
      { id: 'q9_3', text: 'Warm and dry weather', trait: 'kapha', weight: 1 }
    ]
  },
  {
    id: 'q10',
    category: 'Preferences',
    text: 'How is your body temperature?',
    type: 'single',
    options: [
      { id: 'q10_1', text: 'Often feel cold, poor circulation', trait: 'vata', weight: 1 },
      { id: 'q10_2', text: 'Usually warm, good circulation', trait: 'pitta', weight: 1 },
      { id: 'q10_3', text: 'Adaptable, rarely too hot or cold', trait: 'kapha', weight: 1 }
    ]
  },

  // Mental & Emotional
  {
    id: 'q11',
    category: 'Mental',
    text: 'How is your memory?',
    type: 'single',
    options: [
      { id: 'q11_1', text: 'Quick to learn but quick to forget', trait: 'vata', weight: 1 },
      { id: 'q11_2', text: 'Good comprehension and moderate retention', trait: 'pitta', weight: 1 },
      { id: 'q11_3', text: 'Slow to learn but excellent long-term memory', trait: 'kapha', weight: 1 }
    ]
  },
  {
    id: 'q12',
    category: 'Mental',
    text: 'How do you handle stress?',
    type: 'single',
    options: [
      { id: 'q12_1', text: 'Become anxious and worried', trait: 'vata', weight: 1 },
      { id: 'q12_2', text: 'Become irritated and angry', trait: 'pitta', weight: 1 },
      { id: 'q12_3', text: 'Become withdrawn and quiet', trait: 'kapha', weight: 1 }
    ]
  },
  {
    id: 'q13',
    category: 'Mental',
    text: 'How would you describe your mind?',
    type: 'single',
    options: [
      { id: 'q13_1', text: 'Active, restless, and creative', trait: 'vata', weight: 1 },
      { id: 'q13_2', text: 'Sharp, focused, and critical', trait: 'pitta', weight: 1 },
      { id: 'q13_3', text: 'Calm, steady, and methodical', trait: 'kapha', weight: 1 }
    ]
  },

  // Physical Activity
  {
    id: 'q14',
    category: 'Activity',
    text: 'How is your physical activity level?',
    type: 'single',
    options: [
      { id: 'q14_1', text: 'Very active but tire quickly', trait: 'vata', weight: 1 },
      { id: 'q14_2', text: 'Moderate activity with good stamina', trait: 'pitta', weight: 1 },
      { id: 'q14_3', text: 'Slow to start but great endurance', trait: 'kapha', weight: 1 }
    ]
  },
  {
    id: 'q15',
    category: 'Activity',
    text: 'How is your walking style?',
    type: 'single',
    options: [
      { id: 'q15_1', text: 'Quick and light', trait: 'vata', weight: 1 },
      { id: 'q15_2', text: 'Moderate pace with determination', trait: 'pitta', weight: 1 },
      { id: 'q15_3', text: 'Slow and steady', trait: 'kapha', weight: 1 }
    ]
  },

  // Speech Patterns
  {
    id: 'q16',
    category: 'Communication',
    text: 'How would you describe your speech?',
    type: 'single',
    options: [
      { id: 'q16_1', text: 'Fast, talkative, sometimes scattered', trait: 'vata', weight: 1 },
      { id: 'q16_2', text: 'Sharp, clear, and convincing', trait: 'pitta', weight: 1 },
      { id: 'q16_3', text: 'Slow, steady, and thoughtful', trait: 'kapha', weight: 1 }
    ]
  },
  {
    id: 'q17',
    category: 'Communication',
    text: 'How is your voice quality?',
    type: 'single',
    options: [
      { id: 'q17_1', text: 'High-pitched, weak, or hoarse', trait: 'vata', weight: 1 },
      { id: 'q17_2', text: 'Sharp, penetrating, and clear', trait: 'pitta', weight: 1 },
      { id: 'q17_3', text: 'Deep, resonant, and pleasant', trait: 'kapha', weight: 1 }
    ]
  },

  // Bowel Habits
  {
    id: 'q18',
    category: 'Elimination',
    text: 'How are your bowel movements?',
    type: 'single',
    options: [
      { id: 'q18_1', text: 'Irregular, tendency toward constipation', trait: 'vata', weight: 1 },
      { id: 'q18_2', text: 'Regular, sometimes loose', trait: 'pitta', weight: 1 },
      { id: 'q18_3', text: 'Regular and well-formed', trait: 'kapha', weight: 1 }
    ]
  },

  // Weight Management
  {
    id: 'q19',
    category: 'Weight',
    text: 'How easily do you gain or lose weight?',
    type: 'single',
    options: [
      { id: 'q19_1', text: 'Difficulty gaining weight, lose easily', trait: 'vata', weight: 1 },
      { id: 'q19_2', text: 'Moderate, can gain or lose with effort', trait: 'pitta', weight: 1 },
      { id: 'q19_3', text: 'Gain easily, difficult to lose', trait: 'kapha', weight: 1 }
    ]
  },

  // Perspiration
  {
    id: 'q20',
    category: 'Physiological',
    text: 'How much do you perspire?',
    type: 'single',
    options: [
      { id: 'q20_1', text: 'Minimal perspiration', trait: 'vata', weight: 1 },
      { id: 'q20_2', text: 'Profuse perspiration, strong odor', trait: 'pitta', weight: 1 },
      { id: 'q20_3', text: 'Moderate perspiration, mild odor', trait: 'kapha', weight: 1 }
    ]
  }
];

// Mental Health Screening Questions
export const mentalHealthQuestions: Question[] = [
  {
    id: 'mh1',
    category: 'Mood',
    text: 'Over the last 2 weeks, how often have you felt down, depressed, or hopeless?',
    type: 'single',
    options: [
      { id: 'mh1_1', text: 'Not at all', trait: 'kapha', weight: 0 },
      { id: 'mh1_2', text: 'Several days', trait: 'vata', weight: 1 },
      { id: 'mh1_3', text: 'More than half the days', trait: 'vata', weight: 2 },
      { id: 'mh1_4', text: 'Nearly every day', trait: 'vata', weight: 3 }
    ]
  },
  {
    id: 'mh2',
    category: 'Anxiety',
    text: 'How often do you feel nervous, anxious, or on edge?',
    type: 'single',
    options: [
      { id: 'mh2_1', text: 'Not at all', trait: 'kapha', weight: 0 },
      { id: 'mh2_2', text: 'Several days', trait: 'vata', weight: 1 },
      { id: 'mh2_3', text: 'More than half the days', trait: 'vata', weight: 2 },
      { id: 'mh2_4', text: 'Nearly every day', trait: 'vata', weight: 3 }
    ]
  },
  {
    id: 'mh3',
    category: 'Sleep',
    text: 'How would you rate your sleep quality recently?',
    type: 'single',
    options: [
      { id: 'mh3_1', text: 'Very good', trait: 'kapha', weight: 0 },
      { id: 'mh3_2', text: 'Fairly good', trait: 'pitta', weight: 1 },
      { id: 'mh3_3', text: 'Fairly bad', trait: 'vata', weight: 2 },
      { id: 'mh3_4', text: 'Very bad', trait: 'vata', weight: 3 }
    ]
  },
  {
    id: 'mh4',
    category: 'Energy',
    text: 'How often do you feel tired or have little energy?',
    type: 'single',
    options: [
      { id: 'mh4_1', text: 'Not at all', trait: 'pitta', weight: 0 },
      { id: 'mh4_2', text: 'Several days', trait: 'kapha', weight: 1 },
      { id: 'mh4_3', text: 'More than half the days', trait: 'kapha', weight: 2 },
      { id: 'mh4_4', text: 'Nearly every day', trait: 'kapha', weight: 3 }
    ]
  },
  {
    id: 'mh5',
    category: 'Stress',
    text: 'How well are you able to handle daily stress?',
    type: 'single',
    options: [
      { id: 'mh5_1', text: 'Very well', trait: 'kapha', weight: 0 },
      { id: 'mh5_2', text: 'Fairly well', trait: 'pitta', weight: 1 },
      { id: 'mh5_3', text: 'Not very well', trait: 'vata', weight: 2 },
      { id: 'mh5_4', text: 'Not at all well', trait: 'vata', weight: 3 }
    ]
  }
];