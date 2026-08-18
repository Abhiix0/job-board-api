import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

async function start() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

start();