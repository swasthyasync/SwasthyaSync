// packages/api/src/services/prakritiService.ts
export interface Answer {
  questionId: string;
  optionId: string;
  trait?: 'vata' | 'pitta' | 'kapha';
  weight: number;
}

export interface MLPrediction {
  predicted: 'vata' | 'pitta' | 'kapha';
  confidence: number;
  probabilities: {
    [key: string]: number;
  };
}

export interface PrakritiScores {
  vata: number;
  pitta: number;
  kapha: number;
  dominant: 'vata' | 'pitta' | 'kapha';
  secondary?: 'vata' | 'pitta' | 'kapha';
  // provide percent breakdown too
  percent: {
    vata: number;
    pitta: number;
    kapha: number;
  };
  ml_prediction?: MLPrediction;
}

export interface MentalHealthScore {
  level: 'green' | 'yellow' | 'red';
  label: string;
  risk: 'low' | 'medium' | 'high';
  score: number;
}

function safeSum(values: number[]) {
  return values.reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
}

export const prakritiService = {
  calculateScores(answers: Answer[]): PrakritiScores {
    const scores = { vata: 0, pitta: 0, kapha: 0 };

    answers.forEach(answer => {
      if (answer.trait && (answer.trait === 'vata' || answer.trait === 'pitta' || answer.trait === 'kapha')) {
        scores[answer.trait] += (typeof answer.weight === 'number' ? answer.weight : 0);
      }
    });

    const total = scores.vata + scores.pitta + scores.kapha;
    // avoid divide-by-zero
    const percent = total === 0
      ? { vata: 0, pitta: 0, kapha: 0 }
      : {
          vata: Math.round((scores.vata / total) * 100),
          pitta: Math.round((scores.pitta / total) * 100),
          kapha: Math.round((scores.kapha / total) * 100),
        };

    const entries = (Object.keys(percent) as Array<'vata'|'pitta'|'kapha'>).map(k => [k, percent[k]] as const);
    entries.sort((a, b) => b[1] - a[1]);

    const dominant = entries[0][0];
    const secondPct = entries[1][1];
    const secondary = secondPct > 30 ? entries[1][0] : undefined;

    return {
      vata: scores.vata,
      pitta: scores.pitta,
      kapha: scores.kapha,
      dominant,
      ...(secondary ? { secondary } : {}),
      percent
    };
  },

  calculateMentalHealth(answers: Answer[]): MentalHealthScore {
    const mentalAnswers = answers.filter(a => a.questionId.startsWith('mh') || !a.trait);

    if (mentalAnswers.length === 0) {
      return { level: 'green', label: 'Not Assessed', risk: 'low', score: 0 };
    }

    const totalScore = safeSum(mentalAnswers.map(a => a.weight));
    const maxPossible = mentalAnswers.length * 3 || 1; // assume max weight 3
    const pct = Math.round((totalScore / maxPossible) * 100);

    if (pct < 30) {
      return { level: 'green', label: 'Good Mental Health', risk: 'low', score: pct };
    } else if (pct < 60) {
      return { level: 'yellow', label: 'Moderate Concerns', risk: 'medium', score: pct };
    } else {
      return { level: 'red', label: 'Needs Attention', risk: 'high', score: pct };
    }
  },

  getDietRecommendations(dominantPrakriti: string) {
    // keep the large recommendation object you had — this is unchanged logic
    const recommendations: any = {
      vata: {
        general_guidelines: [
          'Favor warm, cooked, and easy-to-digest foods',
          'Include healthy fats and oils in your diet',
          'Eat at regular times',
          'Avoid cold, dry, and raw foods'
        ],
        foods_to_favor: {
          grains: ['Rice', 'Wheat', 'Oats (cooked)', 'Quinoa'],
          vegetables: ['Sweet potatoes', 'Carrots', 'Beets', 'Asparagus', 'Cucumber'],
          fruits: ['Bananas', 'Avocados', 'Mangoes', 'Papayas', 'Sweet oranges'],
          proteins: ['Chicken', 'Fish', 'Eggs', 'Mung dal', 'Tofu'],
          dairy: ['Warm milk', 'Ghee', 'Butter', 'Cheese', 'Yogurt (in moderation)'],
          spices: ['Ginger', 'Cinnamon', 'Cardamom', 'Cumin', 'Black pepper']
        },
        foods_to_avoid: {
          general: ['Cold foods', 'Dry snacks', 'Raw vegetables', 'Carbonated drinks'],
          specific: ['Popcorn', 'Crackers', 'Raw apples', 'Cabbage', 'Beans']
        },
        meal_timing: {
          breakfast: '7:00 - 8:00 AM',
          lunch: '12:00 - 1:00 PM',
          dinner: '6:00 - 7:00 PM',
          notes: 'Avoid skipping meals. Have warm milk before bed.'
        }
      },
      pitta: {
        general_guidelines: [
          'Favor cool, refreshing foods',
          'Avoid spicy, sour, and salty foods',
          'Eat at moderate temperatures',
          'Include sweet, bitter, and astringent tastes'
        ],
        foods_to_favor: {
          grains: ['Basmati rice', 'Wheat', 'Oats', 'Barley'],
          vegetables: ['Cucumber', 'Lettuce', 'Broccoli', 'Cauliflower', 'Zucchini'],
          fruits: ['Sweet grapes', 'Melons', 'Pears', 'Sweet apples', 'Coconut'],
          proteins: ['Chicken (white meat)', 'Fish (freshwater)', 'Mung beans', 'Tofu'],
          dairy: ['Milk', 'Butter', 'Ghee', 'Soft cheese', 'Ice cream (occasionally)'],
          spices: ['Coriander', 'Fennel', 'Mint', 'Turmeric', 'Small amounts of cumin']
        },
        foods_to_avoid: {
          general: ['Hot spices', 'Sour foods', 'Fermented foods', 'Fried foods'],
          specific: ['Chili peppers', 'Tomatoes', 'Vinegar', 'Alcohol', 'Coffee']
        },
        meal_timing: {
          breakfast: '7:30 - 8:30 AM',
          lunch: '12:00 - 1:00 PM (largest meal)',
          dinner: '6:00 - 7:00 PM',
          notes: 'Never skip meals, especially lunch. Avoid eating when angry.'
        }
      },
      kapha: {
        general_guidelines: [
          'Favor light, warm, and spicy foods',
          'Minimize heavy, oily, and sweet foods',
          'Include pungent, bitter, and astringent tastes',
          'Avoid overeating and snacking'
        ],
        foods_to_favor: {
          grains: ['Barley', 'Millet', 'Buckwheat', 'Corn', 'Rye'],
          vegetables: ['Leafy greens', 'Broccoli', 'Cabbage', 'Peppers', 'Onions'],
          fruits: ['Apples', 'Pears', 'Pomegranates', 'Cranberries', 'Apricots'],
          proteins: ['Chicken', 'Turkey', 'Most beans and lentils', 'Small amounts of egg whites'],
          dairy: ['Low-fat milk', 'Small amounts of ghee', 'Goat milk products'],
          spices: ['All spices, especially ginger', 'Black pepper', 'Turmeric', 'Chili']
        },
        foods_to_avoid: {
          general: ['Heavy foods', 'Fried foods', 'Excessive sweets', 'Cold foods'],
          specific: ['Red meat', 'Wheat', 'Most dairy', 'Bananas', 'Coconut']
        },
        meal_timing: {
          breakfast: 'Light or skip if not hungry',
          lunch: '12:00 - 1:00 PM (main meal)',
          dinner: '6:00 - 7:00 PM (light)',
          notes: 'Can benefit from intermittent fasting. Avoid snacking.'
        }
      }
    };

    const prakriti = (dominantPrakriti || '').toLowerCase();
    return recommendations[prakriti] || recommendations.vata;
  }
};
