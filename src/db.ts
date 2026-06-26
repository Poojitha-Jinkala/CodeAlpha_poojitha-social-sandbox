import fs from 'fs';
import path from 'path';
import { DB, User, Post, Comment, Follow } from './types.js';

const DB_FILE = path.join(process.cwd(), 'database.json');

const DEFAULT_USERS: User[] = [
  {
    id: 'user-1',
    username: 'sarah_j',
    displayName: 'Sarah Jenkins',
    avatar: 'from-pink-500 to-rose-500',
    bio: 'Digital Artist & UI/UX Designer. Creating visual worlds 🎨. San Francisco based.',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'user-2',
    username: 'alex_rivera',
    displayName: 'Alex Rivera',
    avatar: 'from-blue-500 to-indigo-600',
    bio: 'Tech enthusiast, coffee lover, and full-stack developer. Building open-source tools! ☕💻',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'user-3',
    username: 'elena_travels',
    displayName: 'Elena Rostova',
    avatar: 'from-amber-400 to-orange-500',
    bio: 'Travel photographer & adventure seeker. 📸 Capturing stories from around the globe. 🌍✈️',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'user-4',
    username: 'marcus_fit',
    displayName: 'Marcus Chen',
    avatar: 'from-emerald-400 to-teal-500',
    bio: 'Strength coach & plant-based advocate. Helping you build a sustainable, healthy lifestyle. 💪🌱',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

const DEFAULT_POSTS: Post[] = [
  {
    id: 'post-1',
    userId: 'user-1',
    content: 'Just finished my latest illustration! Experimenting with dynamic lighting and futuristic pastel palettes. What do you all think? ✨🎨',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
    likes: ['user-2', 'user-3'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-2',
    userId: 'user-3',
    content: 'Sunrise over the peaks of Kyoto, Japan. Woke up at 4 AM for this trek, but standing in the crisp morning air with this view was worth every second. 🌄⛩️',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop&q=60',
    likes: ['user-1', 'user-4'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 10 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-3',
    userId: 'user-2',
    content: 'Spent the weekend migrating my side projects to TypeScript. The compilation errors were painful, but knowing that type safety has my back makes it all feel incredibly satisfying. Who else is in TS-land? 👨‍💻⚙️',
    likes: ['user-1', 'user-3', 'user-4'],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post-4',
    userId: 'user-4',
    content: 'Fueling up with this vibrant green smoothie bowl after an intense leg day session. Spinach, mango, hemp seeds, and almond milk. Consistency is key! 🥑🍌🏋️‍♂️',
    image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800&auto=format&fit=crop&q=60',
    likes: ['user-2'],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  }
];

const DEFAULT_COMMENTS: Comment[] = [
  {
    id: 'comment-1',
    postId: 'post-1',
    userId: 'user-2',
    content: 'Wow, the colors in this are absolutely stellar! Love the neon glow effect on the contours.',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment-2',
    postId: 'post-1',
    userId: 'user-3',
    content: 'This feels so serene and ethereal. Do you sell high-res wallpapers or prints?',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 22 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment-3',
    postId: 'post-2',
    userId: 'user-1',
    content: 'Incredible capture, Elena! The contrast of the golden sunrise against the dark temple roofs is breathtaking.',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comment-4',
    postId: 'post-3',
    userId: 'user-4',
    content: 'TypeScript has definitely saved me from writing broken production code too many times. Worth the setup!',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

const DEFAULT_FOLLOWS: Follow[] = [
  { followerId: 'user-1', followingId: 'user-2' }, // Sarah follows Alex
  { followerId: 'user-1', followingId: 'user-3' }, // Sarah follows Elena
  { followerId: 'user-2', followingId: 'user-1' }, // Alex follows Sarah
  { followerId: 'user-2', followingId: 'user-3' }, // Alex follows Elena
  { followerId: 'user-3', followingId: 'user-1' }, // Elena follows Sarah
  { followerId: 'user-4', followingId: 'user-2' }, // Marcus follows Alex
];

export function loadDB(): DB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading database, creating fresh one:', err);
  }

  // Create default database
  const db: DB = {
    users: DEFAULT_USERS,
    posts: DEFAULT_POSTS,
    comments: DEFAULT_COMMENTS,
    follows: DEFAULT_FOLLOWS,
  };
  saveDB(db);
  return db;
}

export function saveDB(db: DB): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database:', err);
  }
}
