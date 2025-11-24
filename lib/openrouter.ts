/**
 * OpenRouter API client for making LLM requests.
 */

import { OPENROUTER_API_KEY, OPENROUTER_API_URL } from './config';

interface Message {
  role: string;
  content: string;
}

interface ModelResponse {
  content: string;
  reasoning_details?: any;
}

export async function queryModel(
  model: string,
  messages: Message[],
  timeout: number = 120000
): Promise<ModelResponse | null> {
  /**
   * Query a single model via OpenRouter API.
   */
  const headers = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const payload = {
    model,
    messages,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices[0].message;

    return {
      content: message.content || '',
      reasoning_details: message.reasoning_details,
    };
  } catch (error) {
    console.error(`Error querying model ${model}:`, error);
    return null;
  }
}

export async function queryModelsParallel(
  models: string[],
  messages: Message[]
): Promise<Record<string, ModelResponse | null>> {
  /**
   * Query multiple models in parallel.
   */
  const tasks = models.map(model => queryModel(model, messages));
  const responses = await Promise.all(tasks);

  // Map models to their responses
  const result: Record<string, ModelResponse | null> = {};
  models.forEach((model, index) => {
    result[model] = responses[index];
  });

  return result;
}

