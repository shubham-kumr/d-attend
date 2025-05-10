import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { apiRoutes } from './routes';
import { logger } from './utils/logger';

// Initialize express app
const app = express();

// Apply middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Routes
app.use('/api/v1', apiRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize IPFS service when app starts
// This happens automatically when first importing the service
import './services/ipfs.service';

export { app };