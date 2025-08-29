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

    // const cached = await Query.findOne({ query: products.join(" vs ") });
    // if (cached) return res.json(cached.response);

    const toolsData = await Tool.find({ name: { $in: products } });

    const prompt = `
Compare these products in a simple and basic way.
Just give a short description of each feature without going into details or differences.
Products: ${products.join(", ")}
Data: ${JSON.stringify(toolsData)}
Return JSON in this format:
{
  "products": [...],
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

    // const cached = await Query.findOne({ query: products.join(" vs ") });
    // if (cached) return res.json(cached.response);

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

// ---------- SYSTEM + USER PROMPT CONTROLLER ----------
const compareSystemUser = async (req, res) => {
  try {
    const { products, userId } = req.body;

    if (!products || products.length < 2) {
      return res.status(400).json({ error: "Provide at least two products" });
    }

    const cached = await Query.findOne({ query: products.join(" vs ") });
    if (cached) return res.json(cached.response);

    const toolsData = await Tool.find({ name: { $in: products } });

    const messages = [
      {
        role: "system",
        content: "You are a professional digital product comparison assistant. Always return a JSON object containing 'products', 'comparison' with detailed pros, cons, and key differences, and a 'recommendation'. Be informative and highlight differences clearly."
      },
      {
        role: "user",
        content: `Compare these products: ${JSON.stringify(products)}. 
Use this data: ${JSON.stringify(toolsData)}. Return JSON in the format: { "products": [...], "comparison": [{"feature":"", "details": {"Product1":"", "Product2":"", "diff":""}}], "recommendation": "short text" }`
      }
    ];

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-chat" });
    const result = await model.chat(messages);

    let rawText = result.response[0].content;

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

// ---------- CHAIN-OF-THOUGHT CONTROLLER ----------
const compareChainOfThought = async (req, res) => {
  try {
    const { products, userId } = req.body;

    if (!products || products.length < 2) {
      return res.status(400).json({ error: "Provide at least two products" });
    }

    const cached = await Query.findOne({ query: products.join(" vs ") });
    if (cached) return res.json(cached.response);

    const toolsData = await Tool.find({ name: { $in: products } });

    const messages = [
      {
        role: "system",
        content: "You are an expert digital product comparison assistant. Explain your reasoning step by step before providing the final comparison JSON. Include pros, cons, and key differences for each feature."
      },
      {
        role: "user",
        content: `Compare these products: ${JSON.stringify(products)}. 
Use this data: ${JSON.stringify(toolsData)}.
Explain your thought process first (step-by-step reasoning), then provide the final comparison in JSON format:
{
  "products": [...],
  "comparison": [{"feature":"", "details": {"Product1":"", "Product2":"", "diff":""}}],
  "recommendation": "short text"
}`
      }
    ];

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-chat" });
    const result = await model.chat(messages);

    let rawText = result.response[0].content;

    let cleanedText = rawText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/```$/, '');
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/```$/, '');
    }

    let parsed;
    try {
      // Try to extract JSON part if AI included reasoning
      const jsonStart = cleanedText.indexOf("{");
      const jsonEnd = cleanedText.lastIndexOf("}") + 1;
      const jsonString = cleanedText.slice(jsonStart, jsonEnd);
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error("Failed to parse AI JSON from chain-of-thought:", cleanedText);
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

// ---------- STRUCTURED OUTPUT CONTROLLER ----------
const compareStructuredOutput = async (req, res) => {
  try {
    const { products, userId } = req.body;

    if (!products || products.length < 2) {
      return res.status(400).json({ error: "Provide at least two products" });
    }

    const cached = await Query.findOne({ query: products.join(" vs ") });
    if (cached) return res.json(cached.response);

    const toolsData = await Tool.find({ name: { $in: products } });

    const messages = [
      {
        role: "system",
        content: "You are an expert digital product comparison assistant. Always respond in strict JSON format. Include 'products' (array), 'comparison' (array of features with 'feature', 'details', and 'diff'), and 'recommendation' (string). Do not include extra text."
      },
      {
        role: "user",
        content: `Compare these products: ${JSON.stringify(products)}. 
Use this data: ${JSON.stringify(toolsData)}.
Return JSON in this exact structure:
{
  "products": ["Product1", "Product2"],
  "comparison": [
    {
      "feature": "Feature name",
      "details": {"Product1": "value", "Product2": "value"},
      "diff": "difference explanation"
    }
  ],
  "recommendation": "short text recommendation"
}`
      }
    ];

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-chat" });
    const result = await model.chat(messages);

    let rawText = result.response[0].content;
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
      console.error("Failed to parse AI structured output:", cleanedText);
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

// ---------- TEMPERATURE CONTROLLER ----------
const compareWithTemperature = async (req, res) => {
  try {
    const { products, userId, temperature } = req.body;

    if (!products || products.length < 2) {
      return res.status(400).json({ error: "Provide at least two products" });
    }

    const toolsData = await Tool.find({ name: { $in: products } });

    const prompt = `
Compare these products creatively based on their features.
Products: ${JSON.stringify(products)}
Data: ${JSON.stringify(toolsData)}
Return a JSON in this format:
{
  "products": [...],
  "comparison": [
    {
      "feature": "",
      "details": {"Product1":"", "Product2":""},
      "diff": ""
    }
  ],
  "recommendation": "short text"
}
Be as creative or conservative as the temperature allows.
`;

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      temperature: temperature || 0.7 // default
    });

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

module.exports = { compareZeroShot, compareOneShot, compareMultiShot, compareSystemUser, compareChainOfThought, compareStructuredOutput, compareWithTemperature };