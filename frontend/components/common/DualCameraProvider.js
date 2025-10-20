import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { useDispatch } from 'react-redux';
import { setCameraReady, setCaptureError } from '../../redux/captureSlice';

const CameraContext = createContext(null);

export const useCamera = () => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCamera must be used within DualCameraProvider');
  }
  return context;
};

/**
 * DualCameraProvider - Manages two camera streams for the experiment
 * Camera 1: Participant's face (for emotion/effort capture)
 * Camera 2: Dynamometer/equipment view (for physical effort monitoring)
 */
export const DualCameraProvider = ({ children }) => {
  const dispatch = useDispatch();
  
  // Camera device management
  const [cameras, setCameras] = useState([]);
  const [selectedMainCamera, setSelectedMainCamera] = useState('');
  const [selectedSecondCamera, setSelectedSecondCamera] = useState('');
  const [camerasInitialized, setCamerasInitialized] = useState(false);
  
  // Video element refs for capture
  const mainVideoRef = useRef(null);
  const secondVideoRef = useRef(null);
  
  // Stream refs to manage active streams
  const mainStreamRef = useRef(null);
  const secondStreamRef = useRef(null);
  
  // Canvas refs for image capture
  const mainCanvasRef = useRef(null);
  const secondCanvasRef = useRef(null);

  // Initialize cameras on mount
  useEffect(() => {
    initializeCameraDevices();
    
    // Load saved camera selections from localStorage
    const savedMain = localStorage.getItem('nstplus_main_camera');
    const savedSecond = localStorage.getItem('nstplus_second_camera');
    
    if (savedMain) setSelectedMainCamera(savedMain);
    if (savedSecond) setSelectedSecondCamera(savedSecond);
    
    // Cleanup on unmount
    return () => {
      stopAllCameras();
    };
  }, []);

  /**
   * Enumerate available camera devices
   */
  const initializeCameraDevices = async () => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('getUserMedia not supported - running in no-camera mode');
        setCameras([]);
        setCamerasInitialized(true);
        dispatch(setCameraReady(false));
        return;
      }

      // Request permission first with a temporary stream
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Now enumerate devices (will have labels after permission)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // Stop the temporary stream
      tempStream.getTracks().forEach(track => track.stop());
      
      setCameras(videoDevices);
      setCamerasInitialized(true);
      dispatch(setCameraReady(videoDevices.length > 0));
      
      console.log(`Found ${videoDevices.length} camera devices:`, videoDevices);
      
      if (videoDevices.length === 0) {
        console.warn('No camera devices found - experiment will run without cameras');
        dispatch(setCaptureError('No cameras detected. Experiment will run without video capture.'));
      }
      
    } catch (err) {
      console.warn('Camera initialization failed - running in no-camera mode:', err.message);
      
      // Set cameras as initialized but empty - don't block the app
      setCameras([]);
      setCamerasInitialized(true);
      dispatch(setCameraReady(false));
      
      // Provide user-friendly error message
      const errorMessage = err.name === 'NotAllowedError' 
        ? 'Camera permission denied. Experiment will run without video capture.'
        : err.name === 'NotFoundError'
        ? 'No cameras found. Experiment will run without video capture.'
        : `Camera unavailable (${err.message}). Experiment will run without video capture.`;
        
      dispatch(setCaptureError(errorMessage));
    }
  };

  /**
   * Start the main camera stream (participant face)
   */
  const startMainCamera = async (deviceId) => {
    try {
      // Stop existing stream if any
      if (mainStreamRef.current) {
        mainStreamRef.current.getTracks().forEach(track => track.stop());
        mainStreamRef.current = null;
      }
      
      const constraints = {
        video: deviceId 
          ? { 
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          : { 
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mainStreamRef.current = stream;
      
      // Connect to video element
      if (mainVideoRef.current) {
        mainVideoRef.current.srcObject = stream;
        await mainVideoRef.current.play();
        console.log('Main camera started:', deviceId || 'default');
      }
      
      return stream;
      
    } catch (err) {
      console.error('Error starting main camera:', err);
      dispatch(setCaptureError('Main camera failed: ' + err.message));
      return null;
    }
  };

  /**
   * Start the second camera stream (equipment view)
   */
  const startSecondCamera = async (deviceId) => {
    try {
      // Stop existing stream if any
      if (secondStreamRef.current) {
        secondStreamRef.current.getTracks().forEach(track => track.stop());
        secondStreamRef.current = null;
      }
      
      if (!deviceId) {
        console.log('No second camera selected');
        return null;
      }
      
      const constraints = {
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      secondStreamRef.current = stream;
      
      // Connect to video element
      if (secondVideoRef.current) {
        secondVideoRef.current.srcObject = stream;
        await secondVideoRef.current.play();
        console.log('Second camera started:', deviceId);
      }
      
      return stream;
      
    } catch (err) {
      console.error('Error starting second camera:', err);
      // Second camera is optional, so just log the error
      return null;
    }
  };

  /**
   * Stop all camera streams
   */
  const stopAllCameras = () => {
    console.log('Stopping all cameras');
    
    if (mainStreamRef.current) {
      mainStreamRef.current.getTracks().forEach(track => track.stop());
      mainStreamRef.current = null;
    }
    
    if (secondStreamRef.current) {
      secondStreamRef.current.getTracks().forEach(track => track.stop());
      secondStreamRef.current = null;
    }
    
    if (mainVideoRef.current) {
      mainVideoRef.current.srcObject = null;
    }
    
    if (secondVideoRef.current) {
      secondVideoRef.current.srcObject = null;
    }
  };

  /**
   * Capture a photo from specified camera
   */
  const capturePhoto = async (videoRef, canvasRef, label = 'photo') => {
    if (!videoRef?.current || !canvasRef?.current) {
      console.error(`Missing refs for capture: ${label}`);
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Wait for video to be ready with better error handling
    if (video.readyState < 2) {
      console.log(`Waiting for video ready state: ${label}`);
      await new Promise((resolve) => {
        const handleLoad = () => {
          console.log(`Video loaded for ${label}:`, {
            readyState: video.readyState,
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight
          });
          resolve();
        };
        video.addEventListener('loadeddata', handleLoad, { once: true });
        video.addEventListener('loadedmetadata', handleLoad, { once: true });
        // Timeout after 3 seconds
        setTimeout(() => {
          video.removeEventListener('loadeddata', handleLoad);
          video.removeEventListener('loadedmetadata', handleLoad);
          console.warn(`Video load timeout for ${label}, proceeding anyway`);
          resolve();
        }, 3000);
      });
    }
    
    // Check video dimensions and try to get them
    if (!video.videoWidth || !video.videoHeight) {
      // Try waiting a bit more for dimensions
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!video.videoWidth || !video.videoHeight) {
        console.warn(`Video has no dimensions for ${label}, using default size`);
        // Don't return null, use default dimensions
      }
    }
    
    try {
      // Set canvas dimensions to match video or use defaults
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      console.log(`Canvas dimensions for ${label}: ${canvas.width}x${canvas.height}`);
      
      const context = canvas.getContext('2d');
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              console.log(`Photo captured: ${label}, size: ${blob.size} bytes`);
            }
            resolve(blob);
          },
          'image/jpeg',
          0.95
        );
      });
      
    } catch (err) {
      console.error(`Error capturing photo ${label}:`, err);
      return null;
    }
  };

  /**
   * Create a mock photo blob for testing without cameras
   */
  const createMockPhoto = (label, width = 640, height = 480) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Create a simple pattern with timestamp and label
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, width - 20, height - 20);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`MOCK CAMERA: ${label.toUpperCase()}`, width / 2, height / 2 - 20);
    ctx.fillText(new Date().toISOString(), width / 2, height / 2 + 20);
    
    return new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
  };

  /**
   * Capture photos from both cameras simultaneously
   */
  const captureBothCameras = async (mainLabel = 'main', secondLabel = 'second') => {
    console.log(`Capturing photos: ${cameras.length} camera(s) available`);
    
    // If no cameras are available, create mock photos for testing
    if (cameras.length === 0) {
      console.warn('No cameras available - creating mock photos for testing');
      const results = await Promise.all([
        createMockPhoto(mainLabel),
        createMockPhoto(secondLabel)
      ]);
      
      return {
        main: results[0],
        second: results[1]
      };
    }

    // Handle single camera scenario - capture from main, mock for second
    if (cameras.length === 1 && selectedMainCamera && !selectedSecondCamera) {
      console.log('Single camera mode - capturing main, mocking second');
      const results = await Promise.all([
        capturePhoto(mainVideoRef, mainCanvasRef, mainLabel),
        createMockPhoto(`${secondLabel}_mock`)
      ]);
      
      return {
        main: results[0],
        second: results[1]
      };
    }

    // Normal dual camera capture
    const results = await Promise.all([
      capturePhoto(mainVideoRef, mainCanvasRef, mainLabel),
      capturePhoto(secondVideoRef, secondCanvasRef, secondLabel)
    ]);
    
    return {
      main: results[0],
      second: results[1]
    };
  };

  // Start cameras when selections change
  useEffect(() => {
    if (selectedMainCamera && camerasInitialized) {
      startMainCamera(selectedMainCamera);
      localStorage.setItem('nstplus_main_camera', selectedMainCamera);
    }
  }, [selectedMainCamera, camerasInitialized]);

  useEffect(() => {
    if (selectedSecondCamera && camerasInitialized) {
      startSecondCamera(selectedSecondCamera);
      localStorage.setItem('nstplus_second_camera', selectedSecondCamera);
    }
  }, [selectedSecondCamera, camerasInitialized]);

  // Auto-select cameras if available and no saved preference
  useEffect(() => {
    if (!camerasInitialized || cameras.length === 0) return;
    
    const savedMain = localStorage.getItem('nstplus_main_camera');
    const savedSecond = localStorage.getItem('nstplus_second_camera');
    
    // Auto-select main camera (usually built-in/first camera)
    if (!selectedMainCamera && !savedMain && cameras.length > 0) {
      console.log('Auto-selecting main camera:', cameras[0].label || cameras[0].deviceId);
      setSelectedMainCamera(cameras[0].deviceId);
    }
    
    // Only auto-select second camera if we have multiple cameras
    if (!selectedSecondCamera && !savedSecond && cameras.length > 1) {
      console.log('Auto-selecting second camera:', cameras[1].label || cameras[1].deviceId);
      setSelectedSecondCamera(cameras[1].deviceId);
    }
    
    // Log camera setup for debugging
    console.log(`Camera setup: ${cameras.length} camera(s) available`);
    cameras.forEach((camera, index) => {
      console.log(`  Camera ${index + 1}: ${camera.label || camera.deviceId}`);
    });
  }, [cameras, camerasInitialized]);

  const value = {
    // Camera devices
    cameras,
    camerasInitialized,
    
    // Camera selections
    selectedMainCamera,
    selectedSecondCamera,
    setSelectedMainCamera,
    setSelectedSecondCamera,
    
    // Video refs for display components
    mainVideoRef,
    secondVideoRef,
    
    // Stream refs
    mainStreamRef,
    secondStreamRef,
    
    // Methods
    capturePhoto,
    captureBothCameras,
    startMainCamera,
    startSecondCamera,
    stopAllCameras,
    initializeCameraDevices
  };

  return (
    <CameraContext.Provider value={value}>
      {/* Hidden video elements for capture - always present */}
      <div style={{ position: 'fixed', top: '-10000px', left: '-10000px' }}>
        <video
          ref={mainVideoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '1280px', height: '720px' }}
          onLoadedMetadata={(e) => {
            console.log('Main video loaded:', {
              width: e.target.videoWidth,
              height: e.target.videoHeight
            });
          }}
        />
        <video
          ref={secondVideoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '1280px', height: '720px' }}
          onLoadedMetadata={(e) => {
            console.log('Second video loaded:', {
              width: e.target.videoWidth,
              height: e.target.videoHeight
            });
          }}
        />
        <canvas ref={mainCanvasRef} />
        <canvas ref={secondCanvasRef} />
      </div>
      {children}
    </CameraContext.Provider>
  );
};

export default DualCameraProvider;