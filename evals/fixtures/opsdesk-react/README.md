# Ops Desk

Internal facilities tool: work orders across the company's managed buildings.
React 18 + Vite + React Router. The UI is built from the shared components in
`src/components/ui` and the tokens in `src/styles/tokens.css` (see DESIGN.md).

    npm install
    npm run dev      # local development
    npm run build    # production build in dist/

Mock data lives in `src/data`; `?latency=slow` and `?fail=1` exercise slow and
failing requests.
