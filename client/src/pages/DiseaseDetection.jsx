import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import toast from 'react-hot-toast';
import {
  FaSearch, FaUpload, FaExclamationTriangle, FaCheckCircle,
  FaLeaf, FaFlask, FaShieldAlt, FaSeedling, FaImage, FaTimes
} from 'react-icons/fa';

const cropOptions = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Potato', 'Tomato', 'Onion', 'Soybean', 'Barley'];

const SeverityBadge = ({ severity }) => {
  const styles = {
    Low:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    High:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const icons = { Low: '🟢', Medium: '🟡', High: '🔴' };
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${styles[severity] || styles.Medium}`}>
      {icons[severity]} {severity} Severity
    </span>
  );
};

export default function DiseaseDetection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image size must be under 5MB'); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data) => {
    if (!user) { toast.error('Please login first'); navigate('/auth'); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => formData.append(k, v));
      if (imageFile) formData.append('image', imageFile);

      const res = await API.post('/disease/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data.data);
      toast.success('Disease analysis complete! 🔬');
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Detection failed');
    } finally { setLoading(false); }
  };

  const cc = (c) => c >= 85 ? 'text-green-600' : c >= 70 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="section-title mb-3">🔬 Plant Disease Detection</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Upload a plant image and/or provide soil parameters for AI-powered disease diagnosis
          </p>
        </div>

        {/* Input Card */}
        <div className="glass-card p-6 md:p-8 mb-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Parameters */}
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaFlask className="text-green-500" /> Crop & Soil Data
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Crop Name *</label>
                    <select {...register('cropName', { required: 'Crop name required' })} className="input-field">
                      <option value="">Select crop</option>
                      {cropOptions.map(c => <option key={c}>{c}</option>)}
                    </select>
                    {errors.cropName && <p className="text-red-500 text-xs mt-1">{errors.cropName.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Nitrogen (N)', name: 'nitrogen', ph: '0-200' },
                      { label: 'Phosphorus (P)', name: 'phosphorus', ph: '0-100' },
                      { label: 'Potassium (K)', name: 'potassium', ph: '0-300' },
                      { label: 'Temperature °C', name: 'temperature', ph: '0-50' },
                      { label: 'Humidity %', name: 'humidity', ph: '0-100' },
                      { label: 'pH Level', name: 'ph', ph: '0-14', step: '0.1' },
                      { label: 'Rainfall (mm)', name: 'rainfall', ph: '0-500' },
                    ].map(f => (
                      <div key={f.name}>
                        <label className="block text-xs font-semibold mb-1 text-gray-600 dark:text-gray-400">{f.label}</label>
                        <input type="number" step={f.step || '1'} placeholder={f.ph}
                          {...register(f.name)} className="input-field text-sm py-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Image Upload */}
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaImage className="text-blue-500" /> Plant Image (Optional)
                </h3>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-4 text-center cursor-pointer hover:border-green-400 transition-colors">
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="leaf-img" />
                  <label htmlFor="leaf-img" className="cursor-pointer">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Leaf" className="w-full h-48 object-cover rounded-xl" />
                        <button type="button" onClick={(e) => { e.preventDefault(); setImagePreview(null); setImageFile(null); }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600">
                          <FaTimes />
                        </button>
                      </div>
                    ) : (
                      <div className="py-8">
                        <FaUpload className="text-4xl text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">Click to upload leaf image</p>
                        <p className="text-gray-400 text-xs mt-1">JPEG, PNG, WebP • Max 5MB</p>
                        <p className="text-green-600 text-xs mt-2 font-medium">📸 Image improves accuracy via AI Vision</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* Info boxes */}
                <div className="mt-4 space-y-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                    <p className="text-xs font-semibold text-blue-600 mb-1">📊 Datasets Available</p>
                    <ul className="text-xs text-gray-500 space-y-0.5">
                      <li>• PlantVillage (54K+ images, 38 classes)</li>
                      <li>• Kaggle: "New Plant Diseases Dataset"</li>
                      <li>• ICAR plant disease database</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                    <p className="text-xs font-semibold text-purple-600 mb-1">🤖 AI Models Used</p>
                    <ul className="text-xs text-gray-500 space-y-0.5">
                      <li>• Claude Vision API (if image uploaded)</li>
                      <li>• Rule-based expert system fallback</li>
                      <li>• Pre-trained CNN (deploy on HuggingFace)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-6">
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing…</>
              ) : (
                <><FaSearch /> Detect Disease</>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Primary Result */}
            <div className={`glass-card p-6 border-l-4 ${
              result.severity === 'High' ? 'border-red-500' : result.severity === 'Medium' ? 'border-yellow-500' : 'border-green-500'
            }`}>
              <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FaExclamationTriangle className={result.severity === 'High' ? 'text-red-500' : result.severity === 'Medium' ? 'text-yellow-500' : 'text-green-500'} />
                    {result.diseaseName}
                  </h2>
                  <div className="flex items-center gap-3 mt-2">
                    <SeverityBadge severity={result.severity} />
                    <span className={`text-2xl font-bold ${cc(result.confidence)}`}>{result.confidence}% confidence</span>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-4">{result.description}</p>

              {result.aiAnalysis && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 mb-4">
                  <p className="text-xs font-bold text-purple-600 mb-1">🤖 Claude AI Analysis:</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{result.aiAnalysis}</p>
                </div>
              )}

              {/* Disease images note */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 mb-4">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <FaImage className="text-blue-400" /> Disease Image Gallery
                </p>
                <p className="text-xs text-gray-500">
                  Search "{result.searchQuery}" on Google Images or PlantVillage dataset to view reference disease images.
                  In production, integrate Unsplash API or PlantNet image search for automatic gallery display.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-xl p-4">
                  <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1"><FaExclamationTriangle className="text-sm" /> Causes</h4>
                  <ul className="space-y-1">
                    {result.causes?.map((c, i) => <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-1"><span className="text-red-400">•</span>{c}</li>)}
                  </ul>
                </div>
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900 rounded-xl p-4">
                  <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1"><FaCheckCircle className="text-sm" /> Treatment</h4>
                  <ul className="space-y-1">
                    {result.treatment?.map((t, i) => <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-1"><span className="text-green-400">✓</span>{t}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {/* Prevention + Fertilizers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FaShieldAlt className="text-blue-500" /> Prevention Techniques
                </h3>
                <ul className="space-y-2">
                  {result.prevention?.map((p, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">{i+1}.</span> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-card p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <FaSeedling className="text-green-500" /> Recommended Fertilizers
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.recommendedFertilizers?.map((f, i) => (
                    <span key={i} className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                      🌿 {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
