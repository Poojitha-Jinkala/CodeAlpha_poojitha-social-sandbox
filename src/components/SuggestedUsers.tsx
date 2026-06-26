import React from 'react';
import { User } from '../types.ts';
import UserAvatar from './UserAvatar.tsx';

interface SuggestedUsersProps {
  users: User[];
  currentUserId: string;
  followingIds: string[];
  onToggleFollow: (targetUserId: string) => void;
  onSelectUser: (userId: string) => void;
}

export default function SuggestedUsers({
  users,
  currentUserId,
  followingIds,
  onToggleFollow,
  onSelectUser,
}: SuggestedUsersProps) {
  // Exclude current user from suggestions
  const suggestions = users.filter((u) => u.id !== currentUserId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h3 className="font-display font-bold text-slate-900 mb-4 text-xs uppercase tracking-widest">
        Suggested for you
      </h3>
      
      {suggestions.length === 0 ? (
        <p className="text-xs text-slate-400">No suggestions available</p>
      ) : (
        <div className="space-y-4">
          {suggestions.map((user) => {
            const isFollowing = followingIds.includes(user.id);
            return (
              <div key={user.id} className="flex items-center justify-between gap-3 group">
                <button
                  onClick={() => onSelectUser(user.id)}
                  className="flex items-center gap-3 text-left focus:outline-none flex-1 min-w-0"
                  id={`suggested-user-btn-${user.username}`}
                >
                  <UserAvatar user={user} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 truncate transition-colors">
                      {user.displayName}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">@{user.username}</p>
                  </div>
                </button>

                <button
                  onClick={() => onToggleFollow(user.id)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all duration-200 ${
                    isFollowing
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-100'
                  }`}
                  id={`follow-toggle-${user.username}`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Platform status</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Online
          </span>
        </div>
        <p className="text-[10px] text-slate-400/80 leading-relaxed mt-1">
          Each persona runs in sandboxed client persistence with local JSON storage syncing.
        </p>
      </div>
    </div>
  );
}
