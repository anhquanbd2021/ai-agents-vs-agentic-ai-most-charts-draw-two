# Ai Agents Vs Agentic Ai Most Charts Draw Two Lab

Interactive companion for the article *AI Agents vs Agentic AI — Most Charts Draw Two Nearly Identical Pipelines*. The lab proves that the difference is a runtime fence and a coordination boundary, not a different box in the diagram.

Zero dependencies — Node 24+ only. The domain model in `public/lab.mjs` is shared by the browser UI and the test suite.

## What it proves

The same checkout pipeline runs at four rungs: L0 Prompt, L1 Assisted, L2 Agent, and L3 Agentic. At L2 the agent executes refunds alone up to a 50 USD fence and hands off anything larger. Break the fence and the seeded failure runs all four orders alone: status flips from `fenced` to `runaway` and the executed total jumps from 37 USD to 1516 USD.

L3 adds a coordinator and two typed sub-agent calls. The model, tools, memory, and loop are identical across rungs — only autonomy changes.

## Run it

```
npm start        # serve the lab on http://localhost:3000
npm test         # domain model + end-to-end server suite
npm run check    # same as npm test
```

## Layout

- `public/lab.mjs` — ladder constants, `decideRefund()`, `runBatch()`, `coordinateCheckout()`
- `app/server.js` — static server, `/health`, `/version`, `/api/ladder`, `/api/run`
- `public/app.js` — DOM wiring for the Lab tab
- `public/index.html`, `public/guide.html`, `public/styles.css`
- `test/lab.test.mjs`, `test/server.test.mjs` — Node `--test` suites

## Honest limits

- The simulator is deterministic and in-memory; it never touches a payment system.
- The fence is one numeric guard. Real systems need auth, idempotency keys, and audit logs.
- A pass means this mechanism is reproducible, never that the system is correct.

This is an educational demo, not production infrastructure.

Repo: [github.com/anhquanbd2021/ai-agents-vs-agentic-ai-most-charts-draw-two](https://github.com/anhquanbd2021/ai-agents-vs-agentic-ai-most-charts-draw-two)
