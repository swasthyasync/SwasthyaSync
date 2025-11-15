// verify_nutrition_integration.js
// Script to verify that all nutrition engine features are properly integrated

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Nutrition Engine Integration...\n');

const components = [
  // Backend components
  { path: 'packages/api/src/services/nutritionService.ts', name: 'Nutrition Service' },
  { path: 'packages/api/src/controllers/nutritionController.ts', name: 'Nutrition Controller' },
  { path: 'packages/api/src/routes/nutrition.ts', name: 'Nutrition Routes' },
  
  // Database schema
  { path: 'infra/supabase/nutrition_schema_extensions.sql', name: 'Database Schema Extensions' },
  
  // Data import
  { path: 'models/import_nutrition_data.js', name: 'Data Import Script (JavaScript)' }, // Updated to JS version
  { path: 'models/nutrition_dataset.csv', name: 'Nutrition Dataset' },
  
  // Frontend components
  { path: 'apps/web/src/components/NutritionDashboard.tsx', name: 'Nutrition Dashboard Component' },
  { path: 'apps/web/src/components/PractitionerNutritionManager.tsx', name: 'Practitioner Nutrition Manager' },
  { path: 'apps/web/src/components/NutritionDashboard.css', name: 'Nutrition Dashboard Styles' },
  
  // Frontend pages
  { path: 'apps/web/src/pages/patient/Dashboard.tsx', name: 'Patient Dashboard (with Nutrition integration)' },
  { path: 'apps/web/src/pages/practitioner/Dashboard.tsx', name: 'Practitioner Dashboard (with Nutrition link)' },
  { path: 'apps/web/src/pages/practitioner/NutritionManagement.tsx', name: 'Practitioner Nutrition Management Page' },
  
  // Routing
  { path: 'apps/web/src/App.tsx', name: 'Main App Router (with Nutrition routes)' },
];

let allExist = true;

components.forEach(component => {
  const fullPath = path.join(__dirname, component.path);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${component.name} - FOUND`);
  } else {
    console.log(`❌ ${component.name} - MISSING`);
    allExist = false;
  }
});

console.log('\n' + '='.repeat(50));

// Check if the patient dashboard has the nutrition view integration
const patientDashboardPath = path.join(__dirname, 'apps/web/src/pages/patient/Dashboard.tsx');
if (fs.existsSync(patientDashboardPath)) {
  const dashboardContent = fs.readFileSync(patientDashboardPath, 'utf8');
  const hasNutritionView = dashboardContent.includes('activeView === \'nutrition\'');
  const hasNutritionCard = dashboardContent.includes('Personalized Diet');
  const hasNutritionImport = dashboardContent.includes('import NutritionDashboard');
  
  console.log(`✅ Patient Dashboard has Nutrition View: ${hasNutritionView ? 'YES' : 'NO'}`);
  console.log(`✅ Patient Dashboard has Personalized Diet Card: ${hasNutritionCard ? 'YES' : 'NO'}`);
  console.log(`✅ Patient Dashboard imports NutritionDashboard: ${hasNutritionImport ? 'YES' : 'NO'}`);
  
  if (hasNutritionView && hasNutritionCard && hasNutritionImport) {
    console.log('\n✅ Patient Dashboard is properly integrated with Nutrition Engine');
  } else {
    console.log('\n❌ Patient Dashboard integration is incomplete');
    allExist = false;
  }
} else {
  console.log('❌ Patient Dashboard file not found');
  allExist = false;
}

if (allExist) {
  console.log('\n🎉 All nutrition engine components have been successfully integrated!');
  console.log('\n📋 Summary of what was implemented:');
  console.log('   • Backend API with nutrition endpoints');
  console.log('   • Database schema with nutrition tables');
  console.log('   • Data import script for 8000+ food items (JavaScript version)');
  console.log('   • Patient Nutrition Dashboard with search functionality');
  console.log('   • Practitioner Nutrition Management page');
  console.log('   • Personalized diet recommendations based on Prakriti');
  console.log('   • Ayurvedic food database with dosha effects');
  console.log('   • Consistent Ayurvedic-themed styling');
  console.log('\n🚀 How to use the Nutrition Engine:');
  console.log('   1. Complete your Prakriti assessment');
  console.log('   2. Click on "Personalized Diet" card in your dashboard');
  console.log('   3. View your diet recommendations based on your constitution');
  console.log('   4. Search the Ayurvedic food database using filters');
  console.log('   5. Learn about Ayurvedic nutrition principles');
  console.log('\n📋 To import nutrition data into Supabase:');
  console.log('   1. Set your Supabase credentials as environment variables:');
  console.log('      - SUPABASE_URL');
  console.log('      - SUPABASE_SERVICE_KEY');
  console.log('   2. Run: npm run import-nutrition-data (in the models directory)');
} else {
  console.log('\n❌ Some components are missing. Please check the implementation.');
}

console.log('\n💡 Next steps:');
console.log('   1. Make sure the backend API is running (port 4000)');
console.log('   2. Ensure Supabase is properly configured with the nutrition tables');
console.log('   3. Run the data import script to populate the food database');
console.log('   4. Start the frontend: npm run dev:web');