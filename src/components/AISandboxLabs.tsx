import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, Zap, MessageSquare, Flame, Check, HelpCircle } from 'lucide-react';
import { User } from '../types.ts';
import UserAvatar from './UserAvatar.tsx';

interface AISandboxLabsProps {
  users: User[];
  currentUser: User;
  onPostCreated: (newPost: any) => void;
}

export default function AISandboxLabs({ users, currentUser, onPostCreated }: AISandboxLabsProps) {
  const [selectedAIUserId, setSelectedAIUserId] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter out the active user so the user triggers OTHER personas to post
  const aiPersonas = users.filter((u) => u.id !== currentUser.id);

  // Set default selection if empty
  React.useEffect(() => {
    if (aiPersonas.length > 0 && !selectedAIUserId) {
      setSelectedAIUserId(aiPersonas[0].id);
    }
  }, [aiPersonas, selectedAIUserId]);

  const handleTriggerAIPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAIUserId) return;

    setLoading(true);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/sandbox/ai-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedAIUserId,
          topic: topic.trim() || undefined
        })
      });

      if (res.ok) {
        const newPost = await res.json();
        onPostCreated(newPost);
        
        const poster = users.find(u => u.id === selectedAIUserId);
        setSuccessMsg(`Simulated @${poster?.username || 'user'} posting live!`);
        setTopic('');
        
        // Clear message after 3 seconds
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedPersona = users.find(u => u.id === selectedAIUserId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900 leading-tight">AI Sandbox Command</h4>
          <p className="text-[10px] text-slate-400 font-mono leading-tight mt-0.5">DIRECT SIMULATED PERSONAS</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-[10px] text-slate-500 leading-relaxed">
        Direct other AI personas to write and share posts in their authentic voice, matching their unique bios and lifestyle profiles.
      </p>

      {/* Action Form */}
      <form onSubmit={handleTriggerAIPost} className="space-y-3">
        {/* Persona Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
            Select Creator Persona
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {aiPersonas.map((user) => {
              const isSelected = selectedAIUserId === user.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedAIUserId(user.id)}
                  className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950 font-semibold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                  id={`sandbox-select-persona-${user.username}`}
                >
                  <UserAvatar user={user} size="sm" />
                  <div className="min-w-0">
                    <p className="text-[10px] leading-none font-bold truncate">{user.displayName}</p>
                    <p className="text-[8px] font-mono text-slate-400 truncate mt-0.5">@{user.username}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Persona Bio preview */}
        {selectedPersona && (
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
            <p className="text-[9px] font-mono text-slate-400 uppercase font-bold mb-0.5">Voice Persona Bio</p>
            <p className="text-[10px] text-slate-600 italic leading-snug truncate">
              "{selectedPersona.bio || 'No bio set.'}"
            </p>
          </div>
        )}

        {/* Topic Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
            Prompt / Broad Topic <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. brutalist design, sunrise yoga, typescript..."
            className="w-full text-[11px] px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50 transition-colors placeholder:text-slate-400"
            id="sandbox-labs-topic-input"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !selectedAIUserId}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-100 transition-all"
          id="sandbox-labs-trigger-post-btn"
        >
          {loading ? (
            <>
              <div className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating Creative Post...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 fill-white/10" />
              <span>Publish Simulated Post</span>
            </>
          )}
        </button>
      </form>

      {/* Success Notification message */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-150 text-emerald-800 text-[10px] rounded-xl font-medium"
          >
            <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
