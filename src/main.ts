import { AppModule } from './module';
import express  from 'express';

const app = express();
const appModule = new AppModule(app);

appModule.start().catch(console.error); 

export default app; 
