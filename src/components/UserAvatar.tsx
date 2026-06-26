import React from 'react';
import { User } from '../types.ts';

interface UserAvatarProps {
  user: Pick<User, 'displayName' | 'avatar'>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const isUrl = user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://') || user.avatar.startsWith('/'));

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl font-bold',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (isUrl) {
    return (
      <img
        src={user.avatar}
        alt={user.displayName}
        referrerPolicy="no-referrer"
        className={`rounded-full object-cover border border-slate-200/60 shadow-sm ${sizeClasses[size]} ${className}`}
        id={`avatar-${user.displayName.replace(/\s+/g, '-').toLowerCase()}`}
      />
    );
  }

  // Otherwise, render a gorgeous gradient with initials
  const gradientClass = user.avatar || 'from-indigo-500 to-indigo-700';

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradientClass} text-white flex items-center justify-center font-display shadow-sm border border-white/20 select-none ${sizeClasses[size]} ${className}`}
      id={`avatar-grad-${user.displayName.replace(/\s+/g, '-').toLowerCase()}`}
    >
      {getInitials(user.displayName)}
    </div>
  );
}
