// models/import_nutrition_data.js
// Script to import nutrition data from CSV to Supabase database

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Supabase configuration - replace with your actual credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse array strings from CSV
function parseArrayString(str) {
  if (!str || str === '""' || str === '') return [];
  // Remove quotes and brackets if present
  str = str.replace(/^["\[]+|["\]]+$/g, '');
  // Split by comma and trim whitespace
  return str.split(',').map(item => item.trim().replace(/^["']+|["']+$/g, '')).filter(item => item.length > 0);
}

// Convert array to PostgreSQL format
function toPostgresArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '{}';
  
  // Escape special characters and wrap each item in double quotes
  const escapedItems = arr.map(item => {
    // Escape backslashes and double quotes
    return `"${item.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  });
  
  return `{${escapedItems.join(',')}}`;
}

async function importNutritionData() {
  const filePath = path.join(__dirname, 'nutrition_dataset.csv');
  
  if (!fs.existsSync(filePath)) {
    console.error(`CSV file not found at ${filePath}`);
    process.exit(1);
  }

  const foodItems = [];
  
  console.log('Starting to read CSV file...');
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      // Parse array fields properly
      const vitamins = parseArrayString(row.vitamins);
      const minerals = parseArrayString(row.minerals);
      const rasa = parseArrayString(row.rasa);
      const guna = parseArrayString(row.guna);
      const dosha_effect = parseArrayString(row.dosha_effect);
      const seasonal_suitability = parseArrayString(row.seasonal_suitability);
      const region_common = parseArrayString(row.region_common);
      const contraindications = parseArrayString(row.contraindications);
      const suggested_combinations = parseArrayString(row.suggested_combinations);
      const therapeutic_uses = parseArrayString(row.therapeutic_uses);

      // Convert row to FoodItem format
      const foodItem = {
        name_en: row.name_en,
        name_sanskrit: row.name_sanskrit,
        food_group: row.food_group,
        calories_per_100g: parseFloat(row.calories_per_100g) || 0,
        protein_g: parseFloat(row.protein_g) || 0,
        carbs_g: parseFloat(row.carbs_g) || 0,
        fat_g: parseFloat(row.fat_g) || 0,
        fiber_g: parseFloat(row.fiber_g) || 0,
        vitamins: vitamins,
        minerals: minerals,
        rasa: rasa,
        virya: row.virya,
        vipaka: row.vipaka,
        guna: guna,
        dosha_effect: dosha_effect,
        seasonal_suitability: seasonal_suitability,
        digestion_level: row.digestion_level,
        region_common: region_common,
        contraindications: contraindications,
        suggested_combinations: suggested_combinations,
        therapeutic_uses: therapeutic_uses,
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
          console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error);
        } else {
          console.log(`Successfully inserted batch ${Math.floor(i/batchSize) + 1} (${batch.length} items)`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('Finished importing nutrition data!');
      process.exit(0);
    })
    .on('error', (error) => {
      console.error('Error reading CSV file:', error);
      process.exit(1);
    });
}

// Run the import if this script is executed directly
if (require.main === module) {
  importNutritionData();
}