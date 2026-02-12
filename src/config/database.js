import mongoose from 'mongoose';

export const connectDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error(' MongoDB Connection Error:', error);
    throw error;
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log(' MongoDB Disconnected');
});

mongoose.connection.on('error', (error) => {
  console.error('MongoDB Error:', error);
});


