# Webtoon Gallery & Graph Editor

A comprehensive platform for creating, managing, and sharing interactive vertical comics (webtoons) with multi-language support, user authentication, and collaborative features.

## 🎯 Overview

The Webtoon Gallery & Graph Editor is a modern web application that combines a user-friendly gallery system with a powerful visual editor for creating interactive vertical comics. Users can register accounts, create multiple projects, and design branching narratives with invisible clickable hotspots positioned directly on story images. The platform supports multiple languages (Russian, Ukrainian, English) and provides both creation and viewing modes for immersive storytelling experiences.

## ✨ Features

### 👤 User Management & Gallery System
- **User Authentication**: Register and login with secure account management
- **Project Gallery**: Browse and manage multiple webtoon projects with thumbnails
- **Author Attribution**: Track project creators and ownership
- **Project Sharing**: View other users' projects (read-only mode for non-authors)
- **Local Storage**: Demo mode with browser-based data persistence

### 🌐 Multi-Language Support
- **Language Switcher**: Toggle between Russian, Ukrainian, and English
- **Complete Localization**: All UI elements, tooltips, and messages translated
- **Persistent Settings**: Language preference saved across sessions
- **Real-time Switching**: Change language without losing work

### 🎨 Visual Story Creation
- **Image Pool Management**: Upload and organize story images with drag-and-drop functionality
- **Interactive Graph Interface**: Visual node-based editor for story flow design
- **Real-time Preview**: Live preview of selected nodes with full-width image display
- **Project Metadata**: Editable titles, descriptions, and thumbnail images

### 🌟 Story Flow Control
- **Branching Narratives**: Create choice nodes for interactive storytelling
- **Interactive Hotspots**: Clickable areas overlaid on images for seamless navigation
- **START Node**: Dedicated starting point for story navigation
- **Connection System**: Link nodes with visual arrows to create story paths
- **Node Management**: Add, delete, and reposition story elements

### 🛠 Editor Tools
- **Add Choice Button**: Insert decision points for story branching
- **Go to START**: Quick navigation to story beginning
- **Circular Layout**: Auto-arrange nodes in circular pattern
- **Context-aware Positioning**: New nodes appear near selected context
- **Auto-save**: Automatic project saving with 1-second debounce

### 📱 Mobile-Optimized Design
- **Vertical Layout**: Optimized for mobile webtoon consumption
- **Responsive Interface**: Works seamlessly across devices
- **Touch-friendly Controls**: Intuitive interaction patterns
- **Dual Mode System**: Constructor mode for editing, viewer mode for testing interactive stories

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

4. Open your browser and navigate to `http://localhost:5173/webtoon/`

## 🎮 Usage

### Getting Started

1. **Create Account**: Register a new user account or login with existing credentials
2. **Choose Language**: Use the language switcher in the top-right to select your preferred language
3. **Create Project**: Click "Create New Comic" to start a new webtoon project
4. **Enter Editor**: Click on any project card to open it in the editor

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

- **Browse Projects**: View all projects in the main gallery with thumbnails and author info
- **Edit Own Projects**: Full editing access for projects you created
- **View Others' Projects**: Read-only access to other users' projects
- **Delete Projects**: Remove your own projects (with confirmation)

### Navigation Controls
- **Mouse/Touch**: Drag nodes to reposition them
- **Zoom**: Scroll wheel to zoom in/out of the graph
- **Pan**: Drag empty space to navigate the canvas

### Node Types
- **START**: Entry point (green circle)
- **Image Nodes**: Story panels with uploaded images
- **Choice Nodes**: Decision points with multiple options (orange)

## 🏗 Technical Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useCallback, useContext)
- **Internationalization**: Custom React Context with localStorage persistence
- **Data Storage**: Browser localStorage (demo mode)

### Key Components
- `App`: Application root with user authentication and gallery
- `LanguageProvider`: Multi-language context provider
- `LanguageSwitcher`: Language selection dropdown component  
- `WebtoonsGraphEditor`: Main editor interface
- `NodeComponent`: Individual story node rendering
- `DraggableHotspot`: Interactive clickable areas with drag-and-drop positioning
- Interactive SVG canvas for connections
- Dynamic image preview system

### Project Structure
```
src/
├── App.tsx                    # Application root & gallery
├── WebtoonsGraphEditor.tsx    # Main editor component  
├── LanguageContext.tsx        # Multi-language support
├── translations.ts            # Translation strings
├── main.tsx                   # Entry point
└── index.css                  # Global styles
```

## 🎯 Core Features Deep Dive

### User Authentication System
- **Account Creation**: Simple username/password registration
- **Session Management**: Persistent login state with localStorage
- **Project Ownership**: Users can only edit their own projects
- **Demo Mode Warning**: Clear indication of local storage limitations

### Multi-Language System
- **Real-time Translation**: Instant UI language switching
- **Comprehensive Coverage**: All text elements, buttons, tooltips, and messages
- **Language Persistence**: User preference saved across browser sessions
- **Flag Indicators**: Visual language selection with country flags

### Gallery & Project Management
- **Project Cards**: Visual grid layout with thumbnails and metadata
- **Author Attribution**: Clear project ownership display
- **Access Control**: Edit/view permissions based on authorship
- **Thumbnail System**: Custom preview images for projects
- **Empty States**: Helpful prompts for new users

### Graph Interaction System
- **Node Selection**: Click-based selection with visual feedback
- **Connection Management**: Shift+click to connect, Ctrl+click to disconnect
- **Drag & Drop**: Repositionable nodes with collision detection
- **Context Awareness**: New nodes appear relative to selected nodes
- **Auto-save**: Continuous project saving with debounce

### Preview System
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
- **Position Persistence**: Hotspot positions saved with project data

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

---

**Ready to create your interactive webtoon story? Start building today!** 🚀
