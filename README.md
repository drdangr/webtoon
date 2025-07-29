# Webtoon Graph Editor

A powerful interactive editor for creating vertical comics (webtoons) optimized for mobile viewing with branching storylines and interactive elements.

## 🎯 Overview

The Webtoon Graph Editor is a modern web application that allows content creators to design interactive vertical comics with decision trees and branching narratives. Perfect for creating mobile-optimized visual stories with multiple storylines and user choices.

## ✨ Features

### 🎨 Visual Story Creation
- **Image Pool Management**: Upload and organize story images with drag-and-drop functionality
- **Interactive Graph Interface**: Visual node-based editor for story flow design
- **Real-time Preview**: Live preview of selected nodes with full-width image display

### 🌟 Story Flow Control
- **Branching Narratives**: Create choice nodes for interactive storytelling
- **START Node**: Dedicated starting point for story navigation
- **Connection System**: Link nodes with visual arrows to create story paths
- **Node Management**: Add, delete, and reposition story elements

### 🛠 Editor Tools
- **Add Choice Button**: Insert decision points for story branching
- **Go to START**: Quick navigation to story beginning
- **Circular Layout**: Auto-arrange nodes in circular pattern
- **Context-aware Positioning**: New nodes appear near selected context

### 📱 Mobile-Optimized Design
- **Vertical Layout**: Optimized for mobile webtoon consumption
- **Responsive Interface**: Works seamlessly across devices
- **Touch-friendly Controls**: Intuitive interaction patterns

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

### Basic Workflow

1. **Upload Images**: Click "Загрузить изображения" to add story panels to your image pool
2. **Build Story Graph**: Click on images from the pool to add them to the story graph
3. **Create Connections**: 
   - Click on a node to select it
   - Hold Shift and click another node to create a connection
   - Hold Ctrl and click a node to remove its connections
4. **Add Choices**: Use "Добавить выбор" to insert decision points
5. **Preview**: Select any node to see it in the preview panel

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
- **State Management**: React Hooks (useState, useCallback)

### Key Components
- `WebtoonsGraphEditor`: Main editor interface
- `NodeComponent`: Individual story node rendering
- Interactive SVG canvas for connections
- Dynamic image preview system

### Project Structure
```
src/
├── WebtoonsGraphEditor.tsx  # Main editor component
├── App.tsx                  # Application root
├── main.tsx                # Entry point
└── index.css               # Global styles
```

## 🎯 Core Features Deep Dive

### Graph Interaction System
- **Node Selection**: Click-based selection with visual feedback
- **Connection Management**: Shift+click to connect, Ctrl+click to disconnect
- **Drag & Drop**: Repositionable nodes with collision detection
- **Context Awareness**: New nodes appear relative to selected nodes

### Preview System
- **Full-width Display**: Selected images scale to container width
- **Aspect Ratio Preservation**: Maintains image proportions
- **Node Information**: Shows connections, position, and metadata
- **Dynamic Sizing**: Container adapts to image dimensions

### Choice Node System
- **Multiple Options**: Support for branching storylines
- **Visual Indicators**: Clear connection mapping
- **Customizable Text**: Editable choice descriptions

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
