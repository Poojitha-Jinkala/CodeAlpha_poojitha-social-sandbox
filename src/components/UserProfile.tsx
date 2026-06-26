import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, UserPlus, UserMinus, Edit, Grid, Users } from 'lucide-react';
import { User } from '../types.ts';
import { UserDetails, EnrichedPost, fetchUser } from '../api.ts';
import UserAvatar from './UserAvatar.tsx';
import EditProfileModal from './EditProfileModal.tsx';

interface UserProfileProps {
  userId: string;
  currentUser: User;
  onBackToFeed: () => void;
  onToggleFollow: (targetUserId: string) => Promise<void>;
  onSelectUser: (userId: string) => void;
  onUpdateCurrentUserProfile: (data: { displayName: string; bio: string; avatar: string }) => Promise<void>;
  onLikePost: (postId: string) => Promise<void>;
  onAddComment: (postId: string, content: string) => Promise<void>;
}

export default function UserProfile({
  userId,
  currentUser,
  onBackToFeed,
  onToggleFollow,
  onSelectUser,
  onUpdateCurrentUserProfile,
  onLikePost,
  onAddComment,
}: UserProfileProps) {
  const [profile, setProfile] = useState<UserDetails | null>(null);
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'followers' | 'following'>('posts');
  const [showEditModal, setShowEditModal] = useState(false);

  // Lists of followers / following profiles
  const [followersList, setFollowersList] = useState<User[]>([]);
  const [followingList, setFollowingList] = useState<User[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const isOwnProfile = currentUser.id === userId;

  const loadProfile = async () => {
    setLoading(true);
    try {
      const details = await fetchUser(userId);
      setProfile(details);

      // Load user's posts
      const res = await fetch(`/api/posts?currentUserId=${currentUser.id}`);
      if (res.ok) {
        const allPosts: EnrichedPost[] = await res.json();
        const userPosts = allPosts.filter((p) => p.userId === userId);
        setPosts(userPosts);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [userId, currentUser.id]);

  useEffect(() => {
    if (activeTab !== 'posts' && profile) {
      loadRelations();
    }
  }, [activeTab, profile]);

  const loadRelations = async () => {
    if (!profile) return;
    setListLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const allUsers: User[] = await res.json();
        
        if (activeTab === 'followers') {
          const list = allUsers.filter((u) => profile.followers.includes(u.id));
          setFollowersList(list);
        } else if (activeTab === 'following') {
          const list = allUsers.filter((u) => profile.following.includes(u.id));
          setFollowingList(list);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setListLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!profile) return;
    await onToggleFollow(profile.id);
    // Reload profile stats
    const details = await fetchUser(userId);
    setProfile(details);
  };

  const handleUpdateProfile = async (data: { displayName: string; bio: string; avatar: string }) => {
    await onUpdateCurrentUserProfile(data);
    // Reload profile info
    const details = await fetchUser(userId);
    setProfile(details);
  };

  const handleLikePostInternal = async (postId: string) => {
    await onLikePost(postId);
    // Refresh posts to show updated likes counts/states
    const res = await fetch(`/api/posts?currentUserId=${currentUser.id}`);
    if (res.ok) {
      const allPosts: EnrichedPost[] = await res.json();
      const userPosts = allPosts.filter((p) => p.userId === userId);
      setPosts(userPosts);
    }
  };

  const handleCommentSubmit = async (postId: string, commentContent: string) => {
    await onAddComment(postId, commentContent);
    // Refresh posts to show comments count
    const res = await fetch(`/api/posts?currentUserId=${currentUser.id}`);
    if (res.ok) {
      const allPosts: EnrichedPost[] = await res.json();
      const userPosts = allPosts.filter((p) => p.userId === userId);
      setPosts(userPosts);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24">
        <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-slate-400">Syncing profile details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-xs text-slate-500">Profile could not be loaded.</p>
        <button onClick={onBackToFeed} className="mt-4 text-xs font-semibold text-indigo-600 hover:underline">
          Go back to feed
        </button>
      </div>
    );
  }

  const isFollowing = profile.followers.includes(currentUser.id);

  return (
    <div className="space-y-6">
      {/* Profile Header Block */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
        {/* Mock Banner */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-slate-100 bg-gradient-to-r from-slate-100 to-slate-200/40" />

        <div className="relative pt-12 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <UserAvatar user={profile} size="xl" className="ring-4 ring-white relative z-10" />
            <div className="pb-1">
              <h2 className="font-display font-bold text-slate-900 text-lg tracking-tight">
                {profile.displayName}
              </h2>
              <p className="text-xs font-mono text-slate-400">@{profile.username}</p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {isOwnProfile ? (
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 font-bold text-[11px] text-slate-700 transition-all w-full sm:w-auto"
                id="profile-edit-btn"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleToggleFollow}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-bold text-[11px] transition-all w-full sm:w-auto ${
                  isFollowing
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100'
                }`}
                id="profile-follow-btn"
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="w-3.5 h-3.5" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Bio */}
        <p className="mt-5 text-xs text-slate-600 leading-relaxed max-w-xl">
          {profile.bio || "No description set yet."}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-3 mt-4 text-[10px] text-slate-400 font-mono">
          <Calendar className="w-3.5 h-3.5 text-slate-300" />
          <span>Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        </div>

        {/* Stats Grid */}
        <div className="flex gap-6 mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('posts')}
            className="flex items-baseline gap-1.5 hover:opacity-80 transition-opacity"
            id="tab-btn-posts"
          >
            <span className="font-display font-bold text-slate-900 text-sm">{profile.postsCount}</span>
            <span className="text-[11px] text-slate-400">posts</span>
          </button>
          <button
            onClick={() => setActiveTab('followers')}
            className="flex items-baseline gap-1.5 hover:opacity-80 transition-opacity"
            id="tab-btn-followers"
          >
            <span className="font-display font-bold text-slate-900 text-sm">{profile.followersCount}</span>
            <span className="text-[11px] text-slate-400">followers</span>
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className="flex items-baseline gap-1.5 hover:opacity-80 transition-opacity"
            id="tab-btn-following"
          >
            <span className="font-display font-bold text-slate-900 text-sm">{profile.followingCount}</span>
            <span className="text-[11px] text-slate-400">following</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation for Content */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex gap-4 border-b border-slate-100 pb-3 mb-5">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-1.5 pb-2 text-xs font-semibold font-display relative ${
              activeTab === 'posts' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
            id="profile-tab-posts"
          >
            <Grid className="w-3.5 h-3.5" />
            Posts
            {activeTab === 'posts' && (
              <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('followers')}
            className={`flex items-center gap-1.5 pb-2 text-xs font-semibold font-display relative ${
              activeTab === 'followers' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
            id="profile-tab-followers"
          >
            <Users className="w-3.5 h-3.5" />
            Followers
            {activeTab === 'followers' && (
              <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('following')}
            className={`flex items-center gap-1.5 pb-2 text-xs font-semibold font-display relative ${
              activeTab === 'following' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
            id="profile-tab-following"
          >
            <Users className="w-3.5 h-3.5" />
            Following
            {activeTab === 'following' && (
              <motion.div layoutId="profileTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        </div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          {activeTab === 'posts' && (
            <motion.div
              key="posts-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {posts.length === 0 ? (
                <p className="text-center py-10 text-xs text-slate-400">No posts shared yet by this creator.</p>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:border-slate-200 transition-all text-xs"
                      id={`profile-post-card-${post.id}`}
                    >
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line">{post.content}</p>
                      {post.image && (
                        <img
                          src={post.image}
                          alt="Post attachment"
                          className="mt-3 rounded-lg max-h-60 object-cover w-full border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="flex items-center justify-between mt-4 text-[10px] text-slate-400">
                        <div className="flex gap-4">
                          <button
                            onClick={() => handleLikePostInternal(post.id)}
                            className={`hover:text-rose-500 transition-colors ${post.isLiked ? 'text-rose-500 font-bold' : ''}`}
                            id={`profile-post-like-${post.id}`}
                          >
                            {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
                          </button>
                          <span>{post.commentsCount} comments</span>
                        </div>
                        <span className="font-mono">{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'followers' && (
            <motion.div
              key="followers-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {listLoading ? (
                <div className="text-center py-6">
                  <div className="inline-block w-4 h-4 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : followersList.length === 0 ? (
                <p className="text-center py-10 text-xs text-slate-400">No followers yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {followersList.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => onSelectUser(user.id)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-all"
                      id={`follower-card-btn-${user.username}`}
                    >
                      <UserAvatar user={user} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-slate-950 truncate max-w-[120px]">
                          {user.displayName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">@{user.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'following' && (
            <motion.div
              key="following-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {listLoading ? (
                <div className="text-center py-6">
                  <div className="inline-block w-4 h-4 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : followingList.length === 0 ? (
                <p className="text-center py-10 text-xs text-slate-400">Not following anyone yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {followingList.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => onSelectUser(user.id)}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-all"
                      id={`following-card-btn-${user.username}`}
                    >
                      <UserAvatar user={user} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-slate-950 truncate max-w-[120px]">
                          {user.displayName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">@{user.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showEditModal && (
        <EditProfileModal user={profile} onSave={handleUpdateProfile} onClose={() => setShowEditModal(false)} />
      )}
    </div>
  );
}
