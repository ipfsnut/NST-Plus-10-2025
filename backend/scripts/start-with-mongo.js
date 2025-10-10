const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

let mongod = null;

async function startMongoDB() {
  try {
    console.log('🚀 Starting in-memory MongoDB...');
    
    mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'nstplus'
      },
      binary: {
        version: '7.0.0'
      }
    });
    
    const uri = mongod.getUri();
    console.log(`✅ MongoDB started at: ${uri}`);
    
    // Update environment variable for the session
    process.env.MONGODB_URI = uri;
    
    return uri;
  } catch (error) {
    console.error('❌ Failed to start MongoDB:', error);
    throw error;
  }
}

async function startApp() {
  try {
    await startMongoDB();
    
    console.log('🚀 Starting NST+ backend...');
    
    // Start the main app
    const app = spawn('node', ['src/app.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    app.on('close', (code) => {
      console.log(`\n🛑 App process exited with code ${code}`);
      cleanup();
    });
    
    // Handle process termination
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    cleanup();
    process.exit(1);
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  
  if (mongod) {
    try {
      await mongod.stop();
      console.log('✅ MongoDB stopped');
    } catch (error) {
      console.error('❌ Error stopping MongoDB:', error);
    }
  }
  
  process.exit(0);
}

startApp();