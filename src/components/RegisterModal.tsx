import React, { useState } from 'react';
import UserAvatar from './UserAvatar.tsx';

interface RegisterModalProps {
  onRegister: (data: { username: string; displayName: string; bio: string; avatar: string }) => Promise<any>;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'from-pink-500 to-rose-500',
  'from-blue-500 to-indigo-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-purple-600 to-indigo-700',
  'from-red-500 to-yellow-500',
  'from-slate-600 to-slate-800',
];

export default function RegisterModal({ onRegister, onClose }: RegisterModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim()) {
      setError('Name and username are required');
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,15}$/.test(username.trim())) {
      setError('Username must be 3-15 characters and contain only letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onRegister({
        username: username.trim().toLowerCase(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: selectedAvatar,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Username might already be taken');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">Create new persona</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Add an identity to switch to and interact with</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors text-lg"
            id="close-register-modal-btn"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {/* Avatar Preview */}
          <div className="flex flex-col items-center justify-center gap-2 pb-2">
            <UserAvatar
              user={{
                displayName: displayName || 'New User',
                avatar: selectedAvatar,
              }}
              size="xl"
            />
            <p className="text-[11px] text-slate-400 font-mono">Your avatar preview</p>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50 transition-colors"
              placeholder="e.g. Elena Rostova"
              id="register-display-name-input"
            />
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Username</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full text-xs pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50 transition-colors font-mono"
                placeholder="elena_travels"
                id="register-username-input"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={160}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50 transition-colors resize-none"
              placeholder="A short description for your profile..."
              id="register-bio-input"
            />
          </div>

          {/* Avatar Color Choice */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Choose gradient style</label>
            <div className="grid grid-cols-7 gap-1.5">
              {PRESET_AVATARS.map((gradient) => (
                <button
                  key={gradient}
                  type="button"
                  onClick={() => setSelectedAvatar(gradient)}
                  className={`h-8 rounded-xl bg-gradient-to-br ${gradient} relative transition-transform ${
                    selectedAvatar === gradient ? 'ring-2 ring-indigo-600 ring-offset-2 scale-90' : 'hover:scale-105'
                  }`}
                  id={`preset-avatar-${gradient.split(' ')[0]}`}
                />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 font-semibold hover:bg-slate-50 transition-all"
              id="cancel-register-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-100 transition-all flex items-center justify-center"
              id="register-submit-btn"
            >
              {loading ? 'Creating...' : 'Create identity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
