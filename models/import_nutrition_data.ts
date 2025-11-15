// models/import_nutrition_data.ts
// Script to import nutrition data from CSV to Supabase database

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
// Use require instead of import for csv-parser since there are no TypeScript types
const csv = require('csv-parser');

// Supabase configuration - replace with your actual credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface FoodItem {
  id: number;
  name_en: string;
  name_sanskrit: string;
  food_group: string;
  calories_per_100g: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  vitamins: string[];
  minerals: string[];
  rasa: string[];
  virya: string;
  vipaka: string;
  guna: string[];
  dosha_effect: string[];
  seasonal_suitability: string[];
  digestion_level: string;
  region_common: string[];
  contraindications: string[];
  suggested_combinations: string[];
  therapeutic_uses: string[];
  recommended_portion: string;
}

// Parse array strings from CSV
function parseArrayString(str: string): string[] {
  if (!str) return [];
  // Handle both comma-separated values and array-like strings
  if (str.startsWith('[') && str.endsWith(']')) {
    // Remove brackets and split by comma
    return str.replace(/[\[\]']/g, '').split(',').map(item => item.trim()).filter(item => item.length > 0);
  } else if (str.includes(',')) {
    // Simple comma-separated values
    return str.split(',').map(item => item.trim()).filter(item => item.length > 0);
  } else {
    // Single value
    return str.trim() ? [str.trim()] : [];
  }
}

async function importNutritionData() {
  const filePath = path.join(__dirname, 'nutrition_dataset.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error(`CSV file not found at ${filePath}`);
    process.exit(1);
  }

  const foodItems: Partial<FoodItem>[] = [];
  
  console.log('Starting to read CSV file...');
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row: any) => {
      // Convert row to FoodItem format with proper array parsing
      const foodItem: Partial<FoodItem> = {
        id: parseInt(row.id),
        name_en: row.name_en,
        name_sanskrit: row.name_sanskrit,
        food_group: row.food_group,
        calories_per_100g: parseFloat(row.calories_per_100g),
        protein_g: parseFloat(row.protein_g),
        carbs_g: parseFloat(row.carbs_g),
        fat_g: parseFloat(row.fat_g),
        fiber_g: parseFloat(row.fiber_g),
        vitamins: parseArrayString(row.vitamins),
        minerals: parseArrayString(row.minerals),
        rasa: parseArrayString(row.rasa),
        virya: row.virya,
        vipaka: row.vipaka,
        guna: parseArrayString(row.guna),
        dosha_effect: parseArrayString(row.dosha_effect),
        seasonal_suitability: parseArrayString(row.seasonal_suitability),
        digestion_level: row.digestion_level,
        region_common: parseArrayString(row.region_common),
        contraindications: parseArrayString(row.contraindications),
        suggested_combinations: parseArrayString(row.suggested_combinations),
        therapeutic_uses: parseArrayString(row.therapeutic_uses),
        recommended_portion: row.recommended_portion
      };
      
      foodItems.push(foodItem);
    })
    .on('end', async () => {
      console.log(`Finished reading CSV file. Processing ${foodItems.length} items...`);
      
      // Process in batches to avoid overwhelming the database
      const batchSize = 100;
      for (let i = 0; i < foodItems.length; i += batchSize) {
        const batch = foodItems.slice(i, i + batchSize);
        
        // Insert batch into Supabase
        const { data, error } = await supabase
          .from('food_items')
          .insert(batch);
          
        if (error) {
          console.error(`Error inserting batch ${i/batchSize + 1}:`, error);
        } else {
          console.log(`Successfully inserted batch ${i/batchSize + 1} (${batch.length} items)`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('Finished importing nutrition data!');
      process.exit(0);
    })
    .on('error', (error: Error) => {
      console.error('Error reading CSV file:', error);
      process.exit(1);
    });
}

// Run the import if this script is executed directly
if (require.main === module) {
  importNutritionData();
}