# Webtoon Gallery & Graph Editor

A comprehensive platform for creating, managing, and sharing interactive vertical comics (webtoons) with multi-language support, Supabase backend, and real-time social updates. Now deployed at https://webtoon-delta.vercel.app

## 🎯 Overview

The Webtoon Gallery & Graph Editor is a modern web application that combines a user-friendly gallery system with a powerful visual editor for creating interactive vertical comics. Built on Supabase backend with PostgreSQL database, the platform features real-time social interactions, user profiles, project sharing, and comprehensive analytics. Users can register accounts, create multiple projects, and design branching narratives with invisible clickable hotspots positioned directly on story images. The platform supports multiple languages (Russian, Ukrainian, English) and provides both creation and viewing modes for immersive storytelling experiences.

## ✨ Features

### 👤 User Management & Social Features
- **Supabase Authentication**: Secure registration with email/password and GitHub OAuth
- **User Profiles**: Complete profile system with avatars, bio, and statistics
- **Project Gallery**: Browse and manage multiple webtoon projects with thumbnails and social metrics
- **Social Interactions**: Likes and view counts with real-time updates
- **Comments**: Project comments with author self-moderation (delete own comments)
- **Real-time Updates**: Live social metrics and interaction feedback
- **Author Attribution**: Track project creators with detailed author profiles

### 🌐 Multi-Language Support
- **Language Switcher**: Toggle between Russian, Ukrainian, and English
- **Complete Localization**: All UI elements, tooltips, and messages translated
- **Persistent Settings**: Language preference saved across sessions
- **Real-time Switching**: Change language without losing work

### 🎨 Visual Story Creation
- **Supabase Storage Integration**: Upload and organize story images with cloud storage
- **Interactive Graph Interface**: Visual node-based editor for story flow design
- **Real-time Preview**: Live preview of selected nodes with full-width image display
- **Project Metadata**: Editable titles, descriptions, genres, and thumbnail images
- **Genre System**: Categorize projects with 10 predefined genres (Romance, Adventure, Fantasy, etc.)
- **Auto-save**: Automatic project versioning with Supabase backend

### 🌟 Story Flow Control
- **Branching Narratives**: Create choice nodes for interactive storytelling
- **Interactive Hotspots**: Clickable areas overlaid on images for seamless navigation
- **START Node**: Dedicated starting point for story navigation
- **Connection System**: Link nodes with visual arrows to create story paths
- **Node Management**: Add, delete, and reposition story elements
- **Version Control**: Track project changes with automatic versioning system

### 🛠 Editor Tools
- **Add Choice Button**: Insert decision points for story branching
- **Go to START**: Quick navigation to story beginning
- **Circular Layout**: Auto-arrange nodes in circular pattern
- **Context-aware Positioning**: New nodes appear near selected context
- **Auto-save**: Automatic project saving with debounced queue (~1.5s)
- **Undo / Redo**: Up to 30 steps (Ctrl+Z / Ctrl+Shift+Z; works with any keyboard layout)

### 📱 Mobile-Optimized Design
- **Vertical Layout**: Optimized for mobile webtoon consumption
- **Responsive Interface**: Works seamlessly across devices
- **Touch-friendly Controls**: Intuitive interaction patterns
- **Dual Mode System**: Constructor mode for editing, viewer mode for testing interactive stories
- **Production Ready**: Deployed on Vercel with global CDN

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd WebtoonProject
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Create `.env.local` file with Supabase credentials:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Open your browser and navigate to `http://localhost:5173/`

### Live Demo

Visit the deployed application at: **https://webtoon-delta.vercel.app**

## 🎮 Usage

### Getting Started

1. **Create Account**: Register with email/password or sign in with GitHub
2. **Complete Profile**: Add your username, avatar, and bio
3. **Choose Language**: Use the language switcher in the top-right to select your preferred language
4. **Browse Gallery**: Explore public projects by genre, popularity, or recent uploads
5. **Create Project**: Click "Create New Comic" to start a new webtoon project
6. **Select Genre**: Choose from 10 available genres for your project
7. **Enter Editor**: Click on any project card to open it in the editor

### Basic Workflow

1. **Upload Images**: Click "Upload Images" to add story panels to your image pool
2. **Build Story Graph**: Click on images from the pool to add them to the story graph
3. **Create Connections**: 
   - Click on a node to select it
   - Hold Shift and click another node to create a connection
   - Hold Ctrl and click a node to remove its connections
4. **Add Choices**: Use "Add Choice" to insert decision points
5. **Position Hotspots**: When a choice node is selected, drag the orange hotspots on the preview image to position them over clickable areas (like speech bubbles)
6. **Edit Project Details**: Click on title/description to edit project metadata
7. **Upload Thumbnail**: Add a preview image for your project in the gallery
8. **Preview**: Switch to viewer mode to test your interactive story with invisible hotspots

### Gallery Management

- **Browse Projects**: View all projects in the main gallery with thumbnails, author info, and social metrics
- **Filter by Genre**: Use genre filters to find specific types of content
- **Sort Options**: Sort by newest, most popular (views), or most liked
- **Social Interactions**: Like projects and view real-time like counts
- **Author Profiles**: Click on authors to view their complete profiles and project collections
- **Comments Counter**: Comments count shown on project cards
- **Edit Own Projects**: Full editing access for projects you created
- **View Others' Projects**: Read-only access to other users' projects with view tracking
- **Delete Projects**: Remove your own projects (with confirmation)

### Navigation Controls
- **Mouse/Touch**: Drag nodes to reposition them
- **Zoom**: Hold Ctrl and use the mouse wheel to zoom in/out (cursor-centered)
- **Pan**: Drag empty space to navigate the canvas

### Node Types
- **START**: Entry point (green circle)
- **Image Nodes**: Story panels with uploaded images
- **Choice Nodes**: Decision points with multiple options (orange)

## 🏗 Technical Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Icons**: Lucide React
- **State Management**: React Hooks with Supabase integration
- **Internationalization**: Custom React Context with localStorage persistence
- **Database**: PostgreSQL with 11 tables and Row Level Security (RLS)
- **Authentication**: Supabase Auth with GitHub OAuth and email/password
- **File Storage**: Supabase Storage with 3 buckets (project-images, avatars, thumbnails)
- **Deployment**: Vercel with automatic deployments

### Key Components
- `App`: Application root with Supabase authentication and gallery
- `AppSupabaseDB`: Main application with full Supabase integration
- `SupabaseAuth`: Authentication component with GitHub OAuth
- `LanguageProvider`: Multi-language context provider
- `LanguageSwitcher`: Language selection dropdown component  
- `WebtoonsGraphEditor`: Main editor interface with cloud storage
- `NodeComponent`: Individual story node rendering
- `DraggableHotspot`: Interactive clickable areas with drag-and-drop positioning
- Interactive SVG canvas for connections
- Dynamic image preview system
- Real-time social features integration

### Project Structure
```
src/
├── App.tsx                    # Original localStorage version
├── AppSupabase.tsx            # Supabase auth integration
├── AppSupabaseDB.tsx          # Full Supabase integration
├── WebtoonsGraphEditor.tsx    # Main editor component  
├── LanguageContext.tsx        # Multi-language support
├── translations.ts            # Translation strings
├── components/
│   ├── SupabaseAuth.tsx       # Authentication component
│   └── TestSupabase.tsx       # Supabase testing component
├── lib/
│   ├── supabase.ts           # Supabase client configuration
│   └── database.types.ts     # TypeScript database types
├── services/
│   ├── auth.service.ts       # Authentication service
│   ├── projects.service.ts   # Projects CRUD operations
│   └── storage.service.ts    # File storage service
├── utils/
│   ├── genreTranslations.ts  # Genre localization
│   └── slug.ts              # URL slug generation
├── database/                 # SQL migration files
├── main.tsx                  # Entry point
└── index.css                 # Global styles
```

## 🎯 Core Features Deep Dive

### User Authentication System
- **Supabase Auth**: Secure authentication with JWT tokens
- **Multiple Sign-in Methods**: Email/password and GitHub OAuth
- **User Profiles**: Automatic profile creation with customizable information
- **Session Management**: Persistent login state with secure token refresh
- **Project Ownership**: Users can only edit their own projects with RLS policies
- **Social Features**: Public profiles and basic statistics
 - **Email Confirmation Notice**: After email registration, the UI explicitly prompts users to check their inbox for confirmation

### Multi-Language System
- **Real-time Translation**: Instant UI language switching
- **Comprehensive Coverage**: All text elements, buttons, tooltips, and messages
- **Language Persistence**: User preference saved across browser sessions

### Gallery & Project Management
- **Project Cards**: Visual grid layout with thumbnails, metadata, and social metrics
- **Genre Filtering**: Filter projects by 10 predefined genres
- **Sorting Options**: Sort by creation date, view count, or like count
- **Social Metrics**: Real-time view counts and like buttons with animations
- **Author Attribution**: Clickable author profiles with statistics
- **Access Control**: Edit/view permissions based on authorship with RLS
- **Thumbnail System**: Custom preview images stored in Supabase Storage
- **Real-time Updates**: Live updates of social interactions
 - **Read-only Sandbox for Non-authors**: Non-authors can interact with the editor UI, but their changes are not persisted
 - **Comments**: Read in viewer mode; add comments; authors can delete their own comments

### Graph Interaction System
- **Node Selection**: Click-based selection with visual feedback
- **Connection Management**: Shift+click to connect, Ctrl+click to disconnect
- **Drag & Drop**: Repositionable nodes
- **Context Awareness**: New nodes appear relative to selected nodes
- **Auto-save**: Continuous project saving with debounce
 - **Zoom & Persistence**: Ctrl + mouse wheel zoom centered under cursor; editor restores last scroll position and zoom level; first open centers on START

### Preview System
- **Cloud Storage**: Images served from Supabase Storage CDN
- **Full-width Display**: Selected images scale to container width
- **Aspect Ratio Preservation**: Maintains image proportions
- **Node Information**: Shows connections, position, and metadata
- **Dynamic Sizing**: Container adapts to image dimensions
- **Read-only Mode**: Non-authors can preview but not edit

### Choice Node System
- **Multiple Options**: Support for branching storylines
- **Visual Indicators**: Clear connection mapping
- **Customizable Text**: Editable choice descriptions
- **Hotspot Integration**: Seamless connection to interactive areas

### Interactive Hotspot System
- **Automatic Creation**: Hotspots are automatically generated when connecting choice nodes to other nodes
- **Visual Editor**: Drag and position hotspots directly on preview images in constructor mode
- **Invisible Interface**: In viewer mode, hotspots are transparent and only show labels on hover
- **Smart Positioning**: Place hotspots over speech bubbles, characters, or objects for natural interaction
- **Seamless Navigation**: Click hotspots to navigate through story branches without traditional UI elements


## 🔧 Development

### Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Configuration
- `vite.config.ts`: Vite configuration
- `tailwind.config.js`: Tailwind CSS customization
- `tsconfig.json`: TypeScript configuration
- `vercel.json`: Vercel deployment configuration
- `.env.local`: Supabase environment variables (not in repo)
- `database/`: SQL migration files for database setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built for mobile-first webtoon creation
- Inspired by modern visual storytelling tools
- Optimized for interactive narrative experiences
- Powered by Supabase for scalable backend infrastructure
- Deployed on Vercel for global performance

## 🌐 Live Application

**Production URL**: https://webtoon-delta.vercel.app

### Current Status
- ✅ Full Supabase integration (Database, Auth, Storage)
- ✅ Social features (likes, views, user profiles)
- ✅ Genre system with 10 categories
- ✅ Real-time interactions
- ✅ Production deployment on Vercel
- ✅ Multi-language support (RU/UA/EN)
- ✅ Comments system (list, add, delete own)
- 🚧 Advanced analytics (planned)
- ✅ Ctrl+wheel zoom with persistence
- ✅ Undo/Redo stack in editor
- ✅ Read-only sandbox for non-authors

---

**Ready to create your interactive webtoon story? Visit https://webtoon-delta.vercel.app and start building today!** 🚀
