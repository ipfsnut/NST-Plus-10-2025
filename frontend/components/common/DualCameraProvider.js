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
      // Request permission first with a temporary stream
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Now enumerate devices (will have labels after permission)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // Stop the temporary stream
      tempStream.getTracks().forEach(track => track.stop());
      
      setCameras(videoDevices);
      setCamerasInitialized(true);
      dispatch(setCameraReady(true));
      
      console.log(`Found ${videoDevices.length} camera devices:`, videoDevices);
      
    } catch (err) {
      console.error('Error initializing camera devices:', err);
      dispatch(setCaptureError('Failed to initialize cameras: ' + err.message));
      setCamerasInitialized(false);
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
    
    // Wait for video to be ready
    if (video.readyState < 2) {
      console.log(`Waiting for video ready state: ${label}`);
      await new Promise((resolve) => {
        const handleLoad = () => resolve();
        video.addEventListener('loadeddata', handleLoad, { once: true });
        // Timeout after 2 seconds
        setTimeout(() => {
          video.removeEventListener('loadeddata', handleLoad);
          resolve();
        }, 2000);
      });
    }
    
    // Verify video has valid dimensions
    if (!video.videoWidth || !video.videoHeight) {
      console.error(`Video has no dimensions: ${label}`);
      return null;
    }
    
    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
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
   * Capture photos from both cameras simultaneously
   */
  const captureBothCameras = async (mainLabel = 'main', secondLabel = 'second') => {
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
      setSelectedMainCamera(cameras[0].deviceId);
    }
    
    // Auto-select second camera if available (usually external/USB)
    if (!selectedSecondCamera && !savedSecond && cameras.length > 1) {
      setSelectedSecondCamera(cameras[1].deviceId);
    }
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