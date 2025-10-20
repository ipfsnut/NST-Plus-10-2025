const MongoStore = require('connect-mongo');
const config = require('../config');

const mongoStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI || config.mongoUri,
  collectionName: 'sessions'
});
