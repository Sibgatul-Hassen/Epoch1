# Overtone · Recursive Soundscapes

[Play in the live studio](https://sibgatul-hassen.github.io/Epoch1/#studio) · [Open the landing page](https://sibgatul-hassen.github.io/Epoch1/)

Overtone is Sibgatul Hassen’s entry for UIU Developers Hub’s Hub’s Quest, Epoch 1. A seeded recursive tree becomes a relaxing stereo composition. Each sounding branch lights its ancestry as it plays. Start with Tidal Fold, Orchid Orbit or Amber Bloom, change a parameter, and save the full piece as a WAV.

![Tidal Fold, captured from the recursive tree renderer](assets/scene-0.webp)

## Try it

1. Choose a mood and press Play. Sound begins on a user gesture.
2. Raise Depth, listen for finer answering notes, and follow the glowing path back to the trunk.
3. Pause holds your place. Stop rewinds. Loop crossfades the ending into the beginning.
4. Export WAV saves the full mastered composition as 44.1 kHz, stereo, 16-bit PCM. The listening volume is independent of the export level.

## How the recursion works

[The recursive algorithm](src/recursion.js) has two levels. `growPhrase` creates a related phrase, changes its tonal centre and timing skew, and calls itself until the phrase count is reached. Inside each phrase, `divide` places one pentatonic note at a time interval’s split and calls itself on the two smaller intervals. Depth stops the subdivision. Ancestors have priority when notes compete for the same time slot. A final root note resolves the piece before the room reflections decay.

| Control or property | What you hear | What you see |
| --- | --- | --- |
| Mood | A different scale, instrument and atmosphere | Cyan, pink or amber branch geometry |
| Depth | More generations of softer notes, with longer phrases at high settings | More endpoints and a longer call path |
| Branching rhythm | Unequal time splits and different melodic intervals | A change in branch spread and distribution |
| Tempo and pulse | Phrase speed and optional eighth-note alignment | Nodes light at the sounding times |
| Seed | Reproducible variation of pitch, timing and phrase development | Repeating the settings recreates the same tree |
| Position and ancestry | Split position controls stereo pan, and terminal notes add a light chime | The active node and its ancestors glow together |
| Space and ambience | Damped reflections with procedural tide, wind or rain | The level halo follows the sound |

The [worker](src/audio-worker.js) renders the score through [the synthesizer](src/synth.js). The same stereo samples feed playback and WAV encoding. Six comb filters and two allpasses per channel create the reverb. The master aims for −20 dBFS RMS with a −3 dBFS peak ceiling. The [field renderer](src/art.js) caches each phrase and adds timed highlights over it.

## Run locally

From the repository root, run `python -m http.server 8000` (on Windows, `py -m http.server 8000`), then open **http://localhost:8000/**. With Node installed, `npx serve .` is an alternative. The Python route requires no installation or build step beyond Python itself.

GitHub Pages serves the root of `main`. All app resources use relative paths, including the module Worker. The optional Sites manifest in `.openai/hosting.json` targets a static copy in `dist/`. Readable source lives at the root and in `src/`.

Use a modern browser with Web Audio, Canvas 2D, native dialog and module Worker support over HTTPS or localhost. The manual explains keyboard and touch controls. Reduced-motion mode starts the gallery still and simplifies playback highlights.

## Credits and AI usage

Project and copyright © 2026 Sibgatul Hassen. The logo, tree captures and generated audio were made for Overtone. DM Sans and Instrument Serif are self-hosted under the SIL Open Font License. [DM Sans license](assets/dm-sans-license.txt) · [Instrument Serif license](assets/instrument-serif-license.txt)

The landing quotes are excerpts from Ada Lovelace’s Note A and Benoît Mandelbrot on the geometry of nature. [Lovelace’s notes](https://www.fourmilab.ch/babbage/sketch.html) · [Mandelbrot interview](https://users.math.yale.edu/mandelbrot/web_pdfs/inHisOwnWords.pdf)

Codex assisted with implementation and Claude Code provided review feedback. [AI prompt-and-response logs and review notes](AI_LOGS/README.md)
