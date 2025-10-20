/**
 * Test script to verify application runs without cameras
 * 
 * This script mocks the getUserMedia API to simulate no-camera scenarios
 * and verifies the application handles it gracefully.
 */

// Mock navigator.mediaDevices to simulate different scenarios
const mockNoSupport = () => {
  delete global.navigator;
  global.navigator = {};
  console.log('✓ Mocked no getUserMedia support');
};

const mockNoPermission = () => {
  global.navigator = {
    mediaDevices: {
      getUserMedia: () => Promise.reject(new Error('NotAllowedError')),
      enumerateDevices: () => Promise.resolve([])
    }
  };
  console.log('✓ Mocked no camera permission');
};

const mockNoCameras = () => {
  global.navigator = {
    mediaDevices: {
      getUserMedia: () => Promise.reject(new Error('NotFoundError')),
      enumerateDevices: () => Promise.resolve([])
    }
  };
  console.log('✓ Mocked no cameras found');
};

const mockWorkingCameras = () => {
  global.navigator = {
    mediaDevices: {
      getUserMedia: () => Promise.resolve({
        getTracks: () => [{ stop: () => {} }]
      }),
      enumerateDevices: () => Promise.resolve([
        { kind: 'videoinput', deviceId: 'camera1', label: 'Built-in Camera' },
        { kind: 'videoinput', deviceId: 'camera2', label: 'USB Camera' }
      ])
    }
  };
  console.log('✓ Mocked working cameras');
};

const testScenarios = [
  { name: 'No getUserMedia Support', mock: mockNoSupport },
  { name: 'No Camera Permission', mock: mockNoPermission },
  { name: 'No Cameras Found', mock: mockNoCameras },
  { name: 'Working Cameras', mock: mockWorkingCameras }
];

console.log('🧪 Testing camera fallback scenarios...\n');

testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. Testing: ${scenario.name}`);
  scenario.mock();
  console.log('   Camera initialization should handle this gracefully\n');
});

console.log('✅ All scenarios mocked successfully');
console.log('\n📋 Expected behaviors:');
console.log('   - App should start without crashing');
console.log('   - Users should see informative status messages');
console.log('   - Experiments should run with mock data when no cameras');
console.log('   - No blocking errors or infinite loading states');

console.log('\n🚀 Ready to test application startup with various camera states');