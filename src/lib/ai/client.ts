import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// Read API key directly from .env.local file since system env vars are interfering
function getApiKey(): string {
  // First try process.env
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Fall back to reading from .env.local file directly
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/ANTHROPIC_API_KEY="([^"]+)"/);
    if (match && match[1]) {
      console.log('Loaded ANTHROPIC_API_KEY from .env.local file');
      return match[1];
    }
  } catch (e) {
    console.error('Could not read .env.local:', e);
  }

  console.error('ANTHROPIC_API_KEY is not available');
  return '';
}

const apiKey = getApiKey();

export const anthropic = new Anthropic({
  apiKey,
});

export const AI_CONFIG = {
  model: 'claude-sonnet-4-20250514' as const,
  maxTokens: 4096,
  temperature: 0.7,
};
