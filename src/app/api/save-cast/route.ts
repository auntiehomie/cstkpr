// src/app/api/save-cast/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { castUrl, userFid } = await request.json();

    if (!castUrl || !userFid) {
      return NextResponse.json(
        { error: 'Missing castUrl or userFid' },
        { status: 400 }
      );
    }

    // Extract cast hash from URL
    const castHash = extractCastHashFromUrl(castUrl);
    if (!castHash) {
      return NextResponse.json(
        { error: 'Invalid cast URL format' },
        { status: 400 }
      );
    }

    // Fetch cast data from Neynar
    const castData = await fetchCastFromNeynar(castHash);
    
    // Get or create user in database
    const user = await getOrCreateUser(userFid);
    
    // Save cast to database
    const savedCast = await saveCastToDatabase(castData, user.id);
    
    return NextResponse.json({ 
      success: true, 
      cast: savedCast,
      message: 'Cast saved successfully' 
    });

  } catch (error) {
    console.error('Error saving cast:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save cast',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function extractCastHashFromUrl(url: string): string {
  // Handle different Farcaster URL formats:
  // https://warpcast.com/username/0x123abc
  // https://farcaster.xyz/username/0x123abc
  // Or just a hash: 0x123abc
  
  if (url.startsWith('0x')) {
    return url;
  }
  
  const match = url.match(/\/0x([a-fA-F0-9]+)/);
  return match ? `0x${match[1]}` : '';
}

async function fetchCastFromNeynar(castHash: string) {
  const apiKey = process.env.NEYNAR_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEYNAR_API_KEY not configured');
  }

  console.log('Using API key:', apiKey.substring(0, 8) + '...');
  console.log('Fetching cast:', castHash);

  const response = await fetch(
    `https://api.neynar.com/v2/farcaster/cast?identifier=${castHash}&type=hash`,
    {
      headers: {
        'api_key': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Neynar API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

async function getOrCreateUser(fid: number) {
  // First, try to find existing user
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('fid', fid)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // If user doesn't exist, create them
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert([{ fid }])
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create user: ${createError.message}`);
  }

  return newUser;
}

async function saveCastToDatabase(castData: any, userId: string) {
  const cast = castData.cast;
  
  // Check if cast already exists for this user
  const { data: existingCast } = await supabase
    .from('saved_casts')
    .select('id')
    .eq('cast_hash', cast.hash)
    .eq('user_id', userId)
    .single();

  if (existingCast) {
    throw new Error('Cast already saved');
  }

  const { data, error } = await supabase
    .from('saved_casts')
    .insert([
      {
        user_id: userId,
        cast_hash: cast.hash,
        cast_author_fid: cast.author.fid,
        cast_author_username: cast.author.username,
        cast_author_display_name: cast.author.display_name,
        cast_author_avatar_url: cast.author.pfp_url,
        cast_text: cast.text,
        cast_embeds: cast.embeds || [],
        cast_mentions: cast.mentions || [],
        cast_parent_hash: cast.parent_hash,
        cast_parent_url: cast.parent_url,
        cast_timestamp: cast.timestamp,
        cast_replies_count: cast.replies?.count || 0,
        cast_reactions_count: cast.reactions?.count || 0,
        cast_recasts_count: cast.recasts?.count || 0,
      }
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}