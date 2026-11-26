# AI usage summary

Two AI agents helped with this project: **Codex** (builder) and **Claude Code** (reviewer, then builder after Codex reached its usage limit). Each entry below describes one prompt in plain words, what the agent understood, and which repository files it created or edited. The complete prompt-and-response transcripts are in this folder (see [README.md](README.md)).

---

## Codex

### 1. Explain the challenge
**Prompt (in short):** Here are the competition details from the official Challenge Brief PDF. Analyse them and give me a text file explaining what the challenge asks.
**Understood:** Summarise the brief: the six deliverables, the scoring weights, the AI-log rule and the deadline.
**Files:** a participant guide text file outside the repository. No repository files.

### 2. Understand the project
**Prompt (in short):** Using the competition details and my repository link, analyse the project in depth.
**Understood:** Confirm the requirements and the empty repository before building.
**Files:** none.

### 3. Build the website
**Prompt (in short):** Build a modern, animated interface with an original SVG logo and the project name in the header. Put © Sibgatul Hassen on the left of the footer and a help icon on the right that opens a user manual with a smooth transition and a close button at the top left. Add a short intro, a screenshot collage that changes every 2 seconds, and 2–3 quotes. Use a Hub's Quest-inspired theme, then build the rest of the project. Don't list any AI as a co-author.
**Understood:** Build the landing page and a working recursive sound studio together.
**Files created:** `index.html`, `style.css`, `src/recursion.js`, `src/synth.js`, `src/art.js`, `src/player.js`, `src/app.js`, `src/audio-worker.js`, `assets/` (logo, favicon, fonts, gallery images), `README.md`.

### 4. Apply the reviewer's critique
**Prompt (in short):** Pasted review notes: make the logo recursive, use the theme colours, lengthen the pieces, add real reverb and ambience, and make the recursion tree the main visual.
**Understood:** Rework the engine and the visuals.
**Files edited:** `src/recursion.js`, `src/synth.js`, `src/art.js`, `assets/overtone.svg`.

### 5. Follow the review checklist
**Prompt (in short):** Before each step, read `AI_LOGS/REVIEW_NOTES.md`, fix items in priority order and tick them off.
**Understood:** Work through the reviewer's numbered checklist.
**Files edited:** all source files, `index.html`, `style.css`, `README.md`, `assets/`; logs added in `AI_LOGS/`.

---

## Claude Code

### 6. Understand the project
**Prompt (in short):** Here are the competition details from the official Challenge Brief PDF and my repository. Analyse them and understand the project.
**Understood:** Summarise the rubric, deliverables and time left, and propose a build plan.
**Files:** none in the repository.

### 7. Critique the Codex prompt
**Prompt (in short):** I gave Codex a prompt for the website. Critique it so Codex can do better.
**Understood:** Review the prompt against the rubric and write an improved version.
**Files:** none.

### 8. Watch Codex and critique its work
**Prompt (in short):** Codex has started building. Watch its work and say where it can improve.
**Understood:** Monitor the repository and review each change.
**Files created:** `AI_LOGS/REVIEW_NOTES.md`.

### 9. Give Codex instructions directly
**Prompt (in short):** Can you give instructions to Codex directly?
**Understood:** There's no direct channel, so use a shared notes file that Codex reads before each step.
**Files edited:** `AI_LOGS/REVIEW_NOTES.md`.

### 10. Finish the project
**Prompt (in short):** Codex has reached its limit. Continue the rest of the project.
**Understood:** Test everything, polish the visuals and complete the logs.
**Files edited:** `style.css` (Hub's Quest ripple), `README.md`, `AI_LOGS/`.

### 11. Faster start, gallery, recursion page, card numbers
**Prompt (in short):** Make playback start within about a second. Remove the preview and pause buttons. Rotate previews every 2 seconds and make them open their soundscape. Add a visual page that explains recursion. Show numbers on the soundscape cards.
**Understood:** Render the opening first and pre-render presets; make the gallery clickable; add a "Recursion" page with diagrams; add card stats.
**Files created:** `src/learn.js`. **Files edited:** `src/synth.js`, `src/audio-worker.js`, `src/player.js`, `src/app.js`, `index.html`, `style.css`, `README.md`.

### 12. Quote rotation and play/pause buttons
**Prompt (in short):** Rotate the quotes every 4–5 seconds, and give "Run it" and "Hear it" pause buttons.
**Understood:** Add timed quote rotation and play/pause toggles.
**Files edited:** `src/app.js`, `src/learn.js`.

### 13. Mobile screens
**Prompt (in short):** Make it work on mobile screens without changing the current design.
**Understood:** Audit phone sizes and fix the problems with phone-only CSS.
**Files edited:** `style.css`.

### 14. Progress bar and continuous rotation
**Prompt (in short):** The progress marker doesn't match the time on mobile, and the rotations should keep going while the page is open.
**Understood:** Draw the playhead from the clock and keep the gallery and quotes rotating.
**Files edited:** `src/app.js`, `src/art.js`, `src/player.js`, `index.html`, `style.css`.

### 15. Brighter logo glow
**Prompt (in short):** Make the logo's glow brighter.
**Files edited:** `style.css`.

### 16. Wider glow, fixed header, sliding page marker
**Prompt (in short):** Spread the glow further, keep the header fixed while scrolling, and slide the page marker smoothly between pages.
**Files edited:** `index.html`, `src/app.js`, `style.css`.

### 17. Make mobile match the web
**Prompt (in short):** Don't change the web version; make the mobile version match it (for example the logo glow).
**Understood:** The phone's reduce-motion setting had switched effects off. Keep effects on phones and restore the missing gallery features.
**Files edited:** `src/app.js`, `src/learn.js`, `index.html`, `style.css`.

### 18. Instant mood switching
**Prompt (in short):** Switching between Tidal, Orchid and Amber while playing takes too long on mobile.
**Understood:** Start each new mood from its pre-rendered opening.
**Files edited:** `src/app.js`.

### 19. Repository privacy check
**Prompt (in short):** Check the repository for sensitive information and remove it, and remove empty files, without breaking the app.
**Understood:** Redact private details from the logs and history, and remove the empty `.nojekyll` file.
**Files edited:** `AI_LOGS/` files. **Files removed:** `.nojekyll`.

### 20. This summary
**Prompt (in short):** Write a simple summary of my prompts, what was understood and which files changed, keeping the full logs.
**Files created:** `AI_LOGS/SUMMARY.md`. **Files edited:** `AI_LOGS/README.md`.
