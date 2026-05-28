require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const pdfParse = require("pdf-parse/lib/pdf-parse.js");
const Groq = require("groq-sdk");

const app = express();
app.use(cors({ 
  origin: [
    "http://localhost:5173",
    "https://resume-analyzer-frontend-g0be7brsy-rahul-kumar-s-projects3.vercel.app",
    "https://resume-analyzer-frontend-azure.vercel.app"
  ]
}));
app.use(express.json());

const upload = multer({ dest: "uploads/" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.get("/", (req, res) => {
  res.send("Backend Running");
});

app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(fileBuffer);
    let resumeText = pdfData.text.substring(0, 3000);
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: `Look at this document. If it is NOT a resume or CV, respond with exactly this JSON: {"error": "not_a_resume"}. If it IS a resume, analyze it and respond with exactly this JSON format only: {"atsScore": "85/100", "technicalSkills": ["skill1"], "missingSkills": ["skill1"], "improvements": ["improvement1"], "jobRoles": ["Job Role 1"]}. Document: ${resumeText}` }],
    });
    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    fs.unlinkSync(req.file.path);
    if (parsed.error === "not_a_resume") return res.status(400).json({ error: "This does not look like a resume." });
    res.json({ analysis: parsed });
  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/match", upload.single("resume"), async (req, res) => {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription) return res.status(400).json({ error: "Job description is required" });
    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(fileBuffer);
    let resumeText = pdfData.text.substring(0, 3000);
    fs.unlinkSync(req.file.path);
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: `Compare this resume with the job description and respond in this exact JSON format only: {"matchScore": "78/100", "matchedSkills": ["skill1"], "missingSkills": ["skill1"], "suggestions": ["suggestion1"], "verdict": "Good Match"}. Resume: ${resumeText}. Job Description: ${jobDescription}` }],
    });
    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ match: parsed });
  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/coverletter", upload.single("resume"), async (req, res) => {
  try {
    const { jobDescription, companyName, jobTitle } = req.body;
    if (!jobDescription) return res.status(400).json({ error: "Job description is required" });
    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(fileBuffer);
    let resumeText = pdfData.text.substring(0, 3000);
    fs.unlinkSync(req.file.path);
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: `Write a professional cover letter for this person applying to ${jobTitle || "the position"} at ${companyName || "the company"}. Use their resume details and the job description to write a compelling, personalized cover letter. Return only the cover letter text, no extra commentary. Resume: ${resumeText}. Job Description: ${jobDescription}` }],
    });
    const coverLetter = completion.choices[0].message.content;
    res.json({ coverLetter });
  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/interview", upload.single("resume"), async (req, res) => {
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(fileBuffer);
    let resumeText = pdfData.text.substring(0, 3000);
    fs.unlinkSync(req.file.path);
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: `Generate interview questions based on this resume. Respond in this exact JSON format only: {"technical": ["question1", "question2", "question3", "question4", "question5"], "behavioral": ["question1", "question2", "question3", "question4", "question5"], "roleSpecific": ["question1", "question2", "question3", "question4", "question5"]}. Resume: ${resumeText}` }],
    });
    const raw = completion.choices[0].message.content;
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ questions: parsed });
  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages) return res.status(400).json({ error: "Messages are required" });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are an expert resume coach and career advisor. Help users improve their resumes, answer career questions, and provide actionable advice. Be concise, friendly and helpful." },
        ...messages
      ],
    });
    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(8000, () => {
  console.log("Server running on port 8000");
});

const https = require("https");
setInterval(() => {
  https.get("https://resume-analyzer-backend-1n2h.onrender.com", (res) => {
    console.log("Keep alive ping:", res.statusCode);
  }).on("error", (e) => {
    console.log("Ping error:", e.message);
  });
}, 14 * 60 * 1000);
