const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');
const NodeCache = require('node-cache');

dotenv.config();

const app = express();
const cache = new NodeCache({ stdTTL: 300 });

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan('dev'));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests' });
app.use('/api/', limiter);

// ── File Upload Config ────────────────────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MONGOOSE MODELS
// ═══════════════════════════════════════════════════════════════════════════════

// User Model
const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, required: true, minlength: 6, select: false },
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  farmLocation: { type: String, default: '' },
  preferredLanguage: { type: String, default: 'en' },
  createdAt:    { type: Date, default: Date.now }
});
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
userSchema.methods.matchPassword = async function(entered) {
  return await bcrypt.compare(entered, this.password);
};
const User = mongoose.model('User', userSchema);

// Recommendation Model
const recommendationSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  nitrogen:        { type: Number, required: true },
  phosphorus:      { type: Number, required: true },
  potassium:       { type: Number, required: true },
  temperature:     { type: Number, required: true },
  humidity:        { type: Number, required: true },
  soilMoisture:    { type: Number, required: true },
  soilType:        { type: String, required: true },
  cropType:        { type: String, required: true },
  rainfall:        { type: Number, required: true },
  phLevel:         { type: Number, required: true },
  fertilizerName:  { type: String, required: true },
  fertilizerType:  { type: String, required: true },
  confidence:      { type: Number, required: true },
  explanation:     { type: String, required: true },
  applicationRate: { type: String, required: true },
  tips:            [String],
  aiAdvisorOutput: { type: String, default: '' },
  createdAt:       { type: Date, default: Date.now }
});
recommendationSchema.index({ user: 1, createdAt: -1 });
const Recommendation = mongoose.model('Recommendation', recommendationSchema);

// Disease Detection Model
const diseaseSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cropName:        { type: String, required: true },
  nitrogen:        Number, phosphorus: Number, potassium: Number,
  temperature:     Number, humidity: Number, ph: Number, rainfall: Number,
  diseaseName:     { type: String, required: true },
  confidence:      { type: Number, required: true },
  severity:        { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  description:     String,
  causes:          [String],
  treatment:       [String],
  prevention:      [String],
  recommendedFertilizers: [String],
  hasImage:        { type: Boolean, default: false },
  createdAt:       { type: Date, default: Date.now }
});
diseaseSchema.index({ user: 1, createdAt: -1 });
const DiseaseDetection = mongoose.model('DiseaseDetection', diseaseSchema);

// Chat History Model
const chatMessageSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true },
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },
  language:  { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now }
});
chatMessageSchema.index({ user: 1, sessionId: 1, createdAt: 1 });
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

// ═══════════════════════════════════════════════════════════════════════════════
// AI ENGINE (RULE-BASED — NO EXTERNAL API NEEDED)
// ═══════════════════════════════════════════════════════════════════════════════

const fertilizerDB = {
  'Urea':                    { n: 46, p: 0,  k: 0,  type: 'Nitrogenous', bestFor: ['Rice','Wheat','Maize','Cotton','Sugarcane'] },
  'DAP':                     { n: 18, p: 46, k: 0,  type: 'Phosphatic',  bestFor: ['Wheat','Cotton','Sugarcane','Soybean'] },
  'MOP':                     { n: 0,  p: 0,  k: 60, type: 'Potassic',    bestFor: ['Potato','Tomato','Onion','Banana'] },
  'NPK 20:20:20':            { n: 20, p: 20, k: 20, type: 'Complex',     bestFor: ['All Crops'] },
  'NPK 10:26:26':            { n: 10, p: 26, k: 26, type: 'Complex',     bestFor: ['Maize','Soybean','Barley'] },
  'Compost':                 { n: 1,  p: 1,  k: 1,  type: 'Organic',     bestFor: ['All Crops'] },
  'Potassium Nitrate':       { n: 13, p: 0,  k: 46, type: 'Potassic',    bestFor: ['Tomato','Potato','Pepper'] },
  'Single Super Phosphate':  { n: 0,  p: 16, k: 0,  type: 'Phosphatic',  bestFor: ['Legumes','Pulses','Groundnut'] },
  'Ammonium Sulphate':       { n: 21, p: 0,  k: 0,  type: 'Nitrogenous', bestFor: ['Rice','Sugarcane','Tea'] },
  'Calcium Ammonium Nitrate':{ n: 27, p: 0,  k: 0,  type: 'Nitrogenous', bestFor: ['Vegetables','Fruits'] }
};

const diseaseDB = {
  'Rice': [
    { name: 'Rice Blast', severity: 'High', causes: ['Magnaporthe oryzae fungus','High humidity >90%','Nitrogen excess','Dense planting'], treatment: ['Apply Tricyclazole 75WP at 0.6g/L','Spray Propiconazole','Remove infected plants','Improve air circulation'], prevention: ['Use resistant varieties','Balanced N fertilization','Proper plant spacing'], fertilizers: ['NPK 20:20:20','Compost','Potassium Nitrate'] },
    { name: 'Bacterial Leaf Blight', severity: 'Medium', causes: ['Xanthomonas oryzae bacteria','Flooding','Excess nitrogen','Wounds from insects'], treatment: ['Copper oxychloride spray','Streptomycin sulphate 90ppm','Drain excess water'], prevention: ['Use certified seeds','Balanced fertilization','Avoid waterlogging'], fertilizers: ['DAP','Single Super Phosphate'] }
  ],
  'Wheat': [
    { name: 'Wheat Rust', severity: 'High', causes: ['Puccinia spp. fungus','Cool moist weather','Dense canopy'], treatment: ['Propiconazole 25 EC spray','Tebuconazole application','Remove volunteer plants'], prevention: ['Plant resistant varieties','Avoid late sowing','Field sanitation'], fertilizers: ['Urea','NPK 10:26:26'] },
    { name: 'Powdery Mildew', severity: 'Medium', causes: ['Blumeria graminis fungus','Cool dry weather','High N','Dense crop'], treatment: ['Sulphur 80 WP spray','Triadimefon application'], prevention: ['Resistant varieties','Balanced fertilization'], fertilizers: ['Compost','MOP'] }
  ],
  'Maize': [
    { name: 'Maize Streak Virus', severity: 'High', causes: ['Leafhopper transmission','Drought stress','Susceptible varieties'], treatment: ['Control leafhoppers with insecticide','Remove infected plants','No direct cure'], prevention: ['Resistant hybrids','Early planting','Insecticide seed treatment'], fertilizers: ['NPK 20:20:20','Urea'] },
    { name: 'Northern Corn Leaf Blight', severity: 'Medium', causes: ['Exserohilum turcicum fungus','Warm humid conditions'], treatment: ['Azoxystrobin fungicide','Crop rotation'], prevention: ['Resistant varieties','Crop rotation','Residue management'], fertilizers: ['DAP','Potassium Nitrate'] }
  ],
  'Tomato': [
    { name: 'Early Blight', severity: 'Medium', causes: ['Alternaria solani fungus','High humidity','Leaf wetness','Nutrient deficiency'], treatment: ['Mancozeb 75WP spray','Copper fungicide','Remove lower leaves'], prevention: ['Crop rotation','Mulching','Stake plants'], fertilizers: ['NPK 20:20:20','Compost','MOP'] },
    { name: 'Late Blight', severity: 'High', causes: ['Phytophthora infestans','Cool moist weather','Overhead irrigation'], treatment: ['Metalaxyl + Mancozeb','Chlorothalonil spray'], prevention: ['Resistant varieties','Avoid overhead watering','Good drainage'], fertilizers: ['Potassium Nitrate','Single Super Phosphate'] }
  ],
  'Potato': [
    { name: 'Potato Late Blight', severity: 'High', causes: ['Phytophthora infestans','Cool wet conditions'], treatment: ['Ridomil Gold spray','Copper hydroxide'], prevention: ['Certified seed','Hilling','Resistant varieties'], fertilizers: ['MOP','NPK 10:26:26','Compost'] }
  ],
  'Cotton': [
    { name: 'Cotton Bollworm', severity: 'High', causes: ['Helicoverpa armigera','High temperature','Monoculture'], treatment: ['Bt-based biopesticide','Spinosad spray','Pheromone traps'], prevention: ['IPM practices','Crop rotation','Early sowing'], fertilizers: ['DAP','Urea'] }
  ]
};

function detectDisease(cropName, params) {
  const { nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall } = params;
  const cropDiseases = diseaseDB[cropName] || diseaseDB['Rice'];
  
  let selectedDisease = cropDiseases[0];
  let confidence = 70;

  // Heuristic confidence based on parameters
  if (humidity > 80) confidence += 10;
  if (temperature > 30 && temperature < 35) confidence += 5;
  if (nitrogen > 80) confidence += 5; // excess N increases disease risk
  if (ph < 5.5 || ph > 7.5) confidence += 5;
  if (cropDiseases.length > 1 && rainfall > 200) {
    selectedDisease = cropDiseases[1];
    confidence = 72 + Math.floor(Math.random() * 10);
  }

  confidence = Math.min(95, confidence);

  return {
    disease: selectedDisease,
    confidence
  };
}

function getAIRecommendation(input) {
  const { nitrogen, phosphorus, potassium, temperature, humidity, soilMoisture, soilType, cropType, rainfall, phLevel } = input;
  const scores = {};

  for (const [name, data] of Object.entries(fertilizerDB)) {
    let score = 50;
    const nLow = nitrogen < 50, pLow = phosphorus < 30, kLow = potassium < 40;

    if (nLow && data.n > 20) score += 20;
    if (pLow && data.p > 15) score += 20;
    if (kLow && data.k > 30) score += 20;
    if (!nLow && data.n > 30) score -= 10;
    if (!pLow && data.p > 30) score -= 10;
    if (!kLow && data.k > 40) score -= 10;

    const cropMatch = data.bestFor.some(c =>
      c.toLowerCase() === cropType.toLowerCase() || c === 'All Crops'
    );
    if (cropMatch) score += 15;

    if (phLevel < 6.0 && name === 'Single Super Phosphate') score += 8;
    if (phLevel > 7.5 && name === 'Urea') score += 5;
    if (soilType === 'Sandy' && name === 'Compost') score += 10;
    if (soilMoisture < 30 && name === 'Compost') score += 8;

    scores[name] = Math.min(98, Math.max(55, score));
  }

  const sorted = Object.entries(scores).sort(([,a],[,b]) => b - a);
  const [topName, topScore] = sorted[0];
  const topData = fertilizerDB[topName];

  const tips = [];
  if (phLevel < 5.5) tips.push('Soil is acidic — apply lime (CaCO₃) at 2–3 tons/hectare before fertilizing.');
  if (phLevel > 7.5) tips.push('Alkaline soil — add sulfur or gypsum to reduce pH.');
  if (temperature > 35) tips.push('High temperature — apply fertilizer in early morning (before 8 AM) or late evening.');
  if (soilMoisture < 30) tips.push('Low soil moisture — irrigate 24 hours before fertilizer application.');
  if (soilMoisture > 70) tips.push('Waterlogged soil — improve drainage before applying fertilizer.');
  if (nitrogen > 80) tips.push('High nitrogen already — reduce N application to prevent leaching.');
  tips.push('Always conduct a soil test every season for accurate nutrient management.');
  tips.push('Follow the 4R principle: Right source, Right rate, Right time, Right place.');

  const nDef = nitrogen < 50, pDef = phosphorus < 30, kDef = potassium < 40;
  const defList = [nDef && 'Nitrogen', pDef && 'Phosphorus', kDef && 'Potassium'].filter(Boolean);
  const explanation = defList.length > 0
    ? `Soil is deficient in ${defList.join(', ')}. ${topName} (${topData.type}) is recommended to correct this for your ${cropType} crop. Apply at recommended rates.`
    : `Soil nutrients are well-balanced. ${topName} (${topData.type}) will maintain optimal nutrition for your ${cropType} crop.`;

  const applicationRate = topScore > 85 ? '150–180 kg/hectare' : '100–140 kg/hectare';

  return {
    fertilizer: { name: topName, type: topData.type, composition: topData },
    confidence: topScore,
    explanation,
    applicationRate,
    tips: tips.slice(0, 5),
    alternatives: sorted.slice(1, 4).map(([n, s]) => ({ name: n, confidence: s }))
  };
}

// Seasonal advice
function getSeasonalAdvice(cropType, temperature, humidity, rainfall) {
  const season = temperature > 30 ? 'Summer/Kharif' : temperature < 18 ? 'Winter/Rabi' : 'Spring/Zaid';
  const irrigationFreq = humidity < 50 ? 'every 5–7 days' : humidity < 70 ? 'every 10–12 days' : 'every 14–18 days';

  return {
    season,
    irrigationSchedule: `Irrigate ${irrigationFreq}. Monitor soil moisture and avoid waterlogging.`,
    seasonalTips: [
      `${season} is optimal for ${cropType} cultivation in your region.`,
      `Rainfall of ${rainfall}mm suggests ${rainfall < 500 ? 'supplemental irrigation required' : 'adequate natural moisture'}.`,
      temperature > 35 ? 'Mulching recommended to reduce soil moisture loss.' : 'Maintain good soil aeration.',
      'Apply micronutrients (Zinc, Boron) as foliar spray if deficiency symptoms appear.'
    ],
    pesticidesRecommended: [
      { name: 'Neem-based biopesticide', purpose: 'General pest control', organic: true },
      { name: 'Copper oxychloride', purpose: 'Fungal disease prevention', organic: false },
      { name: 'Bacillus thuringiensis (Bt)', purpose: 'Insect pest control', organic: true }
    ]
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// JWT & AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════════

const JWT_SECRET = process.env.JWT_SECRET || 'agrifert_secret_2024';
const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });

const protect = async (req, res, next) => {
  let token = req.headers.authorization?.startsWith('Bearer')
    ? req.headers.authorization.split(' ')[1] : null;
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

  // Accept demo tokens issued by the client-side auth fallback
  if (token.startsWith('demo_token_')) {
    try {
      const payload = Buffer.from(token.replace('demo_token_', ''), 'base64').toString('utf8');
      const email = payload.split(':')[0];
      // Attach a synthetic user object so routes that read req.user work
      req.user = { _id: 'demo_' + email, name: 'Demo User', email, role: 'user', isDemoUser: true };
      return next();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid demo token' });
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token failed' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANTHROPIC CLAUDE AI HELPER
// ═══════════════════════════════════════════════════════════════════════════════

async function callClaudeAI(systemPrompt, userMessage, maxTokens = 800) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    return null; // Gracefully fall back to rule-based system
  }
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    }, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      timeout: 15000
    });
    return response.data.content[0]?.text || null;
  } catch (err) {
    console.error('Claude API error:', err.response?.data?.error?.message || err.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES: AUTH
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    if (await User.findOne({ email }))
      return res.status(400).json({ success: false, message: 'Email already registered' });
    const user = await User.create({ name, email, password });
    res.status(201).json({ success: true, token: generateToken(user._id), user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    res.json({ success: true, token: generateToken(user._id), user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/auth/me', protect, (req, res) => res.json({ success: true, user: req.user }));

app.put('/api/auth/profile', protect, async (req, res) => {
  try {
    const { name, farmLocation, preferredLanguage } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, farmLocation, preferredLanguage }, { new: true });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES: RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/recommendations/generate', protect, async (req, res) => {
  try {
    const fields = ['nitrogen','phosphorus','potassium','temperature','humidity','soilMoisture','soilType','cropType','rainfall','phLevel'];
    if (fields.some(f => req.body[f] === undefined || req.body[f] === ''))
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });

    const input = {
      nitrogen: Number(req.body.nitrogen), phosphorus: Number(req.body.phosphorus),
      potassium: Number(req.body.potassium), temperature: Number(req.body.temperature),
      humidity: Number(req.body.humidity), soilMoisture: Number(req.body.soilMoisture),
      soilType: req.body.soilType, cropType: req.body.cropType,
      rainfall: Number(req.body.rainfall), phLevel: Number(req.body.phLevel)
    };

    const aiResult = getAIRecommendation(input);
    const seasonal = getSeasonalAdvice(input.cropType, input.temperature, input.humidity, input.rainfall);

    // Try Claude AI for enhanced explanation
    let enhancedExplanation = null;
    const aiPrompt = `You are an expert agronomist. Given these soil & crop parameters:
Crop: ${input.cropType}, N:${input.nitrogen}, P:${input.phosphorus}, K:${input.potassium},
Temperature:${input.temperature}°C, Humidity:${input.humidity}%, pH:${input.phLevel},
Recommended Fertilizer: ${aiResult.fertilizer.name}

Provide a 3-sentence practical farming advice in simple English for an Indian farmer.`;
    enhancedExplanation = await callClaudeAI(
      'You are an expert Indian agronomist. Give short, practical, and specific advice.',
      aiPrompt, 300
    );

    const saved = await Recommendation.create({
      user: req.user._id, ...input,
      fertilizerName: aiResult.fertilizer.name,
      fertilizerType: aiResult.fertilizer.type,
      confidence: aiResult.confidence,
      explanation: aiResult.explanation,
      applicationRate: aiResult.applicationRate,
      tips: aiResult.tips,
      aiAdvisorOutput: enhancedExplanation || ''
    });

    res.status(200).json({
      success: true,
      data: {
        _id: saved._id,
        fertilizer: aiResult.fertilizer,
        confidence: aiResult.confidence,
        explanation: aiResult.explanation,
        enhancedExplanation,
        applicationRate: aiResult.applicationRate,
        tips: aiResult.tips,
        alternatives: aiResult.alternatives,
        seasonal,
        inputData: input
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/recommendations/user', protect, async (req, res) => {
  try {
    const recs = await Recommendation.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, count: recs.length, data: recs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/recommendations/:id', protect, async (req, res) => {
  try {
    const rec = await Recommendation.findOne({ _id: req.params.id, user: req.user._id });
    if (!rec) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rec });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/recommendations/:id', protect, async (req, res) => {
  try {
    const rec = await Recommendation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!rec) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Recommendation deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES: DISEASE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/disease/detect', protect, upload.single('image'), async (req, res) => {
  try {
    const { cropName, nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall } = req.body;
    if (!cropName) return res.status(400).json({ success: false, message: 'Crop name required' });

    const params = {
      nitrogen: Number(nitrogen) || 50, phosphorus: Number(phosphorus) || 25,
      potassium: Number(potassium) || 40, temperature: Number(temperature) || 28,
      humidity: Number(humidity) || 70, ph: Number(ph) || 6.5,
      rainfall: Number(rainfall) || 150
    };

    // Rule-based detection
    const { disease, confidence } = detectDisease(cropName, params);

    // Try Claude AI for detailed analysis
    let aiAnalysis = null;
    const imageBase64 = req.file ? req.file.buffer.toString('base64') : null;
    
    if (imageBase64) {
      // Use Claude Vision for image analysis
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey && apiKey !== 'your_anthropic_api_key_here') {
        try {
          const visionResponse = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: req.file.mimetype, data: imageBase64 } },
                { type: 'text', text: `This is a ${cropName} plant leaf. Identify if there is any disease visible. Provide: disease name, severity (Low/Medium/High), main symptom in 1 sentence, and 2 treatment suggestions. Be concise.` }
              ]
            }]
          }, {
            headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
            timeout: 20000
          });
          aiAnalysis = visionResponse.data.content[0]?.text;
        } catch (e) { console.error('Vision API error:', e.message); }
      }
    } else {
      // Text-based AI analysis
      aiAnalysis = await callClaudeAI(
        'You are a plant pathologist. Give concise disease analysis for farmers.',
        `${cropName} crop: N=${params.nitrogen}, P=${params.phosphorus}, K=${params.potassium}, Temp=${params.temperature}°C, Humidity=${params.humidity}%, pH=${params.ph}. What disease risk exists? Name it, give severity, causes (2 points), and treatment (2 points). Keep it under 150 words.`,
        400
      );
    }

    const saved = await DiseaseDetection.create({
      user: req.user._id, cropName, ...params,
      diseaseName: disease.name,
      confidence,
      severity: disease.severity,
      description: `${disease.name} is a ${disease.severity.toLowerCase()} severity disease commonly affecting ${cropName}.`,
      causes: disease.causes,
      treatment: disease.treatment,
      prevention: disease.prevention,
      recommendedFertilizers: disease.fertilizers,
      hasImage: !!req.file
    });

    res.json({
      success: true,
      data: {
        _id: saved._id,
        diseaseName: disease.name,
        confidence,
        severity: disease.severity,
        description: saved.description,
        causes: disease.causes,
        treatment: disease.treatment,
        prevention: disease.prevention,
        recommendedFertilizers: disease.fertilizers,
        aiAnalysis,
        searchQuery: `${disease.name} ${cropName} plant disease`
      }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/disease/history', protect, async (req, res) => {
  try {
    const history = await DiseaseDetection.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, data: history });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES: CHATBOT
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/chat/message', protect, async (req, res) => {
  try {
    const { message, sessionId, language = 'en' } = req.body;
    if (!message || !sessionId) return res.status(400).json({ success: false, message: 'Message and sessionId required' });

    // Skip DB for demo users (no real MongoDB _id)
    let messages = [];
    if (!req.user.isDemoUser) {
      await ChatMessage.create({ user: req.user._id, sessionId, role: 'user', content: message, language });
      const history = await ChatMessage.find({ user: req.user._id, sessionId })
        .sort({ createdAt: -1 }).limit(10).lean();
      messages = history.reverse().map(m => ({ role: m.role, content: m.content }));
    } else {
      messages = [{ role: 'user', content: message }];
    }

    const systemPrompt = `You are AgriFert AI, an expert agricultural assistant for Indian farmers. 
You specialize in: fertilizer recommendations, crop disease diagnosis, soil health, irrigation, 
weather-based farming advice, and seasonal crop planning.
Answer in ${language === 'en' ? 'English' : language} language. 
Be practical, specific, and use simple language. Keep answers under 150 words.
If asked about specific crops/diseases, give actionable advice.`;

    let reply = null;
    reply = await callClaudeAI(systemPrompt, message, 400);

    // Rule-based fallback
    if (!reply) {
      const q = message.toLowerCase();
      if (q.includes('fertilizer') || q.includes('urea') || q.includes('npk')) {
        reply = 'For balanced fertilization, test your soil first. Most crops need NPK in ratio 4:2:1. Urea is best for nitrogen, DAP for phosphorus, and MOP for potassium. Apply in split doses for better absorption.';
      } else if (q.includes('disease') || q.includes('pest') || q.includes('blight')) {
        reply = 'Common diseases: Rice blast, Wheat rust, Tomato blight. Prevention: Use certified seeds, maintain proper spacing, avoid excess nitrogen. Spray copper fungicide preventively. Remove infected plant parts immediately.';
      } else if (q.includes('irrigation') || q.includes('water')) {
        reply = 'Irrigation schedule depends on crop stage and weather. Most crops need 25-30mm water per week. Monitor soil moisture at 6-inch depth. Drip irrigation saves 40% water. Avoid irrigating at peak heat hours.';
      } else if (q.includes('soil') || q.includes('ph') || q.includes('nutrient')) {
        reply = 'Ideal soil pH is 6.0-7.0 for most crops. Below 6: add lime. Above 7: add gypsum or sulfur. Organic matter improves soil structure. Test soil every season for accurate nutrient management.';
      } else {
        reply = 'I can help with fertilizer recommendations, disease identification, soil health, irrigation schedules, and seasonal farming tips. Please ask your specific farming question!';
      }
    }

    // Save assistant response (skip for demo users)
    if (!req.user.isDemoUser) {
      await ChatMessage.create({ user: req.user._id, sessionId, role: 'assistant', content: reply, language });
    }

    res.json({ success: true, data: { reply, sessionId } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/chat/history/:sessionId', protect, async (req, res) => {
  try {
    const msgs = await ChatMessage.find({ user: req.user._id, sessionId: req.params.sessionId }).sort({ createdAt: 1 });
    res.json({ success: true, data: msgs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/chat/sessions', protect, async (req, res) => {
  try {
    const sessions = await ChatMessage.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$sessionId', lastMessage: { $last: '$content' }, updatedAt: { $max: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { updatedAt: -1 } },
      { $limit: 20 }
    ]);
    res.json({ success: true, data: sessions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES: ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/analytics/dashboard', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const cacheKey = `dashboard_${userId}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const [totalRecs, totalDiseases, allRecs, allDiseases, recentActivity] = await Promise.all([
      Recommendation.countDocuments({ user: userId }),
      DiseaseDetection.countDocuments({ user: userId }),
      Recommendation.find({ user: userId }).select('fertilizerName cropType createdAt confidence').lean(),
      DiseaseDetection.find({ user: userId }).select('diseaseName cropName severity createdAt').lean(),
      Recommendation.find({ user: userId }).sort({ createdAt: -1 }).limit(5)
        .select('fertilizerName cropType confidence createdAt').lean()
    ]);

    // Fertilizer frequency
    const fertilizerCount = {};
    allRecs.forEach(r => { fertilizerCount[r.fertilizerName] = (fertilizerCount[r.fertilizerName] || 0) + 1; });
    const topFertilizers = Object.entries(fertilizerCount)
      .sort(([,a],[,b]) => b - a).slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Crop-wise stats
    const cropCount = {};
    allRecs.forEach(r => { cropCount[r.cropType] = (cropCount[r.cropType] || 0) + 1; });
    const cropStats = Object.entries(cropCount)
      .sort(([,a],[,b]) => b - a)
      .map(([crop, count]) => ({ crop, count }));

    // Disease frequency
    const diseaseCount = {};
    allDiseases.forEach(d => { diseaseCount[d.diseaseName] = (diseaseCount[d.diseaseName] || 0) + 1; });
    const topDiseases = Object.entries(diseaseCount)
      .sort(([,a],[,b]) => b - a).slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyData = {};
    allRecs.filter(r => new Date(r.createdAt) > sixMonthsAgo).forEach(r => {
      const month = new Date(r.createdAt).toLocaleString('default', { month: 'short' });
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    // Average confidence
    const avgConfidence = allRecs.length
      ? Math.round(allRecs.reduce((s, r) => s + r.confidence, 0) / allRecs.length)
      : 0;

    const dashboardData = {
      summary: {
        totalRecommendations: totalRecs,
        totalDiseaseDetections: totalDiseases,
        avgConfidence,
        uniqueCrops: Object.keys(cropCount).length
      },
      topFertilizers,
      cropStats,
      topDiseases,
      monthlyTrend: Object.entries(monthlyData).map(([month, count]) => ({ month, count })),
      recentActivity
    };

    cache.set(cacheKey, dashboardData, 60);
    res.json({ success: true, data: dashboardData });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES: VOICE ASSISTANT (NLP Processing)
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/voice/process', protect, async (req, res) => {
  try {
    const { transcript, language = 'en' } = req.body;
    if (!transcript) return res.status(400).json({ success: false, message: 'Transcript required' });

    const systemPrompt = `You are AgriFert Voice AI, an agricultural assistant for Indian farmers. 
The farmer spoke in ${language}. Understand their query and respond helpfully.
Focus areas: fertilizers, crop diseases, soil, irrigation, weather farming advice.
Respond in the SAME language as the input (${language}).
Keep response under 100 words, suitable for text-to-speech. Be warm and encouraging.`;

    let response = await callClaudeAI(systemPrompt, transcript, 300);

    if (!response) {
      // Rule-based voice response
      const t = transcript.toLowerCase();
      if (t.includes('fertilizer') || t.includes('khad') || t.includes('ಗೊಬ್ಬರ')) {
        response = 'For best results, test your soil first. Use NPK fertilizer balanced for your crop. Apply urea for nitrogen, DAP for phosphorus needs.';
      } else if (t.includes('disease') || t.includes('rog') || t.includes('ರೋಗ')) {
        response = 'To control crop disease, remove infected plants immediately. Spray copper fungicide. Use certified disease-resistant seeds next season.';
      } else if (t.includes('water') || t.includes('irrigation') || t.includes('ನೀರು')) {
        response = 'Irrigate your crop early morning or evening. Check soil moisture at 6 inch depth. Most crops need water every 7 to 10 days.';
      } else {
        response = 'I am your AgriFert farming assistant. Ask me about fertilizers, diseases, irrigation, or crop management. How can I help you today?';
      }
    }

    res.json({ success: true, data: { response, language } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK & ERROR HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'AgriFert Enhanced API v2.0 ✅',
    timestamp: new Date(),
    features: ['recommendations','disease-detection','chatbot','voice-assistant','analytics'],
    ai: process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here' ? 'Claude AI Active' : 'Rule-based (Add ANTHROPIC_API_KEY for Claude AI)'
  });
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server Error' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/agrifert_v2';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🌱 AgriFert Enhanced Server v2.0 on http://localhost:${PORT}`);
      console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });
