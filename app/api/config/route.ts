import { NextResponse } from 'next/server';
import {
  RESOLVED_COUNCIL_MODEL_CONFIGS,
  CHAIRMAN_MODEL,
} from '@/lib/config';

export async function GET() {
  return NextResponse.json({
    council_models: RESOLVED_COUNCIL_MODEL_CONFIGS,
    chairman_model: CHAIRMAN_MODEL,
  });
}


