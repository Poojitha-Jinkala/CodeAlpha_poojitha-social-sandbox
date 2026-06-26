import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { loadDB, saveDB } from './src/db.ts';
import { User, Post, Comment, Follow } from './src/types.ts';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = 3000;

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not defined. AI features will run in mock mode.');
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

function getUnsplashUrl(keyword: string): string {
  const dict: Record<string, string> = {
    design: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=60',
    tech: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60',
    travel: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=60',
    fitness: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=60',
    workspace: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=60',
    coffee: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&auto=format&fit=crop&q=60',
    sunset: 'https://images.unsplash.com/photo-1472214222541-d510753a4707?w=800&auto=format&fit=crop&q=60',
    nature: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&auto=format&fit=crop&q=60',
    art: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&auto=format&fit=crop&q=60',
    city: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&auto=format&fit=crop&q=60',
  };
  const key = keyword.toLowerCase().trim();
  if (dict[key]) return dict[key];
  for (const [k, url] of Object.entries(dict)) {
    if (key.includes(k) || k.includes(key)) return url;
  }
  const fallbacks = [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=60',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=60',
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API ROUTES

  // Get all users
  app.get('/api/users', (req, res) => {
    try {
      const db = loadDB();
      res.json(db.users);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load users' });
    }
  });

  // Create a new user (Sign up)
  app.post('/api/users', (req, res) => {
    try {
      const { username, displayName, bio, avatar } = req.body;
      if (!username || !displayName) {
        return res.status(400).json({ error: 'Username and display name are required' });
      }

      const db = loadDB();

      // Check if username already exists
      const cleanedUsername = username.trim().toLowerCase();
      const exists = db.users.some(u => u.username.toLowerCase() === cleanedUsername);
      if (exists) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        username: cleanedUsername,
        displayName: displayName.trim(),
        avatar: avatar || 'from-slate-400 to-slate-600',
        bio: bio?.trim() || '',
        createdAt: new Date().toISOString()
      };

      db.users.push(newUser);
      saveDB(db);

      res.status(211).json(newUser);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Get single user details with stats
  app.get('/api/users/:id', (req, res) => {
    try {
      const { id } = req.params;
      const db = loadDB();
      const user = db.users.find(u => u.id === id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Calculate follower and following list/counts
      const followers = db.follows.filter(f => f.followingId === id).map(f => f.followerId);
      const following = db.follows.filter(f => f.followerId === id).map(f => f.followingId);
      const postsCount = db.posts.filter(p => p.userId === id).length;

      res.json({
        ...user,
        followersCount: followers.length,
        followingCount: following.length,
        postsCount,
        followers,
        following
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get user details' });
    }
  });

  // Update user profile
  app.put('/api/users/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { displayName, bio, avatar } = req.body;

      if (!displayName) {
        return res.status(400).json({ error: 'Display name is required' });
      }

      const db = loadDB();
      const userIndex = db.users.findIndex(u => u.id === id);
      if (userIndex === -1) {
        return res.status(404).json({ error: 'User not found' });
      }

      db.users[userIndex] = {
        ...db.users[userIndex],
        displayName: displayName.trim(),
        bio: bio?.trim() || '',
        avatar: avatar || db.users[userIndex].avatar
      };

      saveDB(db);
      res.json(db.users[userIndex]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Get posts (all or following-only, sorted by newest)
  app.get('/api/posts', (req, res) => {
    try {
      const { currentUserId, feed } = req.query;
      const db = loadDB();
      let posts = [...db.posts];

      // If viewing "following" feed specifically
      if (feed === 'following' && currentUserId) {
        const followedIds = db.follows
          .filter(f => f.followerId === currentUserId)
          .map(f => f.followingId);
        // Include self posts as well in following feed
        posts = posts.filter(p => p.userId === currentUserId || followedIds.includes(p.userId));
      }

      // Sort newest first
      posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Attach user profiles and calculate status
      const enrichedPosts = posts.map(post => {
        const author = db.users.find(u => u.id === post.userId) || {
          id: post.userId,
          username: 'unknown',
          displayName: 'Deleted User',
          avatar: 'from-gray-400 to-gray-500',
          bio: '',
          createdAt: ''
        };

        const commentsCount = db.comments.filter(c => c.postId === post.id).length;
        const isLiked = currentUserId ? post.likes.includes(String(currentUserId)) : false;

        return {
          ...post,
          author,
          likesCount: post.likes.length,
          commentsCount,
          isLiked
        };
      });

      res.json(enrichedPosts);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  // Create a new post
  app.post('/api/posts', (req, res) => {
    try {
      const { userId, content, image } = req.body;
      if (!userId || !content) {
        return res.status(400).json({ error: 'User ID and content are required' });
      }

      const db = loadDB();
      const userExists = db.users.some(u => u.id === userId);
      if (!userExists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const newPost: Post = {
        id: `post-${Date.now()}`,
        userId,
        content: content.trim(),
        image: image || undefined,
        likes: [],
        createdAt: new Date().toISOString()
      };

      db.posts.push(newPost);
      saveDB(db);

      // Attach author for instant frontend render
      const author = db.users.find(u => u.id === userId);
      res.status(211).json({
        ...newPost,
        author,
        likesCount: 0,
        commentsCount: 0,
        isLiked: false
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create post' });
    }
  });

  // Like / Unlike a post
  app.post('/api/posts/:id/like', (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const db = loadDB();
      const postIndex = db.posts.findIndex(p => p.id === id);
      if (postIndex === -1) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const post = db.posts[postIndex];
      const likeIndex = post.likes.indexOf(userId);

      if (likeIndex > -1) {
        // Unlike
        post.likes.splice(likeIndex, 1);
      } else {
        // Like
        post.likes.push(userId);
      }

      saveDB(db);
      res.json({
        likes: post.likes,
        likesCount: post.likes.length,
        isLiked: post.likes.includes(userId)
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to like post' });
    }
  });

  // Get comments for a post
  app.get('/api/posts/:id/comments', (req, res) => {
    try {
      const { id } = req.params;
      const db = loadDB();
      const comments = db.comments
        .filter(c => c.postId === id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const enrichedComments = comments.map(comment => {
        const author = db.users.find(u => u.id === comment.userId) || {
          id: comment.userId,
          username: 'unknown',
          displayName: 'Deleted User',
          avatar: 'from-gray-400 to-gray-500',
          bio: '',
          createdAt: ''
        };
        return {
          ...comment,
          author
        };
      });

      res.json(enrichedComments);
    } catch (err) {
      res.status(500).json({ error: 'Failed to load comments' });
    }
  });

  // Create a comment
  app.post('/api/posts/:id/comments', (req, res) => {
    try {
      const { id } = req.params;
      const { userId, content } = req.body;

      if (!userId || !content) {
        return res.status(400).json({ error: 'User ID and comment content are required' });
      }

      const db = loadDB();
      const postExists = db.posts.some(p => p.id === id);
      if (!postExists) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        postId: id,
        userId,
        content: content.trim(),
        createdAt: new Date().toISOString()
      };

      db.comments.push(newComment);
      saveDB(db);

      const author = db.users.find(u => u.id === userId);
      res.status(211).json({
        ...newComment,
        author
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // Toggle follow/unfollow
  app.post('/api/follows', (req, res) => {
    try {
      const { followerId, followingId } = req.body;

      if (!followerId || !followingId) {
        return res.status(400).json({ error: 'followerId and followingId are required' });
      }

      if (followerId === followingId) {
        return res.status(400).json({ error: 'You cannot follow yourself' });
      }

      const db = loadDB();
      const followerExists = db.users.some(u => u.id === followerId);
      const followingExists = db.users.some(u => u.id === followingId);

      if (!followerExists || !followingExists) {
        return res.status(404).json({ error: 'Follower or following user not found' });
      }

      const followIndex = db.follows.findIndex(
        f => f.followerId === followerId && f.followingId === followingId
      );

      let followingStatus = false;
      if (followIndex > -1) {
        // Unfollow
        db.follows.splice(followIndex, 1);
        followingStatus = false;
      } else {
        // Follow
        db.follows.push({ followerId, followingId });
        followingStatus = true;
      }

      saveDB(db);

      // Return updated follower statistics for the followingId
      const followers = db.follows.filter(f => f.followingId === followingId).map(f => f.followerId);

      res.json({
        following: followingStatus,
        followersCount: followers.length,
        followers
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to toggle follow status' });
    }
  });

  // --- AI SOCIAL SANDBOX CHATTER & SIMULATION ENDPOINTS ---

  // Generate simulated AI reactions/comments for a post
  app.post('/api/sandbox/simulate-comments', async (req, res) => {
    try {
      const { postId } = req.body;
      if (!postId) {
        return res.status(400).json({ error: 'postId is required' });
      }

      const db = loadDB();
      const post = db.posts.find(p => p.id === postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const author = db.users.find(u => u.id === post.userId);
      const otherUsers = db.users.filter(u => u.id !== post.userId);

      if (otherUsers.length === 0) {
        return res.json([]);
      }

      // We will select 1 or 2 random candidates to comment
      const shuffled = [...otherUsers].sort(() => 0.5 - Math.random());
      const selectedUsers = shuffled.slice(0, Math.floor(Math.random() * 2) + 1);

      const ai = getGeminiClient();
      let generatedComments: { userId: string; content: string }[] = [];

      if (ai) {
        try {
          const systemInstruction = `You are simulating a social platform called "Poojitha".
Generate character-authentic comments for a post on this feed.
Return the result strictly as a JSON array of comment objects, matching this schema:
[{ "userId": string, "content": string }]
Each content must be in the first-person voice of that specific character, reflecting their bio, tone, and emoji preference. Keep it very natural, brief (1-2 sentences), and positive or engaging. Do not sound like a generic assistant.`;

          const prompt = `Post content: "${post.content}"
Post Author: "${author?.displayName || 'Unknown'}" (@${author?.username || 'unknown'})
Post Author Bio: "${author?.bio || ''}"

Please write simulated comments from these candidates:
${selectedUsers.map(u => `- ID: "${u.id}", Name: "${u.displayName}", Bio: "${u.bio}"`).join('\n')}

Generate comments only for these specified candidates.`;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    userId: { type: Type.STRING },
                    content: { type: Type.STRING }
                  },
                  required: ["userId", "content"]
                }
              }
            }
          });

          if (response.text) {
            generatedComments = JSON.parse(response.text.trim());
          }
        } catch (apiErr) {
          console.error("Gemini API call failed, falling back to smart mocks:", apiErr);
        }
      }

      // Fallback/Validation: If Gemini wasn't used or failed to return properly, populate using smart presets
      if (generatedComments.length === 0) {
        const presets: Record<string, string[]> = {
          'user-1': [
            "The colors and composition here are super inspiring! 🎨",
            "This aesthetic is gorgeous! Love the visual layout.",
            "Wow! Totally loving this creative vibe. ✨"
          ],
          'user-2': [
            "This is incredibly clean! The details are top-notch. 💻⚙️",
            "Awesome share! Truly high-value content right here.",
            "So satisfying to see this! Solid work."
          ],
          'user-3': [
            "Wow, this looks like an absolute dream! 🌏 Adding to my travel bucket list.",
            "Phenomenal! Woke up to see this beauty. Thanks for sharing!",
            "Breathtaking views/vibes! Absolutely stunning capture."
          ],
          'user-4': [
            "Incredible energy right here! Consistency is always the key. 💪🌱",
            "Pure quality and focus. Love the mindset behind this!",
            "This is exactly what I needed to see today. Pure motivation!"
          ]
        };

        generatedComments = selectedUsers.map(user => {
          const userPresets = presets[user.id] || [
            "This is absolutely amazing! ✨",
            "Love this post so much!",
            "Brilliant share, thanks for posting this! 🙌"
          ];
          const content = userPresets[Math.floor(Math.random() * userPresets.length)];
          return {
            userId: user.id,
            content
          };
        });
      }

      // Add to database
      const newComments: Comment[] = generatedComments.map((gc, index) => ({
        id: `comment-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
        postId,
        userId: gc.userId,
        content: gc.content.trim(),
        createdAt: new Date(Date.now() + index * 1000).toISOString()
      }));

      db.comments.push(...newComments);
      saveDB(db);

      // Return enriched comments to client
      const enrichedNewComments = newComments.map(comment => {
        const commenter = db.users.find(u => u.id === comment.userId) || {
          id: comment.userId,
          username: 'unknown',
          displayName: 'Deleted User',
          avatar: 'from-gray-400 to-gray-500',
          bio: '',
          createdAt: ''
        };
        return {
          ...comment,
          author: commenter
        };
      });

      res.status(211).json(enrichedNewComments);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to simulate comments' });
    }
  });

  // Generate a completely new post in the voice of an AI user
  app.post('/api/sandbox/ai-post', async (req, res) => {
    try {
      const { userId, topic } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const db = loadDB();
      const user = db.users.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const ai = getGeminiClient();
      let generatedContent = "";
      let imageKeyword = "workspace";

      if (ai) {
        try {
          const systemInstruction = `You are simulating a social media platform called "Poojitha".
Write a high-quality, character-authentic social media post for an AI user.
Return the response strictly in JSON format matching this schema:
{ "content": string, "imageKeyword": string }
Where "content" is the post caption, written in the active first person ("I") matching their persona, bio, tone, and emoji preference. Keep it very engaging and creative.
And "imageKeyword" is a single word describing what should be in the photo (e.g. "design", "tech", "travel", "fitness", "sunset", "coffee", "art", "city").`;

          const prompt = `User Name: "${user.displayName}" (@${user.username})
User Bio: "${user.bio}"
Theme or Topic: "${topic || 'anything they would naturally post about'}"`;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  content: { type: Type.STRING },
                  imageKeyword: { type: Type.STRING }
                },
                required: ["content", "imageKeyword"]
              }
            }
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            generatedContent = parsed.content;
            imageKeyword = parsed.imageKeyword;
          }
        } catch (apiErr) {
          console.error("Gemini API post generation failed, falling back:", apiErr);
        }
      }

      // Fallbacks
      if (!generatedContent) {
        const presets: Record<string, { content: string; keyword: string }[]> = {
          'user-1': [
            { content: "Experimenting with dynamic lighting gradients today. Transitioning from pastel twilight to deep solar flares. Art is a playground of lights! 🎨✨ #digitalart #branding", keyword: "design" },
            { content: "Brutalist text setups combined with soft, warm geometric illustrations. Finding balance in raw typography and organic shapes. 📐💻", keyword: "art" }
          ],
          'user-2': [
            { content: "Migrated a legacy module to fully strictly-typed contracts in TS. Standard compilation checks are painful initially, but the bulletproof safety at runtime is extremely satisfying! ☕💻 #developerlife", keyword: "tech" },
            { content: "Fueling my open-source exploration with a fresh double espresso. Working on optimizing route-splitting algorithms today. Let's build! 🚀☕", keyword: "workspace" }
          ],
          'user-3': [
            { content: "Waking up at 4:30 AM to catch the sunrise fog over Kyoto's temple ridges. The air is crisp, the silence is pristine, and the orange glow is pure magic. 🌄⛩️ #wanderlust #landscape", keyword: "travel" },
            { content: "Lost in the vibrant blue alleys of Chefchaouen. Every corner feels like an oil painting waiting to be framed. Earth has so many stories to tell. 🌍✈️", keyword: "sunset" }
          ],
          'user-4': [
            { content: "Consistently showing up is 90% of the battle. Prepping this vibrant green smoothie bowl after an intense morning lift. Eat well, train smart! 🌱🏋️‍♂️ #healthyhabits", keyword: "fitness" },
            { content: "Outdoor morning sprint sessions. Crisp cold breeze, high focus, clear lungs. Keep setting your own pace every single day! 💪🔥", keyword: "nature" }
          ]
        };

        const list = presets[userId] || [
          { content: "Just reflecting on some incredible positive moments today. Always grateful for the journey. ✨ #mindfulness", keyword: "coffee" },
          { content: "Finding focus in a busy city. Cozying up at my favorite spot with some fresh ideas. ☕🏙️", keyword: "city" }
        ];

        const item = list[Math.floor(Math.random() * list.length)];
        generatedContent = item.content;
        imageKeyword = item.keyword;
      }

      // Create new post
      const imageUrl = getUnsplashUrl(imageKeyword);
      const newPost: Post = {
        id: `post-${Date.now()}`,
        userId,
        content: generatedContent,
        image: imageUrl,
        likes: [],
        createdAt: new Date().toISOString()
      };

      db.posts.push(newPost);
      saveDB(db);

      res.status(211).json({
        ...newPost,
        author: user,
        likesCount: 0,
        commentsCount: 0,
        isLiked: false
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create AI post' });
    }
  });

  // Trigger simulated viral boost
  app.post('/api/sandbox/simulate-viral', (req, res) => {
    try {
      const { postId } = req.body;
      if (!postId) {
        return res.status(400).json({ error: 'postId is required' });
      }

      const db = loadDB();
      const post = db.posts.find(p => p.id === postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Add likes from all other users in DB who haven't liked yet
      const otherUsers = db.users.filter(u => u.id !== post.userId);
      const unlikedUsers = otherUsers.filter(u => !post.likes.includes(u.id));

      const addedLikes: string[] = [];
      unlikedUsers.forEach(u => {
        post.likes.push(u.id);
        addedLikes.push(u.id);
      });

      // Add 1-2 viral comments
      const commenters = otherUsers.filter(u => !db.comments.some(c => c.postId === postId && c.userId === u.id));
      const selectedCommenters = commenters.slice(0, 2);

      const viralPhrases = [
        "OMG, this deserves a million likes! 🤯🔥 Just amazing.",
        "Speechless. Literally the highest quality content on my feed today!",
        "Absolutely brilliant. This is going straight to the top! 📈💯",
        "Woah, this is incredibly beautiful! Outstanding work."
      ];

      const newComments: Comment[] = selectedCommenters.map((user, index) => {
        const phrase = viralPhrases[(index + Math.floor(Math.random() * viralPhrases.length)) % viralPhrases.length];
        return {
          id: `comment-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
          postId,
          userId: user.id,
          content: phrase,
          createdAt: new Date(Date.now() + index * 1000).toISOString()
        };
      });

      db.comments.push(...newComments);
      saveDB(db);

      // Return updated numbers
      res.json({
        success: true,
        likesCount: post.likes.length,
        likes: post.likes,
        addedLikesCount: addedLikes.length,
        addedCommentsCount: newComments.length
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to simulate viral wave' });
    }
  });

  // Serve Vite app in dev/production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support React Router / client-side routing fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
