const { GoogleGenerativeAI } = require("@google/generative-ai");
const Tool = require("../models/Tools");
const Query = require("../models/Query");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ---------- ZERO-SHOT CONTROLLER ----------
const compareZeroShot = async (req, res) => {
  try {
    const { products, userId } = req.body;

    if (!products || products.length < 2) {
      return res.status(400).json({ error: "Provide at least two products" });
    }

    const cached = await Query.findOne({ query: products.join(" vs ") });
    if (cached) return res.json(cached.response);

    const toolsData = await Tool.find({ name: { $in: products } });

    const prompt = `
Compare these products in a simple and basic way.
Just give a short description of each feature without going into details or differences.
Products: ${products.join(", ")}
Data: ${JSON.stringify(toolsData)}
Return JSON in this format:
{
  "products": [...],
  "comparison": [{"feature":"", "details": {"Product1":"", "Product2":""}}],
  "recommendation": "short text"
}
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    let rawText = result.response.text();

    let cleanedText = rawText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```$/, '');
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (err) {
      console.error("Failed to parse AI response:", cleanedText);
      return res.status(500).json({ error: "Invalid JSON from AI" });
    }

    await Query.create({
      userId: userId || null,
      query: products.join(" vs "),
      response: parsed
    });

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};


// ---------- ONE-SHOT CONTROLLER (richer version) ----------
const compareOneShot = async (req, res) => {
  try {
    const { products, userId } = req.body;

    if (!products || products.length < 2) {
      return res.status(400).json({ error: "Provide at least two products" });
    }

    const cached = await Query.findOne({ query: products.join(" vs ") });
    if (cached) return res.json(cached.response);

    const toolsData = await Tool.find({ name: { $in: products } });

    const exampleInput = ["Canva Free", "Canva Pro"];
    const exampleOutput = {
      products: ["Canva Free", "Canva Pro"],
      comparison: [
        { feature: "Storage", details: { "Canva Free": "5GB", "Canva Pro": "1TB" }, diff: "Pro has 200x more storage, good for teams with large media files" },
        { feature: "Team", details: { "Canva Free": "No", "Canva Pro": "Yes" }, diff: "Pro supports collaborative editing and team management" },
        { feature: "Templates", details: { "Canva Free": "Limited", "Canva Pro": "Extensive" }, diff: "Pro offers hundreds more templates for professional designs" }
      ],
      recommendation: "Canva Pro is better for professional use, team collaboration, and large-scale projects."
    };

    const prompt = `
Here is an example comparison:
Input: ${JSON.stringify(exampleInput)}
Output: ${JSON.stringify(exampleOutput)}

Now compare these products: ${JSON.stringify(products)}
Use this data: ${JSON.stringify(toolsData)}
Highlight key differences with a "diff" field for each feature.
Provide rich, detailed explanations for each product.
Return JSON in the same format as the example.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    let rawText = result.response.text();

    let cleanedText = rawText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```$/, '');
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (err) {
      console.error("Failed to parse AI response:", cleanedText);
      return res.status(500).json({ error: "Invalid JSON from AI" });
    }

    await Query.create({
      userId: userId || null,
      query: products.join(" vs "),
      response: parsed
    });

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// ---------- MULTI-SHOT CONTROLLER ----------
const compareMultiShot = async (req, res) => {
  try {
    const { products, userId } = req.body;

    if (!products || products.length < 2) {
      return res.status(400).json({ error: "Provide at least two products" });
    }

    const cached = await Query.findOne({ query: products.join(" vs ") });
    if (cached) return res.json(cached.response);

    const toolsData = await Tool.find({ name: { $in: products } });

    const examples = [
      {
        input: ["Canva Free", "Canva Pro"],
        output: {
          products: ["Canva Free", "Canva Pro"],
          comparison: [
            { feature: "Storage", details: { "Canva Free": "5GB", "Canva Pro": "1TB" }, diff: "Pro has 200x more storage" },
            { feature: "Team", details: { "Canva Free": "No", "Canva Pro": "Yes" }, diff: "Pro supports collaboration" }
          ],
          recommendation: "Canva Pro is better for teams and professional use."
        }
      },
      {
        input: ["Notion Free", "Notion Plus"],
        output: {
          products: ["Notion Free", "Notion Plus"],
          comparison: [
            { feature: "Blocks", details: { "Notion Free": "Unlimited", "Notion Plus": "Unlimited" }, diff: "Plus includes advanced analytics" },
            { feature: "Team Collaboration", details: { "Notion Free": "Limited", "Notion Plus": "Advanced" }, diff: "Plus allows larger teams and permissions control" }
          ],
          recommendation: "Notion Plus is better for large teams needing advanced collaboration."
        }
      }
    ];

    const prompt = `
Here are some example comparisons:
${examples.map(e => `Input: ${JSON.stringify(e.input)}\nOutput: ${JSON.stringify(e.output)}`).join('\n\n')}

Now compare these products: ${JSON.stringify(products)}
Use this data: ${JSON.stringify(toolsData)}
Highlight key differences with a "diff" field for each feature.
Provide detailed explanations for each product.
Return JSON in the same format as the examples.
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    let rawText = result.response.text();

    let cleanedText = rawText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```$/, '');
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (err) {
      console.error("Failed to parse AI response:", cleanedText);
      return res.status(500).json({ error: "Invalid JSON from AI" });
    }

    await Query.create({
      userId: userId || null,
      query: products.join(" vs "),
      response: parsed
    });

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};


module.exports = { compareZeroShot, compareOneShot, compareMultiShot };
