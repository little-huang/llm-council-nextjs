/**
 * API route for listing and creating conversations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { listConversations, createConversation } from '@/lib/storage';

// GET /api/conversations - List all conversations
export async function GET() {
  try {
    const conversations = listConversations();
    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error listing conversations:', error);
    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST() {
  try {
    const conversationId = uuidv4();
    const conversation = createConversation(conversationId);
    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

