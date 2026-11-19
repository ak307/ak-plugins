# Engineering fixtures

Eleven small projects, each a real task with one planted risk, graded by hidden tests the session never sees.
They measure whether the core skills produce correct, fast, maintainable changes — before a rule is added.

| Fixture | Risk |
|---|---|
| A report names | one query per row (N+1) |
| B approve claim | double approval, two managers at once |
| C booking boundary | a boundary bug, and a related bug to report |
| D asset import | all-or-nothing, a convention only in ARCHITECTURE.md |
| E find duplicates | must scale to 20,000 contacts |
| F overtime summary | an existing helper wrong for overnight shifts |
| G site filter | a per-row lookup already in the function being changed (fixed with approval, or proposed 🟢) |
| H refactor quote | every price must stay the same |
| I overdue timezone | Singapore dates on a UTC server |
| J invoice GST | half-up rounding on the subtotal |
| K settings update | a cache that goes stale |

```
python3 make_cases.py && python3 make_cases2.py        # writes cases.json, cases2.json, hidden/
python3 -c "import json; a=json.load(open('cases.json')); b=json.load(open('cases2.json')); json.dump(a+b, open('cases.json','w'))"
python3 run_cases.py <plugins folder> <out> claude-sonnet-5-5 A-report-names:1 G-site-filter:1 …
python3 grade.py <out>
```

Results are in `evals/SKILL-CHANGES.md` (v4.2.0 row).
