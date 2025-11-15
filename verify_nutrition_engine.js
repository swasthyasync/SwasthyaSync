// verify_nutrition_engine.js
// Script to verify that all nutrition engine components have been created

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Nutrition Engine Components...\n');

const components = [
  // Backend components
  { path: 'packages/api/src/services/nutritionService.ts', name: 'Nutrition Service' },
  { path: 'packages/api/src/controllers/nutritionController.ts', name: 'Nutrition Controller' },
  { path: 'packages/api/src/routes/nutrition.ts', name: 'Nutrition Routes' },
  
  // Database schema
  { path: 'infra/supabase/nutrition_schema_extensions.sql', name: 'Database Schema Extensions' },
  
  // Data import
  { path: 'models/import_nutrition_data.ts', name: 'Data Import Script' },
  { path: 'models/package.json', name: 'Models Package.json' },
  
  // Frontend components
  { path: 'apps/web/src/components/NutritionDashboard.tsx', name: 'Patient Nutrition Dashboard' },
  { path: 'apps/web/src/components/PractitionerNutritionManager.tsx', name: 'Practitioner Nutrition Manager' },
  { path: 'apps/web/src/services/nutritionService.ts', name: 'Frontend Nutrition Service' },
  
  // Documentation
  { path: 'NUTRITION_ENGINE_README.md', name: 'Nutrition Engine README' }
];

let allExist = true;

components.forEach(component => {
  const fullPath = path.join(__dirname, component.path);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${component.name} - Found`);
  } else {
    console.log(`❌ ${component.name} - Missing (${component.path})`);
    allExist = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allExist) {
  console.log('🎉 All Nutrition Engine components have been successfully created!');
  console.log('\nNext steps:');
  console.log('1. Add the nutrition schema extensions to your Supabase database');
  console.log('2. Update your API index.ts to include nutrition routes');
  console.log('3. Install dependencies in the models directory');
  console.log('4. Run the data import script to populate food items');
  console.log('5. Integrate frontend components into your dashboard');
} else {
  console.log('⚠️  Some components are missing. Please check the output above.');
}

console.log('\nFor detailed instructions, refer to NUTRITION_ENGINE_README.md');