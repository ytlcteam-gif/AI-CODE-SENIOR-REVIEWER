This README is designed to be the "Front Door" of your project. It explains the Why, the How, and the Tech in a way that makes a beginner feel like they are looking at a professional, production-ready system.

🧠 AI Senior Code Reviewer (Engineering Mentor v6.3)
"Don't just fix the code. Design the system."


REVIEW OUTPUT

![claudeproj2output2](https://github.com/user-attachments/assets/857a134d-1b46-4cd0-86aa-c23d31e1c544)













------------(ITS NOT JUST SIMPLE CODE DEBUGGER IT WILL BE YOUR MENTOR AND BUDDY AT THE SAME TIME )-----------------------------

This is a Full-Stack, Stateless AI Code Auditor designed to replace generic "chatbot" advice with brutal, architectural engineering feedback. It uses Gemini 1.5 Flash to act as a Senior Engineering Manager, providing structured audits, animated scorecards, and professional PDF reports.

🌟 What makes this different?
Most AI tools are "too nice." This tool is built with a Senior Developer Mindset:

Brutal Honesty: If your code has a security flaw, you get a 0/100 score.

Dual Modes: Switch between Beginner (Teaching-focused) and Senior (Direct & Strict).

Architectural Awareness: The AI doesn't just fix a line; it tells you if the logic belongs in a different layer of your app.

Stateless & Secure: No database. Your code is reviewed, a report is generated, and data is wiped.

🛠️ The Tech Stack
Frontend (The UI)
React (Vite): Blazing fast frontend framework.

Tailwind CSS: Professional "Glassmorphism" dark-mode styling.

Framer Motion: Smooth animations for scorebars and tabs.

Prism.js: Syntax highlighting so the code looks like VS Code.

Backend (The Brain)
Node.js & Express: Lightweight and scalable API.

Google Gemini 1.5 SDK: The "AI Brain" powering the reviews.

Puppeteer: A headless browser that turns your review into a PDF on-the-fly.

Express-Rate-Limit: Protects your API from being abused.

📂 Project Structure

Plaintext

ai-code-reviewer/

├── backend/                # The "Engine" (Node.js)

│   ├── src/

│   │   ├── controllers/    # Logic for Reviewing and PDF generation

│   │   ├── services/       # AI (Gemini) and PDF (Puppeteer) logic

│   │   ├── middleware/     # Safety checks (Validation & Rate Limiting)

│   │   └── app.js          # Main entry point

│   └── .env                # API Keys (PRIVATE)

├── frontend/               # The "Face" (React)

│   ├── src/

│   │   ├── components/     # UI parts (Scorecard, Tabs, Editor)

│   │   ├── services/       # Talking to the backend

│   │   └── App.jsx         # Main dashboard layout

│   └── tailwind.config.js  # Styling rules






REVIEW AUDIT FOR BEGINNER IS VERY DIFFERENT 

![claudeproj2output3](https://github.com/user-attachments/assets/3c28f021-abc2-47c4-bbf6-e10a549e644c)












![claudeproj2output4](https://github.com/user-attachments/assets/69dec60c-7ed2-4573-a38b-2f12ca1e37dc)











REVIEW AUDIT FOR SENIOR IS DIFFERENT MORE BRUTAL AND NO SUGERCOATING 
![claudeproj2output5](https://github.com/user-attachments/assets/ee6c86cb-9bd5-4b4f-8887-da0822b2e49f)













**********************************************CRITCAL ISSUES ***************************************
![claudeproj2output6](https://github.com/user-attachments/assets/a3832905-7aad-46ed-aeb0-2aa99acc33b6)











*********************************************IMPROVEMENT****************************************************************
![claudeproj2output7](https://github.com/user-attachments/assets/2f1761c0-c7a4-47d9-bed3-6a2fcb222ae0)













******(WAIT WAIT IT WILL GIVE YOU -2)***(PRODUCTION GRADE SOLUTION)*****************(SPECIALY FOR SENIOR)**************
![claudeproj2output8](https://github.com/user-attachments/assets/f17bbf65-8f76-434d-8585-724372d86381)
















🚀 Getting Started (Beginner Guide)
1. Prerequisites
Install Node.js

Get a free Gemini API Key from Google AI Studio

2. Setup the Backend
Bash
cd backend
npm install
cp .env.example .env
# Open .env and paste your GEMINI_API_KEY
npm run dev
3. Setup the Frontend
Bash
# Open a new terminal tab
cd frontend
npm install
npm run dev
📝 How to use it
Paste your code: Add any snippet (Python, JS, C++, etc.).

Select Mode: Choose Beginner if you want to learn, or Senior if you want a strict PR review.

Audit: Click "Run Review."

Analyze: Look at the Scorecard. If a score is Red, you have a "Production Blocker."

Export: Click "Download PDF Audit" to save a professional report of your work.

📊 The "Responsibility Decision"
One of the most unique features of this project is the Responsibility Decision block. For every major issue found, the AI will tell you:

Where the fix belongs: (e.g., API Layer, Database, or Function).

Why: Explaining the architectural reason so you become a better System Designer, not just a coder.

🛡️ License & Privacy
This project is Stateless. We do not store your code or your reviews. Once the session ends, the data is gone.

Happy Coding!
