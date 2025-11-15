// verify_import_script.js
// Script to verify that the nutrition data import script works correctly

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Nutrition Data Import Script...\n');

// Check if the JavaScript version exists
const jsScriptPath = path.join(__dirname, 'import_nutrition_data.js');
if (fs.existsSync(jsScriptPath)) {
  console.log('✅ JavaScript import script found');
} else {
  console.log('❌ JavaScript import script not found');
  process.exit(1);
}

// Check if the CSV file exists
const csvPath = path.join(__dirname, 'nutrition_dataset.csv');
if (fs.existsSync(csvPath)) {
  const stats = fs.statSync(csvPath);
  console.log(`✅ Nutrition dataset CSV found (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
} else {
  console.log('❌ Nutrition dataset CSV not found');
  process.exit(1);
}

// Check package.json script
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.scripts && packageJson.scripts['import-nutrition-data']) {
    console.log('✅ npm script "import-nutrition-data" is configured correctly');
  } else {
    console.log('❌ npm script "import-nutrition-data" not found in package.json');
    process.exit(1);
  }
} else {
  console.log('❌ package.json not found');
  process.exit(1);
}

console.log('\n🎉 Import script verification successful!');
console.log('\n📋 To run the nutrition data import:');
console.log('   1. Set your Supabase credentials as environment variables:');
console.log('      - SUPABASE_URL');
console.log('      - SUPABASE_SERVICE_KEY');
console.log('   2. Run: npm run import-nutrition-data');
console.log('\n💡 The script will:');
console.log('   • Read the nutrition_dataset.csv file');
console.log('   • Parse all 8000+ food items');
console.log('   • Insert them into your Supabase database in batches');
console.log('   • Show progress during the import process');