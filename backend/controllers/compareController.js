import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import Tool from "../models/Tool.js";
import Query from "../models/Query.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ComparisonSchema = z.object({
  products: z.array(z.string()),
  comparison: z.array(
    z.object({
      feature: z.string(),
      details: z.record(z.string())
    })
  ),
  recommendation: z.string()
});

export const compareProducts = async (req, res) => {
  try {
    const { products, userId } = req.body;

    if (!products || products.length < 2)
      return res.status(400).json({ error: "Provide at least two products" });

    const cached = await Query.findOne({ query: products.join(" vs ") });
    if (cached) return res.json(cached.response);

    const toolsData = await Tool.find({ name: { $in: products } });

    const prompt = `
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
    const result = await model.generateContent(prompt);
    const rawText = result.response.text();

    const parsed = JSON.parse(rawText);
    const validated = ComparisonSchema.parse(parsed);

    await Query.create({
      userId: userId || null,
      query: products.join(" vs "),
      response: validated,
      toolNames: products
    });

    res.json(validated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
