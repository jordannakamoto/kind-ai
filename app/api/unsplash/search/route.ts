import { NextRequest, NextResponse } from 'next/server';

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || 'nature';
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '12';

    if (!UNSPLASH_ACCESS_KEY) {
      return NextResponse.json({ error: 'Unsplash API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();

    // Format the response for our needs
    const formattedResults = {
      results: data.results.map((photo: any) => ({
        id: photo.id,
        urls: {
          small: photo.urls.thumb || photo.urls.small,
          regular: photo.urls.regular,
          full: photo.urls.full,
        },
        alt_description: photo.alt_description || photo.description || 'Therapy image',
        user: {
          name: photo.user.name,
          username: photo.user.username,
          profile_url: `https://unsplash.com/@${photo.user.username}?utm_source=kind_admin&utm_medium=referral`,
        },
        download_url: `${photo.links.download}?utm_source=kind_admin&utm_medium=referral`,
      })),
      total: data.total,
      total_pages: data.total_pages,
    };

    return NextResponse.json(formattedResults);

  } catch (error: any) {
    console.error('Unsplash API error:', error);
    return NextResponse.json({
      error: 'Failed to fetch images',
      details: error.message
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';