export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string; // Tailwind gradient class or URL
  bio: string;
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  image?: string; // Optional image URL or SVG prompt
  likes: string[]; // List of userIds who liked the post
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Follow {
  followerId: string;
  followingId: string;
}

export interface DB {
  users: User[];
  posts: Post[];
  comments: Comment[];
  follows: Follow[];
}
