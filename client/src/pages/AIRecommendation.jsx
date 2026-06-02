import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast';
import VoiceAssistant from '../components/VoiceAssistant/VoiceAssistant';
import {
  FaSeedling, FaTint, FaTemperatureHigh, FaCloudRain,
  FaFlask, FaLeaf, FaChartBar, FaCheckCircle, FaMicrophone,
  FaLightbulb, FaCalendarAlt, FaBug
} from 'react-icons/fa';

const soilTypes = ['Loamy', 'Sandy', 'Clayey', 'Peaty', 'Saline', 'Chalky'];
const cropTypes = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Potato', 'Tomato', 'Onion', 'Soybean', 'Barley'];

const InputField = ({ label, name, icon: Icon, register, errors, min, max, step = '1', placeholder }) => (
  <div>
    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
      {Icon && <Icon className="text-green-500" />} {label}
    </label>
    <input type="number" step={step} min={min} max={max} placeholder={placeholder}
      {...register(name, { required: `${label} is required`, min: { value: min, message: `Min ${min}` }, max: { value: max, message: `Max ${max}` } })}
      className="input-field" />
    {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
  </div>
);

export default function AIRecommendation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data) => {
    if (!user) { toast.error('Please login first'); navigate('/auth'); return; }
    setLoading(true);
    try {
      const res = await API.post('/recommendations/generate', {
        ...data,
        nitrogen: Number(data.nitrogen), phosphorus: Number(data.phosphorus),
        potassium: Number(data.potassium), temperature: Number(data.temperature),
        humidity: Number(data.humidity), soilMoisture: Number(data.soilMoisture),
        rainfall: Number(data.rainfall), phLevel: Number(data.phLevel),
      });
      setRecommendation(res.data.data);
      toast.success('AI Recommendation Generated! 🌱');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate recommendation');
    } finally { setLoading(false); }
  };

  const cc = (c) => c >= 85 ? 'text-green-600' : c >= 70 ? 'text-yellow-600' : 'text-red-600';
  const cb = (c) => c >= 85 ? 'bg-green-500' : c >= 70 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="section-title mb-4">🌿 AI Fertilizer Recommendation</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
            Enter your soil and crop details for a personalized AI-powered recommendation
          </p>
          <button onClick={() => setVoiceOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105">
            <FaMicrophone className="animate-pulse" /> Ask via Voice Assistant
          </button>
        </div>

        {/* Form Card */}
        <div className="glass-card p-6 md:p-8 mb-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <FaFlask className="text-green-500" /> Soil & Crop Parameters
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <InputField label="Nitrogen (N) mg/kg" name="nitrogen" icon={FaLeaf} register={register} errors={errors} min={0} max={200} placeholder="0-200" />
              <InputField label="Phosphorus (P) mg/kg" name="phosphorus" icon={FaLeaf} register={register} errors={errors} min={0} max={100} placeholder="0-100" />
              <InputField label="Potassium (K) mg/kg" name="potassium" icon={FaLeaf} register={register} errors={errors} min={0} max={300} placeholder="0-300" />
              <InputField label="Temperature (°C)" name="temperature" icon={FaTemperatureHigh} register={register} errors={errors} min={0} max={50} placeholder="0-50" />
              <InputField label="Humidity (%)" name="humidity" icon={FaTint} register={register} errors={errors} min={0} max={100} placeholder="0-100" />
              <InputField label="Soil Moisture (%)" name="soilMoisture" icon={FaTint} register={register} errors={errors} min={0} max={100} placeholder="0-100" />
              <InputField label="Rainfall (mm)" name="rainfall" icon={FaCloudRain} register={register} errors={errors} min={0} max={500} placeholder="0-500" />
              <InputField label="pH Level" name="phLevel" icon={FaFlask} register={register} errors={errors} min={0} max={14} step="0.1" placeholder="0-14" />

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <FaLeaf className="text-green-500" /> Soil Type
                </label>
                <select {...register('soilType', { required: 'Soil type required' })} className="input-field">
                  <option value="">Select soil type</option>
                  {soilTypes.map(s => <option key={s}>{s}</option>)}
                </select>
                {errors.soilType && <p className="text-red-500 text-xs mt-1">{errors.soilType.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <FaSeedling className="text-green-500" /> Crop Type
                </label>
                <select {...register('cropType', { required: 'Crop type required' })} className="input-field">
                  <option value="">Select crop</option>
                  {cropTypes.map(c => <option key={c}>{c}</option>)}
                </select>
                {errors.cropType && <p className="text-red-500 text-xs mt-1">{errors.cropType.message}</p>}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 flex-1 justify-center">
                {loading ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing…</>
                ) : (
                  <><FaChartBar /> Get AI Recommendation</>
                )}
              </button>
              <button type="button" onClick={() => { reset(); setRecommendation(null); }} className="btn-secondary px-6">Reset</button>
            </div>
          </form>
        </div>

        {/* Results */}
        {recommendation && (
          <div className="space-y-6">
            {/* Main Result Card */}
            <div className="glass-card p-6 md:p-8 border-l-4 border-green-500">
              <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FaCheckCircle className="text-green-500" />
                    {recommendation.fertilizer?.name}
                  </h2>
                  <span className="inline-block mt-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                    {recommendation.fertilizer?.type}
                  </span>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold ${cc(recommendation.confidence)}`}>
                    {recommendation.confidence}%
                  </div>
                  <div className="text-xs text-gray-500">Confidence</div>
                  <div className="w-24 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                    <div className={`h-full ${cb(recommendation.confidence)} rounded-full transition-all`}
                      style={{ width: `${recommendation.confidence}%` }} />
                  </div>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-4">{recommendation.explanation}</p>

              {recommendation.enhancedExplanation && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-purple-600 mb-1">🤖 Claude AI Advisor says:</p>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{recommendation.enhancedExplanation}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'N (Nitrogen)', val: recommendation.fertilizer?.composition?.n + '%' },
                  { label: 'P (Phosphorus)', val: recommendation.fertilizer?.composition?.p + '%' },
                  { label: 'K (Potassium)', val: recommendation.fertilizer?.composition?.k + '%' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-green-600">{item.val}</div>
                    <div className="text-xs text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3 inline-flex items-center gap-2">
                <FaChartBar className="text-yellow-600" />
                <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                  Application Rate: {recommendation.applicationRate}
                </span>
              </div>
            </div>

            {/* Tips + Seasonal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaLightbulb className="text-yellow-500" /> Farming Tips
                </h3>
                <ul className="space-y-2">
                  {recommendation.tips?.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-green-500 mt-0.5">✓</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {recommendation.seasonal && (
                <div className="glass-card p-5">
                  <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <FaCalendarAlt className="text-blue-500" /> Seasonal Advice
                  </h3>
                  <p className="text-xs font-semibold text-blue-600 mb-2">Season: {recommendation.seasonal.season}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{recommendation.seasonal.irrigationSchedule}</p>
                  <ul className="space-y-1">
                    {recommendation.seasonal.seasonalTips?.slice(0,3).map((tip, i) => (
                      <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                        <span className="text-green-400">›</span> {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Alternatives */}
            {recommendation.alternatives?.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaBug className="text-orange-500" /> Alternative Options
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recommendation.alternatives.map((alt, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-center">
                      <div className="font-semibold text-gray-700 dark:text-gray-300 text-sm">{alt.name}</div>
                      <div className={`text-lg font-bold ${cc(alt.confidence)}`}>{alt.confidence}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <VoiceAssistant isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} />
    </div>
  );
}
