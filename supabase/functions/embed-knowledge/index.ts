import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start += chunkSize - overlap;
  }
  return chunks;
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embedding error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_KEY = Deno.env.get("OPEN_AI_KEY");
    if (!OPENAI_KEY) throw new Error("OPEN_AI_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { file_name, content, subject, class_level, curriculum } = await req.json();

    if (!content || !file_name) {
      return new Response(JSON.stringify({ error: "file_name and content are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing "${file_name}": ${content.length} chars`);

    // Split into chunks
    const chunks = chunkText(content);
    console.log(`Created ${chunks.length} chunks`);

    let processed = 0;
    const results = [];

    for (const chunk of chunks) {
      // Generate embedding
      const embedding = await generateEmbedding(chunk, OPENAI_KEY);

      // Store embedding
      const { data: embData, error: embError } = await supabase
        .from("ai_embeddings")
        .insert({
          content: chunk,
          embedding: JSON.stringify(embedding),
          metadata: { file_name, subject, class_level, curriculum },
        })
        .select("id")
        .single();

      if (embError) {
        console.error("Embedding insert error:", embError);
        continue;
      }

      // Store knowledge chunk
      const { error: chunkError } = await supabase
        .from("knowledge_chunks")
        .insert({
          file_name,
          chunk_text: chunk,
          subject: subject || null,
          class_level: class_level || null,
          curriculum: curriculum || null,
          embedding_id: embData.id,
        });

      if (chunkError) console.error("Chunk insert error:", chunkError);

      processed++;

      // Small delay to avoid rate limits
      if (processed % 10 === 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    results.push({ file_name, total_chunks: chunks.length, processed });

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("embed-knowledge error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
