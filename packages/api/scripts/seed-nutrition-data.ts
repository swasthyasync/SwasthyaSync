// packages/api/scripts/seed-nutrition-data.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Sample Ayurvedic foods data
const sampleFoods = [
  {
    name_en: 'Basmati Rice',
    name_sanskrit: 'Shali',

    
    food_group: 'Grain',
    calories_per_100g: 130,
    protein_g: 2.7,
    carbs_g: 28.2,
    fat_g: 0.3,
    fiber_g: 0.4,
    vitamins: ['B1', 'B3', 'B6'],
    minerals: ['Manganese', 'Phosphorus', 'Selenium'],
    rasa: ['Madhura'],
    virya: 'Ushna',
    vipaka: 'Madhura',
    guna: ['Laghu', 'Snigdha'],
    dosha_effect: ['Reduces Vata', 'Reduces Pitta', 'Aggravates Kapha'],
    seasonal_suitability: ['Winter', 'Summer'],
    digestion_level: 'Laghu',
    region_common: ['North India'],
    contraindications: ['Diabetes'],
    suggested_combinations: ['Ghee', 'Lentils'],
    therapeutic_uses: ['Digestion', 'Energy'],
    recommended_portion: '100-150g cooked'
  },
  {
    name_en: 'Moong Dal',
    name_sanskrit: 'Mudga',
    food_group: 'Legume',
    calories_per_100g: 105,
    protein_g: 7.8,
    carbs_g: 19.8,
    fat_g: 0.4,
    fiber_g: 2.4,
    vitamins: ['B1', 'B2', 'B3', 'Folate'],
    minerals: ['Iron', 'Magnesium', 'Phosphorus', 'Potassium'],
    rasa: ['Madhura', 'Kashaya'],
    virya: 'Ushna',
    vipaka: 'Madhura',
    guna: ['Laghu', 'Snigdha'],
    dosha_effect: ['Reduces Vata', 'Reduces Pitta', 'Balances Kapha'],
    seasonal_suitability: ['All seasons'],
    digestion_level: 'Laghu',
    region_common: ['All India'],
    contraindications: ['Hyperthyroidism'],
    suggested_combinations: ['Rice', 'Ghee', 'Turmeric'],
    therapeutic_uses: ['Digestion', 'Detoxification', 'Immunity'],
    recommended_portion: '50-75g dry'
  },
  {
    name_en: 'Ghee',
    name_sanskrit: 'Ghrita',
    food_group: 'Oil',
    calories_per_100g: 900,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 99.5,
    fiber_g: 0,
    vitamins: ['A', 'D', 'E', 'K'],
    minerals: ['Calcium', 'Phosphorus', 'Potassium'],
    rasa: ['Madhura'],
    virya: 'Ushna',
    vipaka: 'Madhura',
    guna: ['Snigdha'],
    dosha_effect: ['Reduces Vata', 'Reduces Pitta', 'Aggravates Kapha'],
    seasonal_suitability: ['Winter'],
    digestion_level: 'Laghu',
    region_common: ['All India'],
    contraindications: ['Acne', 'Obesity'],
    suggested_combinations: ['Rice', 'Dal', 'Bread'],
    therapeutic_uses: ['Digestion', 'Skin health', 'Memory'],
    recommended_portion: '1-2 tsp daily'
  },
  {
    name_en: 'Turmeric',
    name_sanskrit: 'Haridra',
    food_group: 'Spice',
    calories_per_100g: 354,
    protein_g: 7.8,
    carbs_g: 64.9,
    fat_g: 9.9,
    fiber_g: 21.2,
    vitamins: ['C', 'B6', 'K'],
    minerals: ['Iron', 'Magnesium', 'Potassium'],
    rasa: ['Katu', 'Tikta'],
    virya: 'Ushna',
    vipaka: 'Katu',
    guna: ['Laghu', 'Teekshna'],
    dosha_effect: ['Reduces Kapha', 'Reduces Pitta', 'Balances Vata'],
    seasonal_suitability: ['All seasons'],
    digestion_level: 'Laghu',
    region_common: ['All India'],
    contraindications: ['Gallstones', 'Pregnancy'],
    suggested_combinations: ['Milk', 'Ghee', 'Black pepper'],
    therapeutic_uses: ['Anti-inflammatory', 'Antioxidant', 'Immunity'],
    recommended_portion: '1/4 tsp daily'
  },
  {
    name_en: 'Neem',
    name_sanskrit: 'Nimba',
    food_group: 'Vegetable',
    calories_per_100g: 26,
    protein_g: 1.2,
    carbs_g: 3.1,
    fat_g: 0.1,
    fiber_g: 1.8,
    vitamins: ['C', 'A'],
    minerals: ['Calcium', 'Iron', 'Magnesium'],
    rasa: ['Tikta', 'Kashaya'],
    virya: 'Sheeta',
    vipaka: 'Katu',
    guna: ['Laghu', 'Ruksha'],
    dosha_effect: ['Reduces Kapha', 'Reduces Pitta', 'Balances Vata'],
    seasonal_suitability: ['Spring'],
    digestion_level: 'Laghu',
    region_common: ['South India'],
    contraindications: ['Pregnancy', 'Low blood pressure'],
    suggested_combinations: ['Honey', 'Turmeric'],
    therapeutic_uses: ['Detoxification', 'Skin health', 'Immunity'],
    recommended_portion: '5-10 leaves daily'
  },
  {
    name_en: 'Ashwagandha',
    name_sanskrit: 'Ashwagandha',
    food_group: 'Herb',
    calories_per_100g: 245,
    protein_g: 12.5,
    carbs_g: 60.8,
    fat_g: 2.3,
    fiber_g: 32.3,
    vitamins: ['C', 'A'],
    minerals: ['Iron', 'Calcium', 'Magnesium'],
    rasa: ['Madhura', 'Kashaya'],
    virya: 'Ushna',
    vipaka: 'Madhura',
    guna: ['Guru', 'Snigdha'],
    dosha_effect: ['Reduces Vata', 'Reduces Kapha', 'Balances Pitta'],
    seasonal_suitability: ['Winter'],
    digestion_level: 'Guru',
    region_common: ['North India'],
    contraindications: ['Pregnancy', 'Autoimmune conditions'],
    suggested_combinations: ['Milk', 'Honey'],
    therapeutic_uses: ['Stress relief', 'Energy', 'Sleep'],
    recommended_portion: '1/2 tsp powder daily'
  },
  {
    name_en: 'Triphala',
    name_sanskrit: 'Triphala',
    food_group: 'Herb',
    calories_per_100g: 250,
    protein_g: 5.2,
    carbs_g: 65.3,
    fat_g: 1.8,
    fiber_g: 38.7,
    vitamins: ['C'],
    minerals: ['Iron', 'Calcium', 'Potassium'],
    rasa: ['Kashaya', 'Amla', 'Tikta'],
    virya: 'Sheeta',
    vipaka: 'Madhura',
    guna: ['Laghu', 'Ruksha'],
    dosha_effect: ['Balances Vata', 'Balances Pitta', 'Balances Kapha'],
    seasonal_suitability: ['All seasons'],
    digestion_level: 'Laghu',
    region_common: ['All India'],
    contraindications: ['Pregnancy', 'Diarrhea'],
    suggested_combinations: ['Honey', 'Water'],
    therapeutic_uses: ['Digestion', 'Detoxification', 'Immunity'],
    recommended_portion: '1/2 tsp powder daily'
  },
  {
    name_en: 'Tulsi',
    name_sanskrit: 'Tulasi',
    food_group: 'Herb',
    calories_per_100g: 23,
    protein_g: 3.1,
    carbs_g: 2.7,
    fat_g: 0.6,
    fiber_g: 2.7,
    vitamins: ['C', 'K'],
    minerals: ['Calcium', 'Iron', 'Vitamin A'],
    rasa: ['Katu'],
    virya: 'Ushna',
    vipaka: 'Katu',
    guna: ['Laghu', 'Teekshna'],
    dosha_effect: ['Reduces Kapha', 'Reduces Vata', 'Balances Pitta'],
    seasonal_suitability: ['Winter'],
    digestion_level: 'Laghu',
    region_common: ['North India'],
    contraindications: ['Pregnancy'],
    suggested_combinations: ['Honey', 'Ginger tea'],
    therapeutic_uses: ['Respiratory health', 'Immunity', 'Stress relief'],
    recommended_portion: '5-10 leaves daily'
  }
];

async function seedNutritionData() {
  console.log('🌱 Starting nutrition data seed...');
  
  try {
    // Check existing food items
    const { count, error: countError } = await supabase
      .from('food_items')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting existing food items:', countError);
      return;
    }
    
    console.log(`📊 Existing food items in database: ${count}`);
    
    // Insert sample foods
    const { data, error } = await supabase
      .from('food_items')
      .insert(sampleFoods)
      .select();
    
    if (error) {
      console.error('Error inserting food items:', error);
      return;
    }
    
    console.log(`✅ Inserted ${data?.length} food items`);
    
    // Display sample data
    console.log('\n📋 Sample data:');
    console.table(data?.slice(0, 3).map(item => ({
      id: item.id.substring(0, 8) + '...',
      name_en: item.name_en,
      food_group: item.food_group,
      dosha_effect: item.dosha_effect
    })));
    
    console.log('\n✅ Nutrition data seeded successfully!');
  } catch (error) {
    console.error('Error seeding nutrition data:', error);
  }
}

// Run the seed function if this script is executed directly
if (require.main === module) {
  seedNutritionData();
}

export default seedNutritionData;