import { User, Post, Comment } from './types.ts';

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch('/api/users');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch users');
  }
  return res.json();
}

export async function createUser(userData: {
  username: string;
  displayName: string;
  bio: string;
  avatar: string;
}): Promise<User> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create user');
  }
  return res.json();
}

export interface UserDetails extends User {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  followers: string[];
  following: string[];
}

export async function fetchUser(id: string): Promise<UserDetails> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch user details');
  }
  return res.json();
}

export async function updateUser(
  id: string,
  data: { displayName: string; bio: string; avatar: string }
): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update user profile');
  }
  return res.json();
}

export interface EnrichedPost extends Post {
  author: User;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
}

export async function fetchPosts(currentUserId?: string, feed?: 'all' | 'following'): Promise<EnrichedPost[]> {
  let url = '/api/posts';
  const params = new URLSearchParams();
  if (currentUserId) params.append('currentUserId', currentUserId);
  if (feed) params.append('feed', feed);
  
  const queryStr = params.toString();
  if (queryStr) url += `?${queryStr}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch posts');
  }
  return res.json();
}

export async function createPost(userId: string, content: string, image?: string): Promise<EnrichedPost> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, content, image }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create post');
  }
  return res.json();
}

export interface LikeResponse {
  likes: string[];
  likesCount: number;
  isLiked: boolean;
}

export async function likePost(postId: string, userId: string): Promise<LikeResponse> {
  const res = await fetch(`/api/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to like post');
  }
  return res.json();
}

export interface EnrichedComment extends Comment {
  author: User;
}

export async function fetchComments(postId: string): Promise<EnrichedComment[]> {
  const res = await fetch(`/api/posts/${postId}/comments`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch comments');
  }
  return res.json();
}

export async function createComment(postId: string, userId: string, content: string): Promise<EnrichedComment> {
  const res = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add comment');
  }
  return res.json();
}

export interface FollowResponse {
  following: boolean;
  followersCount: number;
  followers: string[];
}

export async function toggleFollow(followerId: string, followingId: string): Promise<FollowResponse> {
  const res = await fetch('/api/follows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ followerId, followingId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to toggle follow');
  }
  return res.json();
}
