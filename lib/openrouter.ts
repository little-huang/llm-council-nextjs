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

interface QueryOptions {
  timeout?: number;
  systemPrompt?: string;
  apiKey?: string;
}

export interface ModelTask {
  model: string;
  messages: Message[];
  timeout?: number;
  systemPrompt?: string;
  apiKey?: string;
}

// Get the effective API key (runtime override takes precedence)
function getEffectiveApiKey(runtimeKey?: string): string {
  const key = runtimeKey || OPENROUTER_API_KEY;
  if (!key) {
    throw new Error('No OpenRouter API key provided. Please configure your API key.');
  }
  return key;
}

export async function queryModel(
  model: string,
  messages: Message[],
  options: QueryOptions = {}
): Promise<ModelResponse | null> {
  /**
   * Query a single model via OpenRouter API.
   */
  const timeout = options.timeout ?? 120000;
  const effectiveApiKey = getEffectiveApiKey(options.apiKey);
  const headers = {
    'Authorization': `Bearer ${effectiveApiKey}`,
    'Content-Type': 'application/json',
  };

  const payload = {
    model,
    messages: options.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }, ...messages]
      : messages,
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
  tasks: ModelTask[],
  apiKey?: string
): Promise<Record<string, ModelResponse | null>> {
  /**
   * Query multiple models in parallel.
   */
  const responses = await Promise.all(
    tasks.map((task) =>
      queryModel(task.model, task.messages, {
        timeout: task.timeout,
        systemPrompt: task.systemPrompt,
        apiKey: task.apiKey || apiKey,
      })
    )
  );

  // Map models to their responses
  const result: Record<string, ModelResponse | null> = {};
  tasks.forEach((task, index) => {
    result[task.model] = responses[index];
  });

  return result;
}

