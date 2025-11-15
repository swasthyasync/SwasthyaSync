# SwasthyaSync Nutrition Engine

## Overview

The Nutrition Engine is an intelligent Ayurvedic dietary recommendation system integrated with the existing SwasthyaSync platform. It enhances the Prakriti assessment system by providing personalized nutrition plans based on Ayurvedic principles and individual health profiles.

## Architecture

The Nutrition Engine consists of several components:

1. **Database Schema Extensions** - Additional tables for food items, meal logs, and nutrition feedback
2. **Backend API Services** - RESTful endpoints for nutrition data and recommendations
3. **Frontend Components** - UI for patients and practitioners to interact with nutrition features
4. **Data Import Scripts** - Tools to populate the food database

## Database Schema Extensions

The following tables need to be added to your Supabase schema:

### Food Items Table
Stores comprehensive Ayurvedic food data with properties like:
- Nutritional values (calories, protein, carbs, fat, fiber)
- Ayurvedic properties (rasa, virya, vipaka, guna)
- Dosha effects and therapeutic uses
- Seasonal suitability and regional availability

### Meal Logs Table
Tracks patient food consumption for analysis and feedback.

### Nutrition Feedback Table
Collects patient-reported outcomes to improve recommendations.

### Dietitian Recommendations Table
Stores practitioner-specific dietary guidance.

## Backend API

### Installation
```bash
cd packages/api
npm install
```

### Available Endpoints

#### Food Items
- `GET /api/nutrition/foods` - Get food items with optional filtering
- `GET /api/nutrition/foods/:id` - Get a specific food item

#### Diet Recommendations
- `POST /api/nutrition/diet/generate` - Generate general diet plan based on Prakriti
- `POST /api/nutrition/diet/recommendations` - Save diet recommendations
- `GET /api/nutrition/diet/recommendations` - Get user's diet recommendations

#### Meal Logging
- `POST /api/nutrition/meals/log` - Log a meal
- `GET /api/nutrition/meals/logs` - Get user's meal logs

#### Feedback
- `POST /api/nutrition/feedback` - Submit nutrition feedback

#### Dietitian Recommendations
- `POST /api/nutrition/dietitian/recommendations` - Save dietitian recommendation
- `GET /api/nutrition/dietitian/recommendations` - Get user's dietitian recommendations

## Frontend Components

### Patient Components
- `NutritionDashboard.tsx` - Main patient nutrition interface
- Displays personalized diet recommendations
- Provides access to the Ayurvedic food database
- Enables meal logging and feedback submission

### Practitioner Components
- `PractitionerNutritionManager.tsx` - Nutrition management interface for practitioners
- Allows viewing patient diet history
- Enables adding personalized nutrition recommendations

## Data Import

### Nutrition Dataset
The system includes a synthetic dataset of 8000+ Ayurvedic food items with comprehensive nutritional and Ayurvedic properties.

### Import Script
To import the nutrition data into your Supabase database:

1. Set up your Supabase credentials in environment variables:
   ```bash
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_SERVICE_KEY=your_service_key
   ```

2. Install dependencies:
   ```bash
   cd models
   npm install
   ```

3. Run the import script:
   ```bash
   npm run import-nutrition-data
   ```

## Integration with Existing Features

### Prakriti Assessment Enhancement
The Nutrition Engine builds upon the existing Prakriti assessment system:
1. Automatically generates diet plans based on Prakriti results
2. Integrates with questionnaire data for more personalized recommendations
3. Connects with existing visualization components

### Therapy Scheduling Integration
- Links nutrition recommendations with therapy appointments
- Provides pre/post-treatment dietary guidance
- Flags potential food-therapy conflicts

### Health Metrics Correlation
- Connects nutrition data with existing health metrics
- Tracks the impact of dietary changes on vital signs
- Enables comprehensive health insights

## Implementation Roadmap

### Phase 1: Database & API Layer
- ✅ Add nutrition schema extensions to Supabase
- ✅ Implement nutrition service and controller
- ✅ Create RESTful API endpoints

### Phase 2: Machine Learning Integration
- ✅ Import nutrition dataset (8000+ food items)
- Develop recommendation algorithms
- Implement feedback processing pipeline

### Phase 3: Frontend Integration
- ✅ Create patient nutrition dashboard
- ✅ Create practitioner nutrition management
- Integrate with existing UI components

### Phase 4: Advanced Features
- Implement meal planning and recipe suggestions
- Add nutrition analytics and reporting
- Enable practitioner-patient collaboration tools

## Usage Instructions

### For Patients
1. Complete your Prakriti assessment to receive personalized diet recommendations
2. View your nutrition dashboard to see recommended foods
3. Log your meals to track adherence and provide feedback
4. Consult with your practitioner for personalized guidance

### For Practitioners
1. Access the nutrition management interface
2. Review patient diet history and adherence
3. Add personalized recommendations based on consultations
4. Monitor patient progress through nutrition feedback

## Technical Details

### Technology Stack
- Backend: Node.js/Express with TypeScript
- Database: Supabase (PostgreSQL)
- Frontend: React with TypeScript
- Authentication: Supabase Auth
- Data Format: JSON with Ayurvedic properties

### Ayurvedic Properties Mapping
- **Rasa** (Taste): Madhura (Sweet), Amla (Sour), Lavana (Salty), Katu (Pungent), Tikta (Bitter), Kashaya (Astringent)
- **Virya** (Potency): Ushna (Hot), Shita (Cold)
- **Vipaka** (Post-digestive effect): Madhura (Sweet), Amla (Sour), Katu (Pungent)
- **Guna** (Qualities): Laghu (Light), Guru (Heavy), Snigdha (Unctuous), Ruksha (Dry), Manda (Slow), Teekshna (Sharp)
- **Dosha Effects**: Reduces/Aggravates/Balances Vata/Pitta/Kapha

## Future Enhancements

1. **Advanced ML Models**: Implement deep learning for personalized nutrition predictions
2. **Recipe Integration**: Add Ayurvedic recipes with nutritional analysis
3. **Seasonal Adaptations**: Automatic diet adjustments based on seasons
4. **Community Features**: Patient sharing of successful dietary practices
5. **Mobile App Integration**: Native mobile app with offline meal logging
6. **IoT Integration**: Connect with smart kitchen devices for nutritional tracking

## Support

For implementation questions or issues, please refer to the existing SwasthyaSync documentation or contact the development team.