import { NextRequest, NextResponse } from 'next/server';
import { validateOverlayToken } from '@/lib/overlay/credentials';
import { getOverlayPublicState } from '@/lib/overlay/public-state';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing overlay token' },
      { status: 400 }
    );
  }

  const validation = await validateOverlayToken(token);
  if (!validation.valid || !validation.auctionId) {
    return NextResponse.json(
      { error: validation.error ?? 'Invalid token' },
      { status: 401 }
    );
  }

  const state = await getOverlayPublicState(validation.auctionId);
  if (!state) {
    return NextResponse.json(
      { error: 'Auction not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(state, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
