import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { enableMocks } from './mocks';

async function start() {
  await enableMocks();
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
}

void start();
