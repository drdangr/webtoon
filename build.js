#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

try {
  // Используем прямой путь к vite
  const vitePath = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
  console.log('Building with direct vite path...');
  execSync(`node "${vitePath}" build`, { stdio: 'inherit' });
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
} 