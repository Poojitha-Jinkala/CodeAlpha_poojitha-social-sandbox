import React, { useState } from 'react';
import { User } from '../types.ts';
import UserAvatar from './UserAvatar.tsx';

interface EditProfileModalProps {
  user: User;
  onSave: (data: { displayName: string; bio: string; avatar: string }) => Promise<void>;
  onClose: () => void;
}

const AVATAR_GRADIENTS = [
  { name: 'Rose Petal', value: 'from-pink-500 to-rose-500' },
  { name: 'Ocean Depth', value: 'from-blue-500 to-indigo-600' },
  { name: 'Sun flare', value: 'from-amber-400 to-orange-500' },
  { name: 'Emerald Peak', value: 'from-emerald-400 to-teal-500' },
  { name: 'Cosmic Violet', value: 'from-purple-600 to-indigo-700' },
  { name: 'Sunset Orange', value: 'from-red-500 to-yellow-500' },
  { name: 'Monochrome Slate', value: 'from-slate-600 to-slate-800' },
];

export default function EditProfileModal({ user, onSave, onClose }: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [avatarMode, setAvatarMode] = useState<'gradient' | 'url'>(
    user.avatar.startsWith('http') ? 'url' : 'gradient'
  );
  const [avatarGradient, setAvatarGradient] = useState(
    user.avatar.startsWith('http') ? AVATAR_GRADIENTS[0].value : user.avatar
  );
  const [avatarUrl, setAvatarUrl] = useState(user.avatar.startsWith('http') ? user.avatar : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const selectedAvatar = avatarMode === 'gradient' ? avatarGradient : avatarUrl.trim();
      await onSave({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: selectedAvatar || 'from-indigo-500 to-indigo-700',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-slate-900 text-base">Edit profile</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors"
            id="close-edit-modal-btn"
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
                displayName: displayName || user.displayName,
                avatar: avatarMode === 'gradient' ? avatarGradient : avatarUrl || 'from-indigo-500 to-indigo-700',
              }}
              size="xl"
            />
            <p className="text-[11px] text-slate-400 font-mono">Profile preview</p>
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50 transition-colors"
              placeholder="e.g. Sarah Jenkins"
              id="edit-display-name-input"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={160}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50 transition-colors resize-none"
              placeholder="Tell others about yourself..."
              id="edit-bio-input"
            />
            <div className="text-[10px] text-slate-400 text-right font-mono">
              {bio.length}/160 characters
            </div>
          </div>

          {/* Avatar Settings */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">Avatar style</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAvatarMode('gradient')}
                className={`flex-1 py-1.5 text-[11px] rounded-lg border font-medium transition-all ${
                  avatarMode === 'gradient'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                id="select-gradient-mode"
              >
                Gradients
              </button>
              <button
                type="button"
                onClick={() => setAvatarMode('url')}
                className={`flex-1 py-1.5 text-[11px] rounded-lg border font-medium transition-all ${
                  avatarMode === 'url'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                id="select-url-mode"
              >
                Image URL
              </button>
            </div>

            {avatarMode === 'gradient' ? (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {AVATAR_GRADIENTS.map((grad) => (
                  <button
                    key={grad.value}
                    type="button"
                    onClick={() => setAvatarGradient(grad.value)}
                    className={`h-9 rounded-xl bg-gradient-to-br ${grad.value} relative transition-transform ${
                      avatarGradient === grad.value ? 'ring-2 ring-indigo-600 ring-offset-2 scale-95' : 'hover:scale-105'
                    }`}
                    title={grad.name}
                    id={`grad-color-${grad.name.replace(/\s+/g, '-').toLowerCase()}`}
                  />
                ))}
              </div>
            ) : (
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50 transition-colors"
                placeholder="https://images.unsplash.com/photo-..."
                id="avatar-url-input"
              />
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-600 font-semibold hover:bg-slate-50 transition-all"
              id="cancel-edit-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-100 transition-all flex items-center justify-center gap-1.5"
              id="save-profile-btn"
            >
              {loading ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
