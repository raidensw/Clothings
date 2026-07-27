const Groq = require('groq-sdk');
const fs = require('fs');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Helper to convert local image to base64 for Groq Vision
 */
function imageToBase64(imagePath) {
  const ext = imagePath.split('.').pop().toLowerCase();
  const mimeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  const mimeType = mimeMap[ext] || 'image/jpeg';
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  return `data:${mimeType};base64,${base64Image}`;
}

/**
 * Analyzes a clothing item and returns structured JSON
 */
async function analyzeClothingImage(imagePath) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set. Please add it to your .env file.');
  }

  const base64 = imageToBase64(imagePath);
  
  const prompt = `
You are an expert fashion cataloging AI. Analyze this image of a clothing item.
Return a strict JSON object with EXACTLY these keys:
- "category" (e.g., hoodie, tee, jeans, jacket, sneakers, shorts)
- "color" (the dominant color)
- "style" (e.g., streetwear, athletic, casual, formal, vintage, bohemian, minimalist. Describe in detail, including specific elements like "oversized fit", "distressed look", "embroidered details", "wired headphones" if present and relevant as a style element with the item)
- "pattern" (e.g., solid, striped, graphic, plaid)
- "season_fit" (e.g., hot, cold, all-season)
- "warmth_level" (integer from 1 to 5, where 1 is lightest and 5 is heaviest)
- "features" (list any notable additional features or accessories visible with the clothing item, e.g., ["wired headphones", "detachable hood", "cargo pockets"])

Return ONLY valid JSON and nothing else. No markdown formatting.)
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: '/no_think'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: base64 } }
        ]
      }
    ],
    model: 'qwen/qwen3.6-27b',
    temperature: 0.1,
  });

  // Qwen emits <think>...</think> reasoning blocks - strip before parsing JSON
  const raw = chatCompletion.choices[0].message.content.trim();
  const content = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  try {
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Failed to parse clothing AI response:", content);
    throw new Error("Invalid response from AI: " + content.slice(0, 200));
  }
}

/**
 * Analyzes a scent/cologne bottle
 */
async function analyzeScentImage(imagePath) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set. Please add it to your .env file.');
  }

  const base64 = imageToBase64(imagePath);
  
  const prompt = `
You are an expert fragrance cataloging AI. Analyze this image of a cologne, lotion, or body spray.
Read the label if possible to infer the brand and name.
Return a strict JSON object with EXACTLY these keys:
96→- "name" (the name of the product/brand, or "unnamed" if unreadable)
 97→- "type" (MUST be one of: cologne, lotion, body spray. Do NOT use "accessory" or any other category.)
- "scent_profile" (e.g., fresh, woody, sweet, spicy, citrus, musky. Guess based on the brand/bottle color if unsure)
- "season_fit" (e.g., hot, cold, all-season)
- "occasions" (e.g., everyday, going out, date)
- "features" (list any notable additional features visible on the bottle or packaging, e.g., ["spray cap", "roll-on applicator", "frosted glass"])

Return ONLY valid JSON and nothing else. No markdown formatting.)
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: '/no_think'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: base64 } }
        ]
      }
    ],
    model: 'qwen/qwen3.6-27b',
    temperature: 0.1,
  });

  const raw = chatCompletion.choices[0].message.content.trim();
  const content = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  try {
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Failed to parse scent AI response:", content);
    throw new Error("Invalid response from AI: " + content.slice(0, 200));
  }
}

/**
 * Suggest an outfit using Llama 3 70b
 */
async function suggestOutfit(clothing, scents, weather, occasion, recentlyWorn = []) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const clothingSummary = clothing.map(c => ({ id: c.id, category: c.category, color: c.color, style: c.style, pattern: c.pattern }));
  const scentsSummary = scents.map(s => ({ id: s.id, name: s.name, type: s.type, scent_profile: s.scent_profile }));

  const prompt = `
You are an expert fashion stylist.
Here is my current clothing catalog: ${JSON.stringify(clothingSummary)}
Here is my current scent catalog: ${JSON.stringify(scentsSummary)}
Current Weather: ${JSON.stringify(weather)}
Occasion: ${occasion}
Recently Worn Items (Avoid if possible to ensure variety): ${JSON.stringify(recentlyWorn)}

Recommend a coordinated outfit and matching scent using only items from the catalogs above.
If you must recommend a recently worn item because no other clean options fit, do so but include a styling warning in the advice.
Return a strict JSON object with these EXACT keys:
- "styling_advice": A paragraph of elegant styling advice explaining why you chose these items for this weather and occasion.
- "recommended_clothing_ids": An array of integer IDs of the clothes you chose (choose 1-3 items that make a complete outfit, e.g. a top, a bottom, shoes).
- "recommended_scent_ids": An array containing the integer ID of the scent you chose (choose exactly 1 scent).

Return ONLY valid JSON and nothing else. No markdown formatting.
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: '/no_think'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
  });

  const content = chatCompletion.choices[0].message.content.trim();
  try {
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Failed to parse suggestOutfit AI response:", content);
    // Fallback if parsing fails
    return {
      styling_advice: content,
      recommended_clothing_ids: [],
      recommended_scent_ids: []
    };
  }
}

/**
 * Suggest shopping gaps using Llama 3 70b
 */
async function suggestShopping(clothing, scents) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const prompt = `
You are an expert personal stylist.
Here is my current clothing catalog: ${JSON.stringify(clothing)}
Here is my current scent catalog: ${JSON.stringify(scents)}

Analyze my wardrobe. Identify 3-5 specific gaps or missing staples (e.g., missing warm outerwear, missing neutral shoes, missing fresh everyday scent).
Suggest what I should buy next to fill these gaps, why they fill a gap, and a general price range.
Keep it concise and actionable.
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
  });

  return chatCompletion.choices[0].message.content.trim();
}

/**
 * Curates a packing list for a trip based on forecast and duration
 */
async function suggestPacking(clothing, scents, weatherForecast, tripDuration) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const clothingSummary = clothing.map(c => ({ id: c.id, category: c.category, color: c.color, style: c.style, pattern: c.pattern, season_fit: c.season_fit }));
  const scentsSummary = scents.map(s => ({ id: s.id, name: s.name, type: s.type, scent_profile: s.scent_profile }));

  const prompt = `
You are an expert fashion stylist.
A user is packing for a trip lasting ${tripDuration} days.
Here is the weather forecast for the trip: ${JSON.stringify(weatherForecast)}
Here is the available clothing catalog: ${JSON.stringify(clothingSummary)}
Here is the available scent catalog: ${JSON.stringify(scentsSummary)}

Select a balanced, coordinated packing list of clothes and fragrances for this trip. Recommend enough clean items for the duration, avoiding repeats.
Return a strict JSON object with these EXACT keys:
- "packing_rationale": A short explanation of your packing strategy based on the forecast.
- "recommended_clothing_ids": An array of integer IDs of the clothes they should pack.
- "recommended_scent_ids": An array of integer IDs of the scents they should pack.

Return ONLY valid JSON and nothing else. No markdown formatting.
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: '/no_think' },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
  });

  const content = chatCompletion.choices[0].message.content.trim();
  try {
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Failed to parse suggestPacking AI response:", content);
    return {
      packing_rationale: content,
      recommended_clothing_ids: [],
      recommended_scent_ids: []
    };
  }
}

/**
 * Curates multi-day outfit recommendations
 */
async function suggestMultiDayOutfit(clothing, scents, weatherForecast, occasion, daysCount) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not set');

  const clothingSummary = clothing.map(c => ({ id: c.id, category: c.category, color: c.color, style: c.style, pattern: c.pattern }));
  const scentsSummary = scents.map(s => ({ id: s.id, name: s.name, type: s.type, scent_profile: s.scent_profile }));

  const prompt = `
You are an expert fashion stylist.
Recommend outfits and fragrances for a multi-day period of ${daysCount} days.
Occasion / Activity: ${occasion}
Weather forecast: ${JSON.stringify(weatherForecast)}
Here is the available clothing catalog: ${JSON.stringify(clothingSummary)}
Here is the available scent catalog: ${JSON.stringify(scentsSummary)}

Curate coordinates for each day. Try to avoid repeating items closely across days.
Return a strict JSON object with these EXACT keys:
- "styling_advice": A short summary of the overall style theme for these days.
- "days": An array of objects (one for each day, up to ${daysCount}), where each object has:
  - "dayNumber": The day integer (1, 2, etc.)
  - "advice": Styling advice specific to this day's weather/agenda.
  - "recommended_clothing_ids": An array of clothing item IDs.
  - "recommended_scent_ids": An array containing exactly 1 scent ID.

Return ONLY valid JSON and nothing else. No markdown formatting.
`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: '/no_think' },
      { role: 'user', content: prompt }
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
  });

  const content = chatCompletion.choices[0].message.content.trim();
  try {
    const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error("Failed to parse suggestMultiDayOutfit AI response:", content);
    return {
      styling_advice: content,
      days: []
    };
  }
}

module.exports = {
  analyzeClothingImage,
  analyzeScentImage,
  suggestOutfit,
  suggestShopping,
  suggestPacking,
  suggestMultiDayOutfit
};
