import { NextRequest, NextResponse } from 'next/server';
import { OPENROUTER_API_KEY } from '@/lib/config';

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

export async function GET(request: NextRequest) {
  try {
    // Get API key from header or fall back to environment variable
    const headerApiKey = request.headers.get('x-openrouter-api-key');
    const effectiveApiKey = headerApiKey || OPENROUTER_API_KEY;

    if (!effectiveApiKey) {
      return NextResponse.json(
        { error: 'No API key provided. Please configure your OpenRouter API key.' },
        { status: 401 }
      );
    }

    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: {
        Authorization: `Bearer ${effectiveApiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch models: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();
    const models =
      data?.data
        ?.filter(isChatCapableModel)
        ?.map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description || '',
          pricing: model?.pricing?.prompt || null,
          context_length: model?.context_length || null,
          tags: model?.tags || [],
        })) || [];

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return NextResponse.json(
      { error: 'Failed to load models from OpenRouter' },
      { status: 500 }
    );
  }
}

function isChatCapableModel(model: any): boolean {
  if (!model) return false;

  const capabilities = model?.capabilities || {};
  if (capabilities.chat === true) return true;

  // Some providers expose completion but not chat explicitly
  if (capabilities.completion === true && capabilities.image !== true) {
    return true;
  }

  const rawModality = model?.architecture?.modality;
  const modalityList = Array.isArray(rawModality)
    ? rawModality
    : typeof rawModality === 'string'
      ? [rawModality]
      : [];

  if (
    modalityList.some((item) =>
      typeof item === 'string' && item.toLowerCase().includes('text')
    )
  ) {
    return true;
  }

  const tags = Array.isArray(model?.tags) ? model.tags : [];
  return tags.some((tag: unknown) => {
    if (typeof tag !== 'string') return false;
    const normalized = tag.toLowerCase();
    return normalized.includes('chat') || normalized.includes('text');
  });
}



