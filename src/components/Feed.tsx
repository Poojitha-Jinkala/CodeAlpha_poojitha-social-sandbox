import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Image, Send, ArrowRight, CornerDownRight, Sparkles, Flame } from 'lucide-react';
import { User } from '../types.ts';
import { EnrichedPost, EnrichedComment } from '../api.ts';
import UserAvatar from './UserAvatar.tsx';

interface FeedProps {
  currentUser: User;
  posts: EnrichedPost[];
  loading: boolean;
  onLike: (postId: string) => Promise<void>;
  onAddComment: (postId: string, content: string) => Promise<void>;
  onAddPost: (content: string, image?: string) => Promise<void>;
  onSelectUser: (userId: string) => void;
  feedType: 'all' | 'following';
  setFeedType: (type: 'all' | 'following') => void;
  onSimulateComments?: (postId: string, commentsCountToAdd: number) => void;
  onSimulateViral?: (postId: string, finalLikesCount: number) => void;
}

export default function Feed({
  currentUser,
  posts,
  loading,
  onLike,
  onAddComment,
  onAddPost,
  onSelectUser,
  feedType,
  setFeedType,
  onSimulateComments,
  onSimulateViral,
}: FeedProps) {
  const [postContent, setPostContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [posting, setPosting] = useState(false);

  // Comments state: mapping postId to comments array & loading state & input state
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  const [postComments, setPostComments] = useState<{ [postId: string]: EnrichedComment[] }>({});
  const [commentsLoading, setCommentsLoading] = useState<{ [postId: string]: boolean }>({});
  const [newCommentText, setNewCommentText] = useState<{ [postId: string]: string }>({});

  const [viralLoading, setViralLoading] = useState<{ [postId: string]: boolean }>({});
  const [aiCommentsLoading, setAiCommentsLoading] = useState<{ [postId: string]: boolean }>({});

  const handleSimulateComments = async (postId: string) => {
    if (aiCommentsLoading[postId]) return;
    setAiCommentsLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      // Expand comments and set commentsLoading to true for immediate visual feedback
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      
      const res = await fetch('/api/sandbox/simulate-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });

      if (res.ok) {
        const newComments = await res.json();
        
        // Append new comments
        setPostComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), ...newComments],
        }));

        // Notify parent App state to increment comment count
        if (onSimulateComments) {
          onSimulateComments(postId, newComments.length);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
      setAiCommentsLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleSimulateViral = async (postId: string) => {
    if (viralLoading[postId]) return;
    setViralLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch('/api/sandbox/simulate-viral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });

      if (res.ok) {
        const data = await res.json();
        // Notify parent App to refresh likesCount and commentsCount
        if (onSimulateViral) {
          onSimulateViral(postId, data.likesCount);
        }
        
        // Auto-expand comments & reload to capture the simulated viral comments
        setExpandedComments((prev) => ({ ...prev, [postId]: true }));
        setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
        
        const commentsRes = await fetch(`/api/posts/${postId}/comments`);
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          setPostComments((prev) => ({ ...prev, [postId]: commentsData }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
      setViralLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    setPosting(true);
    try {
      await onAddPost(postContent.trim(), imageUrl.trim() || undefined);
      setPostContent('');
      setImageUrl('');
      setShowImageInput(false);
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  const toggleComments = async (postId: string) => {
    const isExpanded = !!expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: !isExpanded }));

    if (!isExpanded && !postComments[postId]) {
      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await fetch(`/api/posts/${postId}/comments`);
        if (res.ok) {
          const data = await res.json();
          setPostComments((prev) => ({ ...prev, [postId]: data }));
        }
      } catch (err) {
        console.error('Failed to load comments', err);
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleCommentSubmit = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const commentContent = newCommentText[postId] || '';
    if (!commentContent.trim()) return;

    try {
      await onAddComment(postId, commentContent.trim());
      setNewCommentText((prev) => ({ ...prev, [postId]: '' }));

      // Reload comments
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setPostComments((prev) => ({ ...prev, [postId]: data }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Feed Toggle */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setFeedType('all')}
          className={`flex-1 py-4 text-xs font-bold font-display tracking-widest uppercase transition-all relative ${
            feedType === 'all' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="feed-toggle-all"
        >
          All activity
          {feedType === 'all' && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
            />
          )}
        </button>
        <button
          onClick={() => setFeedType('following')}
          className={`flex-1 py-4 text-xs font-bold font-display tracking-widest uppercase transition-all relative ${
            feedType === 'following' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="feed-toggle-following"
        >
          Following
          {feedType === 'following' && (
            <motion.div
              layoutId="activeTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
            />
          )}
        </button>
      </div>

      {/* Post Composer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
      >
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex items-start gap-4">
            <UserAvatar user={currentUser} size="md" />
            <div className="flex-1 min-w-0">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                rows={3}
                placeholder={`What's happening, ${currentUser.displayName}?`}
                className="w-full text-slate-800 text-sm placeholder-slate-400 focus:outline-none bg-transparent resize-none leading-relaxed py-1"
                id="post-composer-textarea"
              />
            </div>
          </div>

          <AnimatePresence>
            {showImageInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste image URL (e.g., from Unsplash...)"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50 transition-colors"
                    id="post-composer-image-input"
                  />
                  {imageUrl.startsWith('http') && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 max-h-48">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowImageInput(!showImageInput)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                showImageInput
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-50'
              }`}
              id="post-composer-toggle-image-btn"
            >
              <Image className="w-3.5 h-3.5" />
              {showImageInput ? 'Remove image' : 'Add media'}
            </button>

            <button
              type="submit"
              disabled={posting || !postContent.trim()}
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-100 transition-all"
              id="post-composer-submit-btn"
            >
              {posting ? 'Publishing...' : 'Post It'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </motion.div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-400">Loading timeline...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <p className="text-xs text-slate-400 mb-2 font-semibold">Nothing on the radar yet</p>
            <p className="text-[11px] text-slate-400/80 leading-relaxed max-w-xs mx-auto">
              {feedType === 'following'
                ? "Posts from creators you follow will show up here. Follow some creators from the suggested list!"
                : "Be the first to share your thoughts on the platform!"}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {posts.map((post, idx) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(idx * 0.05, 0.3) } }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
                id={`post-card-${post.id}`}
              >
                {/* Header */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onSelectUser(post.author.id)}
                    className="flex items-center gap-3 text-left focus:outline-none group"
                    id={`post-author-btn-${post.id}`}
                  >
                    <UserAvatar user={post.author} size="md" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {post.author.displayName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">@{post.author.username}</p>
                    </div>
                  </button>

                  <span className="text-[10px] text-slate-400 ml-auto font-mono">
                    {formatTimestamp(post.createdAt)}
                  </span>
                </div>

                {/* Content */}
                <p className="mt-4 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {post.content}
                </p>

                {/* Media Image */}
                {post.image && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-slate-200/50 max-h-96 bg-slate-50">
                    <img
                      src={post.image}
                      alt="Post media"
                      className="w-full object-cover max-h-96 hover:scale-[1.01] transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Actions Row */}
                <div className="flex items-center gap-6 mt-5 pt-3.5 border-t border-slate-100">
                  <button
                    onClick={() => onLike(post.id)}
                    className={`flex items-center gap-2 text-xs font-semibold transition-colors focus:outline-none group ${
                      post.isLiked
                        ? 'text-rose-500'
                        : 'text-slate-400 hover:text-rose-500'
                    }`}
                    id={`post-like-btn-${post.id}`}
                  >
                    <Heart className={`w-4 h-4 transition-transform active:scale-125 group-hover:fill-rose-500 ${post.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{post.likesCount}</span>
                  </button>

                  <button
                    onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-2 text-xs font-semibold transition-colors focus:outline-none ${
                      expandedComments[post.id]
                        ? 'text-indigo-600'
                        : 'text-slate-400 hover:text-indigo-600'
                    }`}
                    id={`post-comments-btn-${post.id}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentsCount}</span>
                  </button>

                  {/* AI Comments Sparker */}
                  <button
                    onClick={() => handleSimulateComments(post.id)}
                    disabled={aiCommentsLoading[post.id]}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-600 disabled:opacity-40 transition-colors focus:outline-none ml-auto"
                    id={`post-ai-comments-btn-${post.id}`}
                    title="Generate character-authentic simulated comments on this post using Gemini"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${aiCommentsLoading[post.id] ? 'animate-pulse text-indigo-500' : ''}`} />
                    <span>AI Chatter</span>
                  </button>

                  {/* Viral Wave Sparker */}
                  <button
                    onClick={() => handleSimulateViral(post.id)}
                    disabled={viralLoading[post.id]}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-500 disabled:opacity-40 transition-colors focus:outline-none"
                    id={`post-viral-btn-${post.id}`}
                    title="Instantly generate a surge of likes and viral comments for this post"
                  >
                    <Flame className={`w-3.5 h-3.5 ${viralLoading[post.id] ? 'animate-bounce text-amber-500' : ''}`} />
                    <span>Viral Wave</span>
                  </button>
                </div>

                {/* Comments Section */}
                {expandedComments[post.id] && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                    {/* Comments List */}
                    {commentsLoading[post.id] ? (
                      <div className="text-center py-4">
                        <div className="inline-block w-4 h-4 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {postComments[post.id]?.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">No comments yet. Start the conversation!</p>
                        ) : (
                          postComments[post.id]?.map((comment) => (
                            <div key={comment.id} className="flex gap-2.5 group">
                              <CornerDownRight className="w-3.5 h-3.5 text-slate-300 mt-1 flex-shrink-0" />
                              <div className="flex-1 bg-slate-50/80 hover:bg-slate-50 transition-colors p-3 rounded-2xl border border-slate-100 text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <button
                                    onClick={() => onSelectUser(comment.author.id)}
                                    className="font-bold text-slate-900 hover:text-indigo-600 text-[11px]"
                                    id={`comment-author-${comment.id}`}
                                  >
                                    {comment.author.displayName}
                                  </button>
                                  <span className="text-[9px] text-slate-400 font-mono">
                                    {formatTimestamp(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-slate-600 leading-relaxed text-[11px]">{comment.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* New Comment Input */}
                    <form
                      onSubmit={(e) => handleCommentSubmit(post.id, e)}
                      className="flex items-center gap-2 pt-1"
                    >
                      <input
                        type="text"
                        value={newCommentText[post.id] || ''}
                        onChange={(e) =>
                          setNewCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        placeholder="Write a comment..."
                        className="flex-1 text-[11px] px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 bg-slate-50/50 transition-colors"
                        id={`post-comment-input-${post.id}`}
                      />
                      <button
                        type="submit"
                        disabled={!(newCommentText[post.id] || '').trim()}
                        className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-white transition-colors"
                        id={`post-comment-submit-btn-${post.id}`}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}
              </motion.article>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
