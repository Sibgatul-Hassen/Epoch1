# AI usage log

Sibgatul Hassen is the author. These records disclose AI assistance for the Epoch 1 submission.

**Start here:** [SUMMARY.md](SUMMARY.md) lists every prompt in plain words, what the agent understood, and which files it created or edited.

| Record | Source and period |
| --- | --- |
| [Summary](SUMMARY.md) | All prompts (Codex and Claude Code) with what was understood and the files created or edited. |
| [Challenge guide session](challenge-guide-session.md) | Codex · 26 November 2026 · challenge analysis and preparation of the participant guide. |
| [Build session](codex-session.md) | Codex · 26 November 2026 · project analysis, user prompts, relayed critiques and the builder’s user-facing responses. |
| [Reviewer session](claude-review-session.md) | Claude Code · 26 November 2026 · owner prompts and Claude Code's replies: the challenge analysis, the critique of the Codex prompt, the review rounds during the build, and (after Codex reached its usage limit) testing and further feature work. Tool calls appear as one-line summaries. |
| [Review notes](REVIEW_NOTES.md) | Claude Code · 26 November 2026 · evolving implementation review with inline verification notes from the builder. |

## How the work was split

1. **Codex (builder)** wrote the application: the recursion engine, synthesizer, renderer, player, UI, artwork and README.
2. **Claude Code (reviewer)** watched the repository and wrote numbered findings to `REVIEW_NOTES.md`. The owner told Codex to read that file before each step and tick off what it fixed.
3. When Codex reached its usage limit, the owner asked Claude Code to finish the project. Claude Code tested it and made the later changes listed in the summary.

The transcripts preserve the user prompts and visible assistant responses in order. Transcript timestamps use UTC. No AI tool is listed as a git co-author; all commits are by the owner.

## Redactions

The transcripts are otherwise verbatim. Before publishing, these were removed or replaced: the organizers' announcement emails pasted into the first prompt (replaced by a note that the competition details came from the official Challenge Brief PDF), the submission form link, local file paths on the author's computer (`C:\Users\…` is now `~`), and private email addresses. The git history was rewritten the same way (commits use the author's GitHub no-reply address), so commit IDs mentioned inside the logs refer to the earlier history.
