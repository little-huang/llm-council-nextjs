/**
 * API route for streaming message responses.
 */

import { NextRequest } from 'next/server';
import {
  getConversation,
  addUserMessage,
  addAssistantMessage,
  updateConversationTitle,
} from '@/lib/storage';
import {
  stage1CollectResponses,
  stage2CollectRankings,
  stage3SynthesizeFinal,
  calculateAggregateRankings,
  generateConversationTitle,
  CouncilModelConfig,
} from '@/lib/council';
import { RESOLVED_COUNCIL_MODEL_CONFIGS } from '@/lib/config';
import { z } from 'zod';

// POST /api/conversations/[id]/message/stream
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const parsedBody = RequestBodySchema.safeParse(body);

    if (!parsedBody.success) {
      const message = parsedBody.error.issues
        .map((issue) => issue.message)
        .join('; ');
      return new Response(
        JSON.stringify({ error: `Invalid request body: ${message}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { content, councilModels, chairmanModel } = parsedBody.data;
    const activeCouncilModels = sanitizeCouncilModelsInput(councilModels);
    const chairmanSelection = sanitizeChairmanModelInput(chairmanModel);
    const { id } = await params;
    const conversationId = id;

    // Check if conversation exists
    const conversation = getConversation(conversationId);
    if (!conversation) {
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is the first message
    const isFirstMessage = conversation.messages.length === 0;

    // Create a readable stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data?: any) => {
          const event = data ? { type, ...data } : { type };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        };

        try {
          // Add user message
          addUserMessage(conversationId, content);

          // Start title generation in parallel (don't await yet)
          let titlePromise: Promise<string> | null = null;
          if (isFirstMessage) {
            titlePromise = generateConversationTitle(content);
          }

          // Stage 1: Collect responses
          sendEvent('stage1_start');
          const stage1Results = await stage1CollectResponses(
            content,
            activeCouncilModels
          );
          sendEvent('stage1_complete', { data: stage1Results });

          // Stage 2: Collect rankings
          sendEvent('stage2_start');
          let metadata: {
            label_to_model: Record<string, string>;
            aggregate_rankings: any[];
          } | null = null;

          const { rankings: stage2Results, labelToModel } =
            await stage2CollectRankings(
              content,
              stage1Results,
              activeCouncilModels
            );
          const aggregateRankings = calculateAggregateRankings(
            stage2Results,
            labelToModel
          );
          metadata = {
            label_to_model: labelToModel,
            aggregate_rankings: aggregateRankings,
          };
          sendEvent('stage2_complete', {
            data: stage2Results,
            metadata,
          });

          // Stage 3: Synthesize final answer
          sendEvent('stage3_start');
          const stage3Result = await stage3SynthesizeFinal(
            content,
            stage1Results,
            stage2Results,
            chairmanSelection
          );
          sendEvent('stage3_complete', { data: stage3Result });

          // Wait for title generation if it was started
          if (titlePromise) {
            const title = await titlePromise;
            updateConversationTitle(conversationId, title);
            sendEvent('title_complete', { data: { title } });
          }

          // Save complete assistant message
          addAssistantMessage(
            conversationId,
            stage1Results,
            stage2Results,
            stage3Result,
            metadata
          );

          // Send completion event
          sendEvent('complete');

          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in stream endpoint:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

const CouncilModelSchema = z.object({
  model: z.string().min(1, 'Model identifier cannot be empty.'),
  systemPrompt: z.string().optional(),
});

const RequestBodySchema = z.object({
  content: z.string().min(1, 'Message content cannot be empty.'),
  councilModels: z.array(CouncilModelSchema).optional(),
  chairmanModel: z.string().optional(),
});

function sanitizeCouncilModelsInput(
  input?: CouncilModelConfig[]
): CouncilModelConfig[] {
  const source =
    input && input.length > 0 ? input : RESOLVED_COUNCIL_MODEL_CONFIGS;

  const normalized = source
    .map((cfg) => ({
      model: cfg.model.trim(),
      systemPrompt: cfg.systemPrompt?.trim() || undefined,
    }))
    .filter((cfg) => cfg.model.length > 0);

  if (normalized.length === 0) {
    throw new Error('At least one council model must be provided.');
  }

  return normalized;
}

function sanitizeChairmanModelInput(input?: string | null): string | undefined {
  const trimmed = input?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed;
}

