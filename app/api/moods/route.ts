import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use the database function to get all moods (default + custom)
    const { data: moodsData, error } = await supabase
      .rpc('get_user_moods', { p_user_id: user.id });

    if (error) {
      console.error('Error fetching user moods:', error);
      return NextResponse.json({ error: 'Failed to fetch moods' }, { status: 500 });
    }

    return NextResponse.json({ moods: moodsData || [] });
  } catch (error) {
    console.error('Error in GET /api/moods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...data } = await req.json();

    switch (action) {
      case 'create_custom_mood':
        return await createCustomMood(supabase, user.id, data);
      case 'update_custom_mood':
        return await updateCustomMood(supabase, user.id, data);
      case 'delete_custom_mood':
        return await deleteCustomMood(supabase, user.id, data);
      case 'update_mood_order':
        return await updateMoodOrder(supabase, user.id, data);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/moods:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function createCustomMood(supabase: any, userId: string, data: any) {
  const { emoji, label, value, colorTheme, sortOrder = 0 } = data;

  if (!emoji || !label || !value) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Check if mood value already exists for this user
  const { data: existingMood } = await supabase
    .from('custom_moods')
    .select('id')
    .eq('user_id', userId)
    .eq('value', value.toLowerCase())
    .eq('is_active', true)
    .single();

  if (existingMood) {
    return NextResponse.json({ error: 'Mood with this value already exists' }, { status: 409 });
  }

  const { data: newMood, error } = await supabase
    .from('custom_moods')
    .insert({
      user_id: userId,
      emoji: emoji.trim(),
      label: label.trim(),
      value: value.toLowerCase().trim(),
      color_theme: colorTheme,
      sort_order: sortOrder
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating custom mood:', error);
    return NextResponse.json({ error: 'Failed to create mood' }, { status: 500 });
  }

  return NextResponse.json({ mood: newMood });
}

async function updateCustomMood(supabase: any, userId: string, data: any) {
  const { moodId, emoji, label, value, colorTheme, sortOrder } = data;

  if (!moodId) {
    return NextResponse.json({ error: 'Missing mood ID' }, { status: 400 });
  }

  const updates: any = {};
  if (emoji !== undefined) updates.emoji = emoji.trim();
  if (label !== undefined) updates.label = label.trim();
  if (value !== undefined) updates.value = value.toLowerCase().trim();
  if (colorTheme !== undefined) updates.color_theme = colorTheme;
  if (sortOrder !== undefined) updates.sort_order = sortOrder;

  const { data: updatedMood, error } = await supabase
    .from('custom_moods')
    .update(updates)
    .eq('id', moodId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating custom mood:', error);
    return NextResponse.json({ error: 'Failed to update mood' }, { status: 500 });
  }

  return NextResponse.json({ mood: updatedMood });
}

async function deleteCustomMood(supabase: any, userId: string, data: any) {
  const { moodId } = data;

  if (!moodId) {
    return NextResponse.json({ error: 'Missing mood ID' }, { status: 400 });
  }

  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('custom_moods')
    .update({ is_active: false })
    .eq('id', moodId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting custom mood:', error);
    return NextResponse.json({ error: 'Failed to delete mood' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function updateMoodOrder(supabase: any, userId: string, data: any) {
  const { moodOrder } = data;

  console.log('updateMoodOrder called with:', { userId, moodOrder });

  if (!Array.isArray(moodOrder)) {
    console.error('Invalid mood order data:', moodOrder);
    return NextResponse.json({ error: 'Invalid mood order data' }, { status: 400 });
  }

  try {
    // Simple update - just save the mood order for now
    const updateData = {
      user_id: userId,
      mood_order: moodOrder
    };

    console.log('Upserting data:', updateData);

    // Try to update existing record first
    const { data: existing } = await supabase
      .from('user_mood_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result, error;

    if (existing) {
      // Update existing record
      const updateResult = await supabase
        .from('user_mood_preferences')
        .update({ mood_order: moodOrder })
        .eq('user_id', userId)
        .select();

      result = updateResult.data;
      error = updateResult.error;
    } else {
      // Create new record
      const insertResult = await supabase
        .from('user_mood_preferences')
        .insert(updateData)
        .select();

      result = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      console.error('Supabase error updating mood order:', error);
      return NextResponse.json({
        error: 'Failed to update mood order',
        details: error.message
      }, { status: 500 });
    }

    console.log('Update successful:', result);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unexpected error in updateMoodOrder:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';