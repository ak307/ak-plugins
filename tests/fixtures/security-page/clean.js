document.addEventListener("DOMContentLoaded", () => { localStorage.setItem("last-tab", "open"); history.replaceState(null, "", "?tab=open&id=42"); });
