import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export interface AudioFormat {
  format: 'mp3' | 'm4a' | 'opus' | 'wav' | 'flac';
  quality: 'best' | 'worst' | string; // e.g., '192', '320'
  codec?: string;
}

export interface ExtractionOptions {
  url: string;
  format: AudioFormat;
  outputPath?: string;
  metadata?: {
    title?: stri