import { AppModule } from './module';
import express  from 'express';
const bootstrap=()=>{
    const app = new AppModule(express());
    app.start();
}

bootstrap();