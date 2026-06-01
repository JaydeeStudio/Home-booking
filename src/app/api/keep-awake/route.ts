import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

// L'instruction magique pour empêcher Vercel de mettre cette page en cache
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fait une micro-lecture ultra-légère dans Supabase
    const { data, error } = await supabase.from('spaces').select('id').limit(1);
    
    if (error) throw error;
    
    return NextResponse.json({ 
      status: 'Supabase est bien réveillé !', 
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    return NextResponse.json({ error: "Échec du réveil" }, { status: 500 });
  }
}