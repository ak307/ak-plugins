"""Structure checks for every skill in every plugin.

- valid frontmatter: name matches the folder, a description within the
  1,024-character limit, nothing else required;
- every `references/…`, `scripts/…` path a skill mentions exists in that skill;
- every `arkar-…` skill named anywhere in the plugins exists;
- no references to skills that were removed.

The checks run over every folder under `plugins/`, so a plugin added later
gets them without a change here.
"""
import re
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[1]
PLUGINS = ROOT / "plugins"
SKILL_DIRS = sorted((path for path in PLUGINS.glob("*/skills/*") if path.is_dir()), key=lambda path: path.name)
RULES_FILES = sorted(PLUGINS.glob("*/hooks/*rules.md"))
UI = PLUGINS / "arkar-ui"
REMOVED = ("arkar-frontend-design", "arkar-frontend-qa")
UI_SKILLS = ("arkar-ui-intelligence", "arkar-ui-discovery", "arkar-ui-art-direction", "arkar-ui-ux-engineering",
             "arkar-ui-design-system", "arkar-ui-motion-design", "arkar-ui-responsive-design",
             "arkar-ui-accessibility", "arkar-ui-implementation", "arkar-ui-visual-qa")


def plugin_of(path: Path) -> Path:
    """The plugin folder a file belongs to."""
    return PLUGINS / path.relative_to(PLUGINS).parts[0]


def frontmatter(skill_dir: Path) -> dict:
    text = (skill_dir / "SKILL.md").read_text()
    match = re.match(r"---\n(.*?)\n---\n", text, re.S)
    assert match, f"{skill_dir.name}: SKILL.md has no frontmatter"
    return yaml.safe_load(match.group(1))


@pytest.mark.parametrize("skill_dir", SKILL_DIRS, ids=lambda path: path.name)
def test_frontmatter(skill_dir):
    meta = frontmatter(skill_dir)
    assert meta["name"] == skill_dir.name
    assert re.fullmatch(r"[a-z0-9-]{1,64}", meta["name"])
    assert 50 < len(meta["description"]) <= 1024, len(meta["description"])
    assert "<" not in meta["description"] and ">" not in meta["description"]


@pytest.mark.parametrize("skill_dir", SKILL_DIRS, ids=lambda path: path.name)
def test_mentioned_files_exist(skill_dir):
    missing = []
    for doc in skill_dir.rglob("*.md"):
        for mentioned in re.findall(r"`((?:references|scripts)/[\w./-]+)`", doc.read_text()):
            if not (skill_dir / mentioned).exists():
                missing.append(f"{doc.relative_to(skill_dir)} → {mentioned}")
    # Bare reference file names mentioned in the same skill (e.g. `motion-principles.md`), or in a skill of the same plugin.
    for doc in skill_dir.rglob("*.md"):
        for name in re.findall(r"`([\w-]+\.md)`", doc.read_text()):
            if name in ("DESIGN.md", "ARCHITECTURE.md", "SECURITY.md", "SKILL.md", "README.md", "CLAUDE.md"):
                continue
            if not list(skill_dir.rglob(name)) and not list((plugin_of(skill_dir) / "skills").rglob(name)):
                missing.append(f"{doc.relative_to(skill_dir)} → {name}")
    assert not missing, missing


def test_every_named_skill_exists():
    names = {path.name for path in SKILL_DIRS}
    unknown = set()
    for doc in list(PLUGINS.glob("*/skills/**/*.md")) + RULES_FILES:
        for name in re.findall(r"`(arkar-[a-z-]+)`", doc.read_text()):
            if name not in names and not (PLUGINS / name).is_dir():  # a plugin's own name (`arkar-ui`) is not a skill
                unknown.add(f"{doc.relative_to(PLUGINS)}: {name}")
    assert not unknown, sorted(unknown)


def test_no_removed_skills_mentioned():
    found = [str(doc.relative_to(PLUGINS)) for doc in PLUGINS.rglob("*")
             if doc.is_file() and doc.suffix in (".md", ".json")
             and any(name in doc.read_text() for name in REMOVED)]
    assert not found, found


def test_ui_ecosystem_complete():
    skills = UI / "skills"
    for name in UI_SKILLS:
        assert (skills / name / "SKILL.md").exists(), name
    orchestrator = (skills / "arkar-ui-intelligence" / "SKILL.md").read_text()
    for name in UI_SKILLS[1:]:
        assert name in orchestrator, f"orchestrator doesn't route to {name}"
    rules = (UI / "hooks" / "ui-rules.md").read_text()
    assert "arkar-ui-intelligence" in rules and "arkar-ui-visual-qa" in rules
    # AK's premium standard is the most important rule: present and enforced.
    assert (skills / "arkar-ui-intelligence" / "references" / "premium-standard.md").exists()
    assert "premium" in rules.lower()
    for name in UI_SKILLS:
        assert "premium" in (skills / name / "SKILL.md").read_text().lower(), name


@pytest.mark.parametrize("skill_dir", SKILL_DIRS, ids=lambda path: path.name)
def test_skill_body_size(skill_dir):
    lines = (skill_dir / "SKILL.md").read_text().count("\n")
    assert lines < 500, f"{skill_dir.name}: {lines} lines — move detail into references/"


def test_cross_skill_file_references_exist():
    # e.g. `arkar-ui-visual-qa/scripts/film.cjs` named from another UI skill. A path like this only works between
    # skills of the same plugin (an installed plugin can't read another plugin's folder), so that is where it is looked for.
    missing = []
    for doc in list(PLUGINS.glob("*/skills/**/*.md")) + RULES_FILES:
        for skill, rest in re.findall(r"`(arkar-[a-z-]+)/((?:references|scripts|assets)/[\w./-]+)`", doc.read_text()):
            if not (plugin_of(doc) / "skills" / skill / rest).exists():
                missing.append(f"{doc.relative_to(PLUGINS)} → {skill}/{rest}")
    assert not missing, missing


def test_probe_definitions_parse():
    # A rubric edit once broke the YAML and the probe run failed after the release checks had passed.
    probes = yaml.safe_load((ROOT / "evals" / "probes.yaml").read_text())["probes"]
    ids = [probe["id"] for probe in probes]
    assert len(ids) == len(set(ids))
    assert all(probe.get("prompt") and probe.get("rubric") for probe in probes)
