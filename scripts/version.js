#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { version } = require('../package.json');

// Files to update version
const files = [
  '../package.json',
  '../package-lock.json',
  '../yarn.lock'
];

function updateVersion(filePath, newVersion) {
  const fullPath = path.join(__dirname, filePath);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, 'utf8');
  const updated = content.replace(
    /"version": "[^"]+"/,
    `"version": "${newVersion}"`
  );
  
  fs.writeFileSync(fullPath, updated, 'utf8');
  console.log(`Updated ${filePath} to version ${newVersion}`);
}

// Get new version from command line argument
const newVersion = process.argv[2];
if (!newVersion) {
  console.error('Please provide a version number');
  process.exit(1);
}

// Update all files
files.forEach(file => updateVersion(file, newVersion));
