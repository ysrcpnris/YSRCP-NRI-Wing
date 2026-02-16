import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Supabase client (server-side, service role)
 */
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") as string,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
);

/**
 * Environment variables
 */
const YOUTUBE_API_KEY = Deno.env.get("VITE_YOUTUBE_API_KEY");
const CHANNEL_ID = Deno.env.get("CHANNEL_ID");

/**
 * Safety checks
 */
if (!YOUTUBE_API_KEY) {
  console.error("❌ VITE_YOUTUBE_API_KEY missing");
}

if (!CHANNEL_ID) {
  console.error("❌ CHANNEL_ID missing");
}

/**
 * Fetch latest videos from YouTube
 */
async function fetchLatestVideos() {
  const url =
    `https://www.googleapis.com/youtube/v3/search?` +
    `part=snippet` +
    `&channelId=${CHANNEL_ID}` +
    `&maxResults=5` +
    `&order=date` +
    `&type=video` +
    `&key=${YOUTUBE_API_KEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`YouTube API failed: ${text}`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Save / update videos in DB
 */
async function upsertVideos(items: any[]) {
  for (const item of items) {
    if (!item.id?.videoId) continue;

    const video = {
      video_id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail_url: item.snippet.thumbnails?.high?.url ?? null,
      published_at: item.snippet.publishedAt,
      video_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      channel_id: CHANNEL_ID,
    };

    const { error } = await supabase
      .from("youtube_videos")
      .upsert(video, { onConflict: "video_id" });

    if (error) {
      console.error("❌ DB upsert error:", error);
    }
  }
}

/**
 * Edge function entry
 */
serve(async () => {
  try {
    const videos = await fetchLatestVideos();
    await upsertVideos(videos);

    return new Response(
      JSON.stringify({
        success: true,
        count: videos.length,
        message: "YouTube videos synced successfully",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Sync failed:", err);

    return new Response(
      JSON.stringify({
        success: false,
        error: String(err),
      }),
      { status: 500 }
    );
  }
});
