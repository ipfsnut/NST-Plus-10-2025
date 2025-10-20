# Single Camera Laptop Setup Guide

## 🎯 Quick Start for Single Camera Development

Perfect for testing on your laptop with built-in camera!

### 🚀 Getting Started

1. **Navigate to Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

2. **Navigate to Face-Capture (separate terminal)**
   ```bash
   cd face-capture  
   npm install
   npm run dev
   ```

### 📊 What to Expect

#### ✅ **Automatic Camera Setup**
- **Auto-detection**: Finds your built-in camera automatically
- **Single camera mode**: Works perfectly with just one camera
- **No configuration needed**: Just allow camera permissions when prompted

#### 🎭 **Smart Fallbacks** 
- **Main camera**: Uses your laptop camera for face capture
- **Second camera**: Creates mock images (marked as "MOCK CAMERA")
- **Full functionality**: All experiment features work normally

#### 📱 **Browser Permissions**
When you first start:
1. Browser will prompt for camera permissions
2. Click **"Allow"** to enable camera access
3. App will auto-detect and configure your camera

### 🔍 Stepping Through the Experiment

#### **Frontend Module** (localhost:8080)
1. **Start Screen**: Shows camera status and instructions
2. **Neutral Capture**: Captures baseline facial expression  
3. **NST Task**: Number switching with digit display
4. **Results**: Shows capture data and experiment results

#### **Face-Capture Module** (localhost:5173)
1. **Camera Config**: Shows detected cameras
2. **Live Preview**: Displays camera feed
3. **Capture Test**: Can capture photos directly

### 🎮 Controls & Navigation

#### **Keyboard Controls**
- **'f' or 'j'**: Start experiment from main screen
- **Follow on-screen prompts** for each phase

#### **Camera Controls**
- **Config button**: Opens camera configuration screen
- **Auto-preview**: See camera feed in real-time
- **Status indicators**: Green = ready, Yellow = single camera mode

### 🐛 Troubleshooting

#### **Camera Not Detected**
```bash
# Check browser console for:
Console: "Found 1 camera devices: Built-in Camera"
Status: "Camera Ready" (green badge)
```

#### **Permission Issues**
```bash
# If permissions denied:
Status: "Camera permission denied" (yellow badge)
Solution: Allow permissions in browser settings
```

#### **No Camera Icon**
```bash
# Check Chrome settings:
Settings > Privacy and Security > Site Settings > Camera
Ensure your site is allowed to use camera
```

### 📸 Testing Camera Capture

#### **Quick Test Sequence**
1. Start frontend: `npm start` 
2. Open browser: http://localhost:8080
3. Allow camera permissions
4. Look for green "Camera Ready" status
5. Press 'f' to start experiment
6. Follow through neutral capture phase

#### **Expected Console Output**
```bash
Found 1 camera devices: [Camera Name]
Auto-selecting main camera: [Camera Name]
Camera setup: 1 camera(s) available
Main camera started: [Device ID]
Single camera mode - capturing main, mocking second
```

### 🎨 Matrix Theme Features

#### **Status Indicators**
- **Green pulsing dot**: Camera ready and working
- **Yellow pulsing dot**: Single camera mode (normal for laptops)
- **Red dot**: Camera error or unavailable

#### **Visual Feedback**
- **Matrix green styling**: Consistent with theme
- **Animated elements**: Pulsing status indicators
- **Clear messaging**: Always know what's happening

### 📝 Development Notes

#### **Single Camera Benefits**
- ✅ **Faster startup**: Only one camera to initialize
- ✅ **Lower resource usage**: Better laptop performance  
- ✅ **Simpler debugging**: Fewer moving parts
- ✅ **Still fully functional**: All experiment features work

#### **Mock Second Camera**
- Creates realistic test images with timestamps
- Maintains same data structure as dual camera
- Useful for development and testing
- Clearly labeled as "MOCK CAMERA" in images

### 🎯 Ready to Run!

Your setup is optimized for single-camera laptop development. The app will:
- **Auto-detect** your built-in camera
- **Handle permissions** gracefully
- **Provide clear status** indicators
- **Work fully** with just one camera
- **Create mock data** where needed

**Just run `npm start` in the frontend directory and you're ready to test!** 🚀