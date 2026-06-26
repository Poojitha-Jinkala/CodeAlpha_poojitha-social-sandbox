import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Compass, Home, User, PlusCircle, Users, Sparkles, ChevronDown } from 'lucide-react';
import { User as UserModel } from './types.ts';
import {
  fetchUsers,
  fetchPosts,
  createUser,
  likePost,
  createPost,
  createComment,
  toggleFollow,
  updateUser,
  EnrichedPost,
} from './api.ts';
import UserAvatar from './components/UserAvatar.tsx';
import SuggestedUsers from './components/SuggestedUsers.tsx';
import RegisterModal from './components/RegisterModal.tsx';
import Feed from './components/Feed.tsx';
import UserProfile from './components/UserProfile.tsx';
import AISandboxLabs from './components/AISandboxLabs.tsx';

export default function App() {
  const [users, setUsers] = useState<UserModel[]>([]);
  const [currentUser, setCurrentUser] = useState<UserModel | null>(null);
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [feedType, setFeedType] = useState<'all' | 'following'>('all');
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedUsers = await fetchUsers();
      setUsers(fetchedUsers);

      // Default to first user if none is active
      let activeUser = fetchedUsers[0];
      const savedUserId = localStorage.getItem('current_persona_id');
      if (savedUserId) {
        const found = fetchedUsers.find((u) => u.id === savedUserId);
        if (found) activeUser = found;
      }

      setCurrentUser(activeUser);
      if (activeUser) {
        localStorage.setItem('current_persona_id', activeUser.id);
        
        // Load following ids
        const userRes = await fetch(`/api/users/${activeUser.id}`);
        if (userRes.ok) {
          const details = await userRes.json();
          setFollowingIds(details.following || []);
        }
      }

      // Load posts
      const fetchedPosts = await fetchPosts(activeUser?.id, feedType);
      setPosts(fetchedPosts);
    } catch (err: any) {
      console.error(err);
      setError('Connection refused or server is sleeping. Starting backend server sync...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload posts when feed type changes
  useEffect(() => {
    if (currentUser) {
      const loadTimeline = async () => {
        try {
          const timeline = await fetchPosts(currentUser.id, feedType);
          setPosts(timeline);
        } catch (err) {
          console.error(err);
        }
      };
      loadTimeline();
    }
  }, [feedType, currentUser?.id]);

  const handleSwitchPersona = async (user: UserModel) => {
    setCurrentUser(user);
    localStorage.setItem('current_persona_id', user.id);
    setShowPersonaDropdown(false);
    setSelectedProfileId(null); // Return to feed when switching identity

    try {
      // Reload following details
      const userRes = await fetch(`/api/users/${user.id}`);
      if (userRes.ok) {
        const details = await userRes.json();
        setFollowingIds(details.following || []);
      }

      // Reload posts
      const timeline = await fetchPosts(user.id, feedType);
      setPosts(timeline);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegisterPersona = async (userData: {
    username: string;
    displayName: string;
    bio: string;
    avatar: string;
  }) => {
    const newUser = await createUser(userData);
    // Refresh user list
    const updatedUsers = await fetchUsers();
    setUsers(updatedUsers);
    // Switch to new persona
    await handleSwitchPersona(newUser);
  };

  const handleUpdateCurrentUserProfile = async (data: {
    displayName: string;
    bio: string;
    avatar: string;
  }) => {
    if (!currentUser) return;
    const updated = await updateUser(currentUser.id, data);
    
    // Update local lists
    setCurrentUser(updated);
    const updatedUsers = await fetchUsers();
    setUsers(updatedUsers);

    // Refresh posts
    const timeline = await fetchPosts(updated.id, feedType);
    setPosts(timeline);
  };

  const handleLikePost = async (postId: string) => {
    if (!currentUser) return;
    try {
      const response = await likePost(postId, currentUser.id);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, likesCount: response.likesCount, isLiked: response.isLiked }
            : post
        )
      );
    } catch (err) {
      console.error('Like failed', err);
    }
  };

  const handleAddPost = async (content: string, image?: string) => {
    if (!currentUser) return;
    try {
      const newPost = await createPost(currentUser.id, content, image);
      setPosts((prev) => [newPost, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId: string, content: string) => {
    if (!currentUser) return;
    try {
      await createComment(postId, currentUser.id, content);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, commentsCount: post.commentsCount + 1 } : post
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFollow = async (targetUserId: string) => {
    if (!currentUser) return;
    try {
      const res = await toggleFollow(currentUser.id, targetUserId);
      if (res.following) {
        setFollowingIds((prev) => [...prev, targetUserId]);
      } else {
        setFollowingIds((prev) => prev.filter((id) => id !== targetUserId));
      }

      // Refresh post list (incase we are on following tab)
      const timeline = await fetchPosts(currentUser.id, feedType);
      setPosts(timeline);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateCommentsCount = (postId: string, commentsCountToAdd: number) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, commentsCount: post.commentsCount + commentsCountToAdd } : post
      )
    );
  };

  const handleSimulateViralCount = (postId: string, finalLikesCount: number) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, likesCount: finalLikesCount } : post
      )
    );
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-slate-900 px-4">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <h2 className="font-display font-bold text-lg">Waking up Relay...</h2>
          <p className="text-xs text-slate-400 mt-1">Booting micro-database storage</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] selection:bg-indigo-100 selection:text-indigo-900 pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 z-30">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between">
          <button
            onClick={() => setSelectedProfileId(null)}
            className="flex items-center gap-2 group focus:outline-none"
            id="brand-logo-btn"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-display font-bold text-sm tracking-tighter shadow-sm shadow-indigo-100">
              R
            </div>
            <span className="font-display font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight">
              Relay
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md font-mono font-medium">
              Sleek Sandbox
            </span>
          </button>

          {/* User Persona Switcher in Header */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-all text-left focus:outline-none border border-slate-200"
                id="persona-switcher-btn"
              >
                <UserAvatar user={currentUser} size="sm" />
                <div className="hidden sm:block">
                  <p className="text-[11px] font-bold text-slate-900 leading-none">
                    {currentUser.displayName}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">
                    Act as @{currentUser.username}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
              </button>

              <AnimatePresence>
                {showPersonaDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowPersonaDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-lg p-2.5 z-50 space-y-1"
                      id="persona-switcher-dropdown"
                    >
                      <p className="text-[10px] text-slate-400 font-bold px-2.5 py-1 mb-1 font-mono tracking-wider uppercase">
                        Switch Active Persona
                      </p>
                      
                      <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                        {users.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleSwitchPersona(user)}
                            className={`flex items-center gap-2.5 w-full text-left p-2 rounded-xl transition-all ${
                              currentUser.id === user.id
                                ? 'bg-indigo-600 text-white'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                            id={`switch-persona-item-${user.username}`}
                          >
                            <UserAvatar user={user} size="sm" />
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold truncate ${currentUser.id === user.id ? 'text-white' : 'text-slate-900'}`}>
                                {user.displayName}
                              </p>
                              <p className={`text-[10px] font-mono truncate ${currentUser.id === user.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                                @{user.username}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="pt-2 mt-1 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setShowPersonaDropdown(false);
                            setShowRegisterModal(true);
                          }}
                          className="flex items-center justify-center gap-2 w-full text-center py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
                          id="dropdown-create-persona-btn"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Add new identity
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 mt-8">
        {error ? (
          <div className="p-4 bg-indigo-50 text-indigo-800 rounded-2xl border border-indigo-150 text-xs leading-relaxed max-w-lg mx-auto text-center shadow-sm">
            {error}
            <button
              onClick={loadInitialData}
              className="block mx-auto mt-3 px-4 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-semibold"
            >
              Reconnect
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Quick Profile Panel & Navigation */}
            <section className="lg:col-span-3 space-y-4">
              {currentUser && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={currentUser} size="md" />
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {currentUser.displayName}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        @{currentUser.username}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed italic">
                    {currentUser.bio || "Crafting experiences on Relay..."}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedProfileId(null)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        selectedProfileId === null
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                      id="sidebar-nav-home"
                    >
                      <Home className="w-4 h-4" />
                      Home Timeline
                    </button>
                    <button
                      onClick={() => setSelectedProfileId(currentUser.id)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        selectedProfileId === currentUser.id
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                      id="sidebar-nav-profile"
                    >
                      <User className="w-4 h-4" />
                      My Profile Page
                    </button>
                  </div>
                </div>
              )}

              {/* Tips Banner (Upgraded Pro-style card from Sleek design) */}
              <div className="bg-indigo-50 text-slate-800 rounded-2xl p-5 border border-indigo-100/70 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full translate-x-8 -translate-y-8" />
                <div className="flex items-center gap-1.5 text-indigo-600 text-[10px] font-bold font-mono tracking-wider uppercase mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Momentum Sandbox
                </div>
                <h4 className="font-display font-bold text-xs text-indigo-950 leading-tight mb-1.5">
                  Multi-identity Space
                </h4>
                <p className="text-[10px] text-indigo-700 leading-relaxed">
                  Switch perspectives instantly via the switcher menu. Post as Elena, like as Alex, and build a beautiful social network interactively!
                </p>
              </div>
            </section>

            {/* Middle Column: Central Content (Feed or Profile) */}
            <section className="lg:col-span-6">
              {selectedProfileId ? (
                <UserProfile
                  userId={selectedProfileId}
                  currentUser={currentUser!}
                  onBackToFeed={() => setSelectedProfileId(null)}
                  onToggleFollow={handleToggleFollow}
                  onSelectUser={(id) => setSelectedProfileId(id)}
                  onUpdateCurrentUserProfile={handleUpdateCurrentUserProfile}
                  onLikePost={handleLikePost}
                  onAddComment={handleAddComment}
                />
              ) : (
                <Feed
                  currentUser={currentUser!}
                  posts={posts}
                  loading={loading}
                  onLike={handleLikePost}
                  onAddComment={handleAddComment}
                  onAddPost={handleAddPost}
                  onSelectUser={(id) => setSelectedProfileId(id)}
                  feedType={feedType}
                  setFeedType={setFeedType}
                  onSimulateComments={handleSimulateCommentsCount}
                  onSimulateViral={handleSimulateViralCount}
                />
              )}
            </section>

            {/* Right Column: Suggested Users & Stats */}
            <section className="lg:col-span-3 space-y-4">
              {currentUser && (
                <>
                  <SuggestedUsers
                    users={users}
                    currentUserId={currentUser.id}
                    followingIds={followingIds}
                    onToggleFollow={handleToggleFollow}
                    onSelectUser={(id) => setSelectedProfileId(id)}
                  />
                  <AISandboxLabs
                    users={users}
                    currentUser={currentUser}
                    onPostCreated={(newPost) => {
                      setPosts((prev) => [newPost, ...prev]);
                    }}
                  />
                </>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Register Modal */}
      {showRegisterModal && (
        <RegisterModal onRegister={handleRegisterPersona} onClose={() => setShowRegisterModal(false)} />
      )}
    </div>
  );
}
