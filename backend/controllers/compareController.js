const { GoogleGenerativeAI } = require("@google/generative-ai");
const Tool = require("../models/Tools");
const Query = require("../models/Query");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const compareProducts = async (req, res) => {
  try {
    const { products, userId } = req.body;

    if (!products || products.length < 2) {
      return res.status(400).json({ error: "Provide at least two products" });
    }

    const cached = await Query.findOne({ query: products.join(" vs ") });
    if (cached) return res.json(cached.response);

    const toolsData = await Tool.find({ name: { $in: products } });

    const zeroShotPrompt = `
Compare these products feature by feature: ${products.join(", ")}.
Use this data: ${JSON.stringify(toolsData)}.
Return JSON only in this format:
{
  "products": [...],
  "comparison": [{"feature":"", "details": {"Product1":"", "Product2":""}}],
  "recommendation": "short text"
}
`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(zeroShotPrompt);
    const rawText = result.response.text();

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

module.exports = { compareProducts };
