"""Structure checks for every skill in the plugin.

- valid frontmatter: name matches the folder, a description within the
  1,024-character limit, nothing else required;
- every `references/…`, `scripts/…` path a skill mentions exists in that skill;
- every `arkar-…` skill named anywhere in the plugin exists;
- no references to skills that were removed.
"""
import re
from pathlib import Path

import pytest
import yaml

PLUGIN = Path(__file__).resolve().parents[1] / "plugins" / "arkar-dev-standards"
SKILLS = PLUGIN / "skills"
SKILL_DIRS = sorted(path for path in SKILLS.iterdir() if path.is_dir())
REMOVED = ("arkar-frontend-design", "arkar-frontend-qa")
UI_SKILLS = ("arkar-ui-intelligence", "arkar-ui-discovery", "arkar-ui-art-direction", "arkar-ui-ux-engineering",
             "arkar-ui-design-system", "arkar-ui-motion-design", "arkar-ui-responsive-design",
             "arkar-ui-accessibility", "arkar-ui-implementation", "arkar-ui-visual-qa")


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
    # Bare reference file names mentioned in the same skill (e.g. `motion-principles.md`).
    for doc in skill_dir.rglob("*.md"):
        for name in re.findall(r"`([\w-]+\.md)`", doc.read_text()):
            if name in ("DESIGN.md", "ARCHITECTURE.md", "SECURITY.md", "SKILL.md", "README.md", "CLAUDE.md"):
                continue
            if not list(skill_dir.rglob(name)) and not list(SKILLS.rglob(name)):
                missing.append(f"{doc.relative_to(skill_dir)} → {name}")
    assert not missing, missing


def test_every_named_skill_exists():
    names = {path.name for path in SKILL_DIRS}
    unknown = set()
    for doc in list(SKILLS.rglob("*.md")) + [PLUGIN / "hooks" / "coding-rules.md"]:
        for name in re.findall(r"`(arkar-[a-z-]+)`", doc.read_text()):
            if name not in names:
                unknown.add(f"{doc.relative_to(PLUGIN)}: {name}")
    assert not unknown, sorted(unknown)


def test_no_removed_skills_mentioned():
    found = [str(doc.relative_to(PLUGIN)) for doc in PLUGIN.rglob("*")
             if doc.is_file() and doc.suffix in (".md", ".json")
             and any(name in doc.read_text() for name in REMOVED)]
    assert not found, found


def test_ui_ecosystem_complete():
    for name in UI_SKILLS:
        assert (SKILLS / name / "SKILL.md").exists(), name
    orchestrator = (SKILLS / "arkar-ui-intelligence" / "SKILL.md").read_text()
    for name in UI_SKILLS[1:]:
        assert name in orchestrator, f"orchestrator doesn't route to {name}"
    rules = (PLUGIN / "hooks" / "coding-rules.md").read_text()
    assert "arkar-ui-intelligence" in rules and "arkar-ui-visual-qa" in rules
    # AK's premium standard is the most important rule: present and enforced.
    assert (SKILLS / "arkar-ui-intelligence" / "references" / "premium-standard.md").exists()
    assert "premium" in rules.lower()
    for name in UI_SKILLS:
        assert "premium" in (SKILLS / name / "SKILL.md").read_text().lower(), name


@pytest.mark.parametrize("skill_dir", SKILL_DIRS, ids=lambda path: path.name)
def test_skill_body_size(skill_dir):
    lines = (skill_dir / "SKILL.md").read_text().count("\n")
    assert lines < 500, f"{skill_dir.name}: {lines} lines — move detail into references/"
