import { AppModule } from './module';
import express from 'express';

const app = express();
const appModule = new AppModule(app);

let isInitialized = false;

const initializeApp = async () => {
  if (!isInitialized) {
    await appModule.start();
    isInitialized = true;
    console.log('AppModule initialized successfully');
  }
  return app;
};

// Export async handler for Vercel
export default async (req: any, res: any) => {
  try {
    const expressApp = await initializeApp();
    return expressApp(req, res);
  } catch (error) {
    console.error('Initialization error:', error);
    return res.status(500).json({ 
      error: 'Server initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};