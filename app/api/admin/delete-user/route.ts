import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete user from auth.users (this will cascade to related tables)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({
      error: 'Failed to delete user',
      details: error.message
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';