"""The rules that keep the plugins modular as more are added (ARCHITECTURE.md).

`arkar-dev-standards` is the core: rules, guards and the skills every project
needs. Every other plugin is a domain (today: `arkar-ui`). These checks run
over whatever is under `plugins/`, so a domain added later is held to the
same rules without a change here.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
PLUGINS = ROOT / "plugins"
CORE = "arkar-dev-standards"
PLUGIN_DIRS = sorted(path for path in PLUGINS.iterdir() if path.is_dir())
DOMAIN_DIRS = [path for path in PLUGIN_DIRS if path.name != CORE]
TEXT_FILES = (".md", ".py", ".cjs", ".js", ".json", ".sh", ".yaml", ".yml", ".css", ".html")
DOMAIN_RULES_LIMIT = 2000  # a domain's always-on rules are a routing paragraph, not a manual


def manifest(plugin: Path) -> dict:
    return json.loads((plugin / ".claude-plugin" / "plugin.json").read_text())


def skills_of(plugin: Path) -> set[str]:
    return {path.name for path in (plugin / "skills").iterdir() if path.is_dir()} if (plugin / "skills").is_dir() else set()


def shipped_text(plugin: Path) -> list[Path]:
    """The files of a plugin that Claude or a hook reads: its skills and hooks, not a skill's own eval cases."""
    return [path for path in plugin.rglob("*")
            if path.is_file() and path.suffix in TEXT_FILES and "evals" not in path.parts and "__pycache__" not in path.parts]


def rules_of(plugin: Path) -> str:
    found = sorted((plugin / "hooks").glob("*rules.md"))
    return found[0].read_text() if found else ""


def test_the_marketplace_lists_exactly_the_plugins_in_the_repo():
    listed = {entry["name"]: entry["source"] for entry in json.loads((ROOT / ".claude-plugin" / "marketplace.json").read_text())["plugins"]}
    assert listed == {plugin.name: f"./plugins/{plugin.name}" for plugin in PLUGIN_DIRS}


@pytest.mark.parametrize("plugin", PLUGIN_DIRS, ids=lambda path: path.name)
def test_a_plugin_is_named_after_its_folder_and_carries_a_version(plugin):
    meta = manifest(plugin)
    assert meta["name"] == plugin.name and plugin.name.startswith("arkar-")
    assert re.fullmatch(r"\d+\.\d+\.\d+", meta["version"])
    rules = rules_of(plugin)
    if rules:  # the first line of the always-on rules shows the version, so an old copy is easy to spot
        assert f"{plugin.name} v{meta['version']}" in rules.splitlines()[0]


def test_skill_names_are_unique_across_plugins():
    # Rules and gates name a skill without its plugin, so one name must mean one skill.
    seen: dict[str, str] = {}
    for plugin in PLUGIN_DIRS:
        for skill in skills_of(plugin):
            assert skill.startswith("arkar-")
            assert skill not in seen, f"{skill} is in both {seen[skill]} and {plugin.name}"
            seen[skill] = plugin.name


@pytest.mark.parametrize("plugin", PLUGIN_DIRS, ids=lambda path: path.name)
def test_no_file_path_into_another_plugin(plugin):
    # An installed plugin can only read its own folder. Across plugins a skill is named (`arkar-security`) and
    # loaded with the Skill tool; a path such as `arkar-security/scripts/…` only works between skills of one plugin.
    own = skills_of(plugin)
    others = {skill for other in PLUGIN_DIRS if other != plugin for skill in skills_of(other)}
    reaching = []
    for path in shipped_text(plugin):
        for skill in re.findall(r"\b(arkar-[a-z-]+)/(?:references|scripts|assets|SKILL\.md)", path.read_text(errors="ignore")):
            if skill in others and skill not in own:
                reaching.append(f"{path.relative_to(PLUGINS)} → {skill}/…")
    assert not reaching, reaching


def test_the_core_needs_no_other_plugin():
    core = PLUGINS / CORE
    assert not manifest(core).get("dependencies")
    # Its always-on rules name a domain only in the one section that sends such work to its plugin (or reports it missing).
    rules = rules_of(core)
    start = rules.index("## 2a. Work that belongs to a domain plugin")
    outside = rules[:start] + rules[rules.index("\n## ", start):]
    domain_skills = {skill for plugin in DOMAIN_DIRS for skill in skills_of(plugin)}
    named = sorted(skill for skill in domain_skills if skill in outside)
    assert not named, f"the core's rules name domain skills outside the missing-plugin paragraph: {named}"


@pytest.mark.parametrize("plugin", DOMAIN_DIRS, ids=lambda path: path.name)
def test_a_domain_plugin_builds_on_the_core_only(plugin):
    # Its own short routing rules, which say the core is needed…
    rules = rules_of(plugin)
    assert rules and len(rules) <= DOMAIN_RULES_LIMIT, f"{plugin.name}: {len(rules)} characters of always-on rules"
    assert f"`{CORE}`" in rules
    # …the core's rules know it exists, so a session without it says so instead of working without it…
    assert f"`{plugin.name}`" in rules_of(PLUGINS / CORE)
    # …and it names no skill of another domain.
    allowed = skills_of(plugin) | skills_of(PLUGINS / CORE)
    every_skill = {skill for other in PLUGIN_DIRS for skill in skills_of(other)}
    foreign = sorted({f"{path.relative_to(PLUGINS)}: {skill}" for path in shipped_text(plugin)
                      for skill in re.findall(r"\barkar-[a-z-]+", path.read_text(errors="ignore"))
                      if skill in every_skill and skill not in allowed})
    assert not foreign, foreign


@pytest.mark.parametrize("plugin", PLUGIN_DIRS, ids=lambda path: path.name)
def test_a_plugin_with_rules_gives_them_to_sessions_and_subagents(plugin):
    if not rules_of(plugin):
        pytest.skip("no always-on rules")
    hooks = json.loads((plugin / "hooks" / "hooks.json").read_text())["hooks"]
    rules_file = sorted((plugin / "hooks").glob("*rules.md"))[0].name
    assert any(rules_file in hook["command"] for entry in hooks["SessionStart"] for hook in entry["hooks"])
    assert any("subagent-context.json" in hook["command"] for entry in hooks["SubagentStart"] for hook in entry["hooks"])
