# NSTPlus Startup Guide

## Quick Start (Automated MongoDB)

### Option 1: Automatic MongoDB + App Start
```bash
# Install dependencies (first time only)
npm install
npm run install-all

# Start everything automatically (includes in-memory MongoDB)
npm run start:auto
```

This will:
- ✅ Start in-memory MongoDB automatically on port 27017
- ✅ Start backend server on port 5069
- ✅ Start frontend on port 8080
- ✅ Handle cleanup when you stop the app (Ctrl+C)

### Option 2: Development Mode (with auto-restart)
```bash
npm run dev:auto
```

## Manual MongoDB Setup

If you prefer to use a persistent MongoDB installation:

### Install MongoDB
```bash
# Mac (Homebrew)
brew install mongodb-community

# Windows (Download installer)
# https://www.mongodb.com/try/download/community

# Ubuntu/Debian
sudo apt-get install mongodb
```

### Start MongoDB Manually
```bash
# Mac (Homebrew)
brew services start mongodb-community

# Windows (as Administrator)
net start MongoDB

# Linux (systemd)
sudo systemctl start mongod
```

### Start App with Manual MongoDB
```bash
npm start
```

## Troubleshooting

### Port Conflicts
If port 27017 is already in use:
```bash
# Check what's using port 27017
lsof -i :27017

# Kill existing MongoDB if needed
brew services stop mongodb-community
```

### Memory Issues
The in-memory MongoDB uses ~100MB RAM. For production or large datasets, use persistent MongoDB.

### Camera Issues
- Ensure both cameras are connected before starting
- Grant browser permissions for camera access
- Check camera permissions in system settings

### Performance
- In-memory MongoDB: Fast, temporary (data lost on restart)
- Persistent MongoDB: Slower startup, data persists

## Data Storage

### Automatic MongoDB (default)
- Data stored in memory only
- Lost when application stops
- Perfect for experiments and testing

### Persistent MongoDB
- Data stored on disk
- Survives application restarts
- Better for production use

## Environment Variables

The app uses these environment variables (in `backend/.env`):
```
MONGODB_URI=mongodb://localhost:27017/nstplus
PORT=5069
NODE_ENV=development
```

## Quick Commands Reference

```bash
# Full setup from scratch
npm install && npm run install-all && npm run start:auto

# Development with auto-restart
npm run dev:auto

# Traditional startup (requires manual MongoDB)
npm start

# Install dependencies only
npm run install-all
```

## System Requirements

- **Node.js 16+**
- **2 USB cameras** (participant face + equipment)
- **Modern browser** (Chrome/Firefox/Safari)
- **4GB+ RAM** (for in-memory MongoDB)
- **MongoDB** (optional if using auto mode)