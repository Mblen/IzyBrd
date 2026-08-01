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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Must match the STYLES chips in the app's Sell form
const STYLES = ["Crew", "Hoodie", "Zip Up", "Mock Neck", "Crop"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_url, image_base64, media_type, mode } = await req.json();
    // "multi" finds every sweatshirt in one photo (closet scan); the default
    // identifies a single garment.
    const isMulti = mode === "multi";
    const hasUrl = typeof image_url === "string" && image_url.length > 0;
    const hasBase64 = typeof image_base64 === "string" && image_base64.length > 0;
    if (!hasUrl && !hasBase64) {
      return new Response(
        JSON.stringify({ error: "image_url or image_base64 is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Public photo URLs arrive as-is; live camera frames arrive as base64
    const imageSource = hasUrl
      ? { type: "url" as const, url: image_url }
      : {
          type: "base64" as const,
          media_type: (media_type ?? "image/jpeg") as "image/jpeg",
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "scan failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
