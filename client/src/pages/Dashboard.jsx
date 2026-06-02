import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { FaSeedling, FaMicroscope, FaTrophy, FaChartLine, FaLeaf, FaCalendar } from 'react-icons/fa';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="glass-card p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="text-white text-lg" />
      </div>
    </div>
    <div className="text-3xl font-bold text-gray-800 dark:text-white">{value}</div>
    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-0.5">{label}</div>
    {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    API.get('/analytics/dashboard')
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, navigate]);

  if (!user) return null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Loading your analytics…</p>
      </div>
    </div>
  );

  const empty = !data || data.summary.totalRecommendations === 0;

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="section-title mb-1">📊 Analytics Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Welcome back, <span className="font-semibold text-green-600">{user.name}</span>!</p>
        </div>

        {empty ? (
          <div className="glass-card p-12 text-center">
            <FaSeedling className="text-5xl text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">No data yet</h3>
            <p className="text-gray-500 mb-6">Generate your first AI recommendation to see analytics here.</p>
            <button onClick={() => navigate('/ai-recommendation')} className="btn-primary">Get Recommendation</button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={FaSeedling} label="Total Recommendations" value={data.summary.totalRecommendations} sub="AI generated" color="bg-green-500" />
              <StatCard icon={FaMicroscope} label="Disease Detections" value={data.summary.totalDiseaseDetections} sub="Analyzed" color="bg-blue-500" />
              <StatCard icon={FaTrophy} label="Avg. Confidence" value={`${data.summary.avgConfidence}%`} sub="AI accuracy" color="bg-yellow-500" />
              <StatCard icon={FaLeaf} label="Unique Crops" value={data.summary.uniqueCrops} sub="Crop types" color="bg-purple-500" />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fertilizer Frequency */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaTrophy className="text-yellow-500" /> Top Fertilizers Used
                </h3>
                {data.topFertilizers?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.topFertilizers} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#22c55e" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-sm text-center py-8">No data yet</p>}
              </div>

              {/* Crop-wise */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaLeaf className="text-green-500" /> Crop-wise Activity
                </h3>
                {data.cropStats?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data.cropStats} dataKey="count" nameKey="crop" cx="50%" cy="50%" outerRadius={80} label={({ crop, percent }) => `${crop} (${(percent*100).toFixed(0)}%)`} labelLine={false}>
                        {data.cropStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-sm text-center py-8">No data yet</p>}
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaChartLine className="text-blue-500" /> Monthly Trend
                </h3>
                {data.monthlyTrend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-sm text-center py-8">Not enough data</p>}
              </div>

              {/* Top Diseases */}
              <div className="glass-card p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaMicroscope className="text-red-500" /> Disease Detections
                </h3>
                {data.topDiseases?.length > 0 ? (
                  <div className="space-y-3">
                    {data.topDiseases.map((d, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{d.name}</span>
                            <span className="text-gray-500">{d.count}x</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(d.count / data.topDiseases[0].count) * 100}%`, background: COLORS[i % COLORS.length] }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-400 text-sm text-center py-8">No detections yet</p>}
              </div>
            </div>

            {/* Recent Activity */}
            {data.recentActivity?.length > 0 && (
              <div className="glass-card p-5">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <FaCalendar className="text-purple-500" /> Recent Activity
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                        <th className="pb-3 pr-4">Crop</th>
                        <th className="pb-3 pr-4">Fertilizer</th>
                        <th className="pb-3 pr-4">Confidence</th>
                        <th className="pb-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {data.recentActivity.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-3 pr-4 font-medium text-gray-800 dark:text-gray-200">{r.cropType}</td>
                          <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{r.fertilizerName}</td>
                          <td className="py-3 pr-4">
                            <span className={`font-semibold ${r.confidence >= 85 ? 'text-green-600' : r.confidence >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {r.confidence}%
                            </span>
                          </td>
                          <td className="py-3 text-gray-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
