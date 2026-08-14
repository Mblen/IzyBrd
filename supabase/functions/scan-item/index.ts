// Supabase Edge Function: scan-item
//
// Looks at a wardrobe photo with Claude vision and returns structured details
// for the garment: a suggested listing title, style, color, and brand guess.
// The Anthropic API key stays server-side (set it as a function secret).
//
// Deploy (dashboard): Edge Functions -> Deploy a new function -> name it
// "scan-item" -> paste this file. Then add a secret named ANTHROPIC_API_KEY
// under Edge Functions -> Secrets.
//
// Request:  POST { "image_url": "https://..." }
//       or  POST { "image_base64": "<jpeg base64>", "media_type": "image/jpeg" }
//           (the live camera scanner sends frames directly as base64)
// Response: { "title": "...", "style": "Hoodie", "color": "...", "brand_guess": "..." }

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Must match the STYLES chips in the app's Sell form
const STYLES = ["Crew", "Hoodie", "Zip Up", "Mock Neck", "Crop"];

// Each scan costs real money, so cap how often one caller can scan.
//
// This has to be counted in the database, not in memory. An in-memory Map is
// per function instance, and Supabase spreads requests across instances, so a
// local counter never accumulates - measured at 45 straight requests without
// one being refused. The Anthropic spend cap is still the hard ceiling; this
// stops a single caller getting there.
const MAX_SCANS_PER_HOUR = 40;

// Service role: the function needs to read and write scan_events regardless of
// who is calling. It never leaves this file and is not exposed to the client.
const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

async function overLimit(key: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await admin
      .from("scan_events")
      .select("*", { count: "exact", head: true })
      .eq("caller", key)
      .gte("created_at", since);
    if (error) return false; // table missing or unreachable: never block a scan
    if ((count ?? 0) >= MAX_SCANS_PER_HOUR) return true;
    await admin.from("scan_events").insert({ caller: key });
    return false;
  } catch {
    return false;
  }
}

// Who to count this scan against. A signed-in user is counted by their id.
// Anyone else is counted by IP - without this fallback the limit was skipped
// entirely for callers with no user token, and the anon key that reaches this
// function ships publicly in the app bundle, so the scanner was an unmetered
// endpoint that spends real money.
function callerKey(req: Request): string {
  const user = callerId(req);
  if (user) return `user:${user}`;
  const forwarded = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return `ip:${forwarded || "unknown"}`;
}

// The caller's id from the JWT Supabase already verified for us.
function callerId(req: Request): string | null {
  try {
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

// Roughly 8MB of image data; anything larger is not a phone photo
const MAX_BASE64_CHARS = 11_000_000;
const ALLOWED_MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (await overLimit(callerKey(req))) {
      return json(
        { error: "Too many scans right now. Please try again in a little while." },
        429,
      );
    }

    const { image_url, image_base64, media_type, mode } = await req.json();
    // "multi" finds every sweatshirt in one photo (closet scan); the default
    // identifies a single garment.
    const isMulti = mode === "multi";
    const hasUrl = typeof image_url === "string" && image_url.length > 0;
    const hasBase64 = typeof image_base64 === "string" && image_base64.length > 0;
    if (!hasUrl && !hasBase64) {
      return json({ error: "image_url or image_base64 is required" }, 400);
    }
    if (hasBase64 && image_base64.length > MAX_BASE64_CHARS) {
      return json({ error: "That image is too large to scan." }, 413);
    }
    if (hasUrl && !/^https:\/\//i.test(image_url)) {
      return json({ error: "image_url must be an https URL" }, 400);
    }
    const mediaType = ALLOWED_MEDIA.includes(media_type) ? media_type : "image/jpeg";

    // Public photo URLs arrive as-is; live camera frames arrive as base64
    const imageSource = hasUrl
      ? { type: "url" as const, url: image_url }
      : {
          type: "base64" as const,
          media_type: mediaType as "image/jpeg",
          data: image_base64,
        };

    const client = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    // One garment's fields, shared by both modes
    const garmentProps = {
      title: {
        type: "string",
        description:
          "A short, catchy marketplace listing title for this garment, 2-4 words, e.g. 'Vintage Navy Crew'",
      },
      style: {
        type: "string",
        enum: STYLES,
        description: "The garment style category",
      },
      color: {
        type: "string",
        description: "The main color, one or two words",
      },
      brand_guess: {
        type: "string",
        description:
          "The brand if identifiable from logos or tags, otherwise an empty string. Never guess.",
      },
    };

    // Where the garment sits in the photo, so the app can crop it out.
    const boxProps = {
      x: { type: "number", description: "Left edge, 0-1 fraction of image width" },
      y: { type: "number", description: "Top edge, 0-1 fraction of image height" },
      width: { type: "number", description: "Width as a 0-1 fraction of image width" },
      height: { type: "number", description: "Height as a 0-1 fraction of image height" },
    };

    const singleSchema = {
      type: "object",
      properties: garmentProps,
      required: ["title", "style", "color", "brand_guess"],
      additionalProperties: false,
    };

    const multiSchema = {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "One entry per distinct sweatshirt visible in the photo",
          items: {
            type: "object",
            properties: {
              ...garmentProps,
              box: {
                type: "object",
                description:
                  "Tight bounding box around this garment only, as fractions of the image size, origin at the top-left corner",
                properties: boxProps,
                required: ["x", "y", "width", "height"],
                additionalProperties: false,
              },
            },
            required: ["title", "style", "color", "brand_guess", "box"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    };

    const singlePrompt =
      "This is a photo of a sweatshirt someone is adding to their virtual wardrobe " +
      "in a second-hand marketplace app. Identify the garment's details.";

    const multiPrompt =
      "This photo shows someone's closet or a pile of clothes. Find every distinct " +
      "sweatshirt, hoodie, crewneck, zip-up, mock neck or cropped sweatshirt that is " +
      "clearly visible, and return one entry per garment with a tight bounding box " +
      "around that garment only. Ignore other clothing types (trousers, shoes, bags, " +
      "dresses), duplicates of the same physical garment, and any item too small or " +
      "obscured to identify confidently. Return an empty list if there are none.";

    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: {
        format: {
          type: "json_schema",
          schema: isMulti ? multiSchema : singleSchema,
        },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: imageSource },
            { type: "text", text: isMulti ? multiPrompt : singlePrompt },
          ],
        },
      ],
    });

    // With structured outputs the JSON arrives in the text block
    const textBlock = response.content.find((b) => b.type === "text");
    const result = textBlock ? JSON.parse(textBlock.text) : null;
    if (!result) throw new Error("No result from model");

    return json(result);
  } catch (e) {
    // Log the detail server-side; don't hand internals back to the caller
    console.error("scan-item failed:", e);
    return json({ error: "Could not scan that image." }, 500);
  }
});
