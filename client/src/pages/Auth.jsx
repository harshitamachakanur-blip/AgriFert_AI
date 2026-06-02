import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FaSeedling, FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock, FaInfoCircle } from 'react-icons/fa';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      if (isLogin) {
        await login(data.email, data.password);
        toast.success('Welcome back! 🌱');
      } else {
        await registerUser(data.name, data.email, data.password);
        toast.success('Account created! 🎉');
      }
      navigate('/ai-recommendation');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Authentication failed';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const toggle = () => { setIsLogin(!isLogin); reset(); };

  return (
    <div className="min-h-screen flex items-center justify-center py-20 px-4">
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <FaSeedling className="text-4xl text-green-600 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              {isLogin ? 'Welcome Back' : 'Join AgriFert AI'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {isLogin ? 'Sign in to your account' : 'Create your free account'}
            </p>
          </div>

          {/* Demo mode info banner */}
          <div className="mb-5 flex gap-2 items-start bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <FaInfoCircle className="text-blue-500 text-sm mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              {isLogin
                ? 'Works without a backend server. Your account is stored locally in your browser.'
                : 'No server needed — your account is saved locally in this browser. Use any email & password (min 6 chars).'}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                  <FaUser className="text-green-500 text-xs" />Full Name
                </label>
                <input
                  {...register('name', { required: 'Name required', minLength: { value: 2, message: 'Min 2 chars' } })}
                  placeholder="Your full name"
                  className="input-field"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <FaEnvelope className="text-green-500 text-xs" />Email
              </label>
              <input
                type="email"
                {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                placeholder="you@email.com"
                className="input-field"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <FaLock className="text-green-500 text-xs" />Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  {...register('password', { required: 'Password required', minLength: { value: 6, message: 'Min 6 chars' } })}
                  placeholder="••••••••"
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-2">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing…</>
                : (isLogin ? '🌱 Sign In' : '🎉 Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={toggle} className="text-green-600 font-semibold hover:underline">
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
