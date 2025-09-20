import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { action, goalId, userId, ...data } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    switch (action) {
      case 'update_progress':
        return await updateGoalProgress(goalId, userId, data);
      case 'archive_goal':
        return await archiveGoal(goalId, userId, data.reason || 'completed');
      case 'cleanup_completed':
        return await cleanupCompletedGoals(userId);
      case 'update_goal_type':
        return await updateGoalType(goalId, userId, data);
      case 'add_list_item':
        return await addListItem(goalId, userId, data);
      case 'remove_list_item':
        return await removeListItem(goalId, userId, data);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Goal Management Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function updateGoalProgress(goalId: string, userId: string, data: any) {
  const { increment, setValue, targetValue } = data;

  if (!goalId) {
    return NextResponse.json({ error: 'Missing goalId' }, { status: 400 });
  }

  // Get current goal
  const { data: goal, error: fetchError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }

  let newValue = goal.current_value || 0;
  let updates: any = {};

  // Handle different update types
  if (increment !== undefined) {
    newValue = Math.max(0, newValue + increment);
  } else if (setValue !== undefined) {
    newValue = Math.max(0, setValue);
  }

  updates.current_value = newValue;

  // Update target if provided
  if (targetValue !== undefined) {
    updates.target_value = targetValue;
  }

  // Auto-complete progress goals that reach target
  if (goal.goal_type === 'progress' && goal.target_value && newValue >= goal.target_value) {
    updates.completed_at = new Date().toISOString();
  }

  const { data: updatedGoal, error: updateError } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }

  return NextResponse.json({ success: true, goal: updatedGoal });
}

async function archiveGoal(goalId: string, userId: string, reason: string) {
  if (!goalId) {
    return NextResponse.json({ error: 'Missing goalId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('goals')
    .update({
      archived_at: new Date().toISOString(),
      archived_reason: reason,
      is_active: false
    })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to archive goal' }, { status: 500 });
  }

  return NextResponse.json({ success: true, goal: data });
}

async function cleanupCompletedGoals(userId: string) {
  // Archive goals that have been completed for more than 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: completedGoals, error: fetchError } = await supabase
    .from('goals')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .not('completed_at', 'is', null)
    .lt('completed_at', thirtyDaysAgo.toISOString());

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch completed goals' }, { status: 500 });
  }

  if (completedGoals && completedGoals.length > 0) {
    const goalIds = completedGoals.map(g => g.id);

    const { error: archiveError } = await supabase
      .from('goals')
      .update({
        archived_at: new Date().toISOString(),
        archived_reason: 'completed',
        is_active: false
      })
      .in('id', goalIds)
      .eq('user_id', userId);

    if (archiveError) {
      return NextResponse.json({ error: 'Failed to archive completed goals' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Archived ${completedGoals.length} completed goals`,
      archivedCount: completedGoals.length
    });
  }

  return NextResponse.json({
    success: true,
    message: 'No completed goals to archive',
    archivedCount: 0
  });
}

async function updateGoalType(goalId: string, userId: string, data: any) {
  const { goalType, targetValue, currentValue } = data;

  if (!goalId || !goalType) {
    return NextResponse.json({ error: 'Missing goalId or goalType' }, { status: 400 });
  }

  const updates: any = {
    goal_type: goalType
  };

  // Set appropriate values based on goal type
  switch (goalType) {
    case 'basic':
      // Reset values for basic goals
      updates.current_value = 0;
      updates.target_value = null;
      break;
    case 'counter':
      // Set current value, no target needed
      updates.current_value = currentValue || 0;
      updates.target_value = null;
      break;
    case 'progress':
      // Set both current and target values
      updates.current_value = currentValue || 0;
      updates.target_value = targetValue || 100;
      break;
    case 'list':
      // Initialize empty list
      updates.current_value = 0;
      updates.target_value = null;
      updates.list_items = [];
      break;
  }

  const { data: updatedGoal, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update goal type' }, { status: 500 });
  }

  return NextResponse.json({ success: true, goal: updatedGoal });
}

async function addListItem(goalId: string, userId: string, data: any) {
  const { value, notes } = data;

  if (!goalId || !value) {
    return NextResponse.json({ error: 'Missing goalId or value' }, { status: 400 });
  }

  // Get current goal
  const { data: goal, error: fetchError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }

  if (goal.goal_type !== 'list') {
    return NextResponse.json({ error: 'Goal is not a list type' }, { status: 400 });
  }

  // Create new list item
  const newItem = {
    id: crypto.randomUUID(),
    value: value.trim(),
    timestamp: new Date().toISOString(),
    notes: notes?.trim() || undefined
  };

  // Get existing list items and add the new one
  const existingItems = goal.list_items || [];
  const updatedItems = [...existingItems, newItem];

  const { data: updatedGoal, error: updateError } = await supabase
    .from('goals')
    .update({
      list_items: updatedItems,
      current_value: updatedItems.length
    })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to add list item' }, { status: 500 });
  }

  return NextResponse.json({ success: true, goal: updatedGoal });
}

async function removeListItem(goalId: string, userId: string, data: any) {
  const { itemId } = data;

  if (!goalId || !itemId) {
    return NextResponse.json({ error: 'Missing goalId or itemId' }, { status: 400 });
  }

  // Get current goal
  const { data: goal, error: fetchError } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !goal) {
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
  }

  if (goal.goal_type !== 'list') {
    return NextResponse.json({ error: 'Goal is not a list type' }, { status: 400 });
  }

  // Remove the item from the list
  const existingItems = goal.list_items || [];
  const updatedItems = existingItems.filter((item: any) => item.id !== itemId);

  const { data: updatedGoal, error: updateError } = await supabase
    .from('goals')
    .update({
      list_items: updatedItems,
      current_value: updatedItems.length
    })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: 'Failed to remove list item' }, { status: 500 });
  }

  return NextResponse.json({ success: true, goal: updatedGoal });
}

export const dynamic = 'force-dynamic';