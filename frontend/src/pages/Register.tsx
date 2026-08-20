import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [customCollege, setCustomCollege] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register({ email, password, name, collegeId: collegeId || undefined, customCollege: customCollege || undefined });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  const emailValid = email.endsWith('.edu.in') || email.endsWith('.in');

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl mb-4 text-center">Register</h2>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <label className="block mb-2">
          Name
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="mt-1 w-full border rounded p-2"
          />
        </label>
        <label className="block mb-2">
          Email (must end with .edu.in or .in)
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="mt-1 w-full border rounded p-2"
          />
          {!emailValid && email && <p className="text-sm text-red-500">Email must end with .edu.in or .in</p>}
        </label>
        <label className="block mb-2">
          Password (min 8 chars)
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full border rounded p-2"
          />
        </label>
        <label className="block mb-2">
          College (optional, choose or enter custom)
          <select
            value={collegeId}
            onChange={e => setCollegeId(e.target.value)}
            className="mt-1 w-full border rounded p-2"
          >
            <option value="">Select College</option>
            {/* Placeholder options – replace with real list from backend */}
            <option value="1">College A</option>
            <option value="2">College B</option>
          </select>
        </label>
        <label className="block mb-4">
          Custom College Name (if not selected above)
          <input
            type="text"
            value={customCollege}
            onChange={e => setCustomCollege(e.target.value)}
            className="mt-1 w-full border rounded p-2"
          />
        </label>
        <button
          type="submit"
          disabled={!emailValid || !password || !name}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Register
        </button>
        <p className="mt-4 text-center">
          Already have an account? <a href="/login" className="text-blue-600">Login</a>
        </p>
      </form>
    </div>
  );
};

export default Register;
