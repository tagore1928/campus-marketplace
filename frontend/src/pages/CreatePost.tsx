import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { Sparkles, ArrowRight, Camera, EyeOff, Loader2 } from 'lucide-react';

const CATEGORIES = ['Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other'];

export const CreatePost: React.FC = () => {
  const { profile, token } = useAuth();
  const { alert } = useDialog();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('selling'); // 'selling' | 'free'
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [anonymous, setAnonymous] = useState(false);
  const [expiryOption, setExpiryOption] = useState('none'); // 'none' | '30' | '60' | '90'
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colleges, setColleges] = useState<string[]>([]);
  const [selectedCollege, setSelectedCollege] = useState('');

  useEffect(() => {
    if (profile?.role === 'admin') {
      const fetchColleges = async () => {
        try {
          const res = await axios.get('/api/auth/colleges');
          setColleges(res.data.filter((c: string) => c !== 'Other / Enter Custom...'));
        } catch (err) {
          console.error('Error fetching colleges registry:', err);
        }
      };
      fetchColleges();
    }
  }, [profile]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setImages((prev) => [...prev, ...selectedFiles].slice(0, 5)); // Max 5 images
      
      const filePreviews = selectedFiles.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...filePreviews].slice(0, 5));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !profile) return;
    setError(null);
    setLoading(true);

    if (profile.role === 'admin' && !selectedCollege) {
      setError('Please select a targeted college campus for this listing.');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    // If type is free, set price explicitly to 0
    formData.append('price', type === 'free' ? '0' : price || '0');
    formData.append('type', type);
    formData.append('category', category);
    formData.append('college', profile.role === 'admin' ? selectedCollege : profile.college);
    formData.append('anonymous', String(anonymous));
    formData.append('expiryOption', expiryOption);

    images.forEach((img) => {
      formData.append('images', img);
    });

    try {
      await axios.post('/api/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Listing created successfully.', 'Success');
      navigate('/feed');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto fade-in">
      <div className="mb-8 text-left">
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
          List New Campus Item
        </h2>
        <p className="text-sm font-semibold text-slate-400 mt-1">
          Post an item to share with other students in your college.
        </p>
      </div>

      <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-3xl p-6 md:p-8 shadow-sm">
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-955/20 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-455 text-xs font-bold text-left">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Admin Target Campus Selector */}
          {profile?.role === 'admin' && (
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Target Campus College</label>
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-855 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold cursor-pointer transition-all"
              >
                <option value="" disabled>-- Select targeted campus college --</option>
                {colleges.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Listing Title</label>
            <input
              type="text"
              placeholder="e.g. Organic Chemistry Textbook (3rd Edition)"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
            {/* Offer Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-505 dark:text-slate-450 uppercase tracking-wider">Listing Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none text-sm font-bold cursor-pointer"
              >
                <option value="selling">Selling (Paid)</option>
                <option value="free">Free Stuff (Share / Give Away)</option>
              </select>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-550 dark:text-slate-450 uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none text-sm font-bold cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price (Only if selling) */}
          {type === 'selling' && (
            <div className="flex flex-col gap-1.5 text-left fade-in">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Selling Price (₹)</label>
              <input
                type="number"
                placeholder="e.g. 150"
                required
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold transition-all"
              />
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Description</label>
            <textarea
              placeholder="Provide item details. E.g. usage history, minor highlights/defects, meeting place recommendations on campus..."
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-slate-855 dark:text-slate-200 placeholder-slate-405 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold transition-all"
              rows={4}
            />
          </div>

          {/* Image Uploader */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Upload Product Images (Max 5)</label>
            <div className="grid grid-cols-5 gap-3.5 mt-1">
              {previews.map((src, index) => (
                <div key={index} className="aspect-square relative rounded-xl border border-light-border dark:border-dark-border overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-inner group">
                  <img src={src} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] text-white flex items-center justify-center font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              ))}
              
              {previews.length < 5 && (
                <label className="aspect-square border-2 border-dashed border-slate-305 dark:border-slate-800 hover:border-brand-500 rounded-xl flex flex-col items-center justify-center cursor-pointer text-slate-450 hover:text-brand-500 bg-slate-50/50 dark:bg-dark-surface/40 hover:bg-white transition-all shadow-inner">
                  <Camera className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Anonymous Mode Option */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-light-border dark:border-dark-border my-2">
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-305">
              <EyeOff className="w-4 h-4 text-slate-455" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold">Anonymous Listing</span>
                <span className="text-[10px] text-slate-400 leading-relaxed font-semibold">Mask your profile name/email from standard list viewers until chat begins.</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="w-4.5 h-4.5 accent-brand-605 rounded cursor-pointer"
            />
          </div>

          {/* Expiry Option */}
          <div className="flex flex-col gap-1.5 text-left mb-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Product Listing Expiry</label>
            <select
              value={expiryOption}
              onChange={(e) => setExpiryOption(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-light-border dark:border-dark-border rounded-xl text-slate-850 dark:text-slate-200 focus:outline-none text-sm font-bold cursor-pointer"
            >
              <option value="none">No Expiry</option>
              <option value="30">30 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Publishing Listing...
              </>
            ) : (
              <>
                Publish Listing
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
