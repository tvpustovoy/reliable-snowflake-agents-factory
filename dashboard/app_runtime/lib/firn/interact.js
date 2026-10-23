// Purpose: one interactivity layer for both outputs — filters, search, action buttons, toggles.
// Driven only by data-* attributes so server-rendered markup works in the app and in agent HTML.
// Inputs: a DOM root. Outputs: event listeners. Self-contained: the generator inlines
// initFirn.toString(), so it must not reference anything outside its own body.
export function initFirn(root) {
  if (root.dataset.firnReady) return;
  root.dataset.firnReady = "1";

  // Filters: chip <button data-fg="group" data-fv="value">, item data-f-group="v1 v2", search input data-search
  const active = {};
  root.querySelectorAll("[data-fg]").forEach((c) => {
    const g = c.dataset.fg;
    active[g] = active[g] || new Set();
    if (c.classList.contains("on")) active[g].add(c.dataset.fv);
  });
  const search = root.querySelector("[data-search]");

  function apply() {
    const q = search ? search.value.trim().toLowerCase() : "";
    root.querySelectorAll("[data-item]").forEach((el) => {
      let ok = Object.keys(active).every((g) => {
        const vals = (el.getAttribute("data-f-" + g) || "").split(" ").filter(Boolean);
        return vals.length === 0 || vals.some((v) => active[g].has(v));
      });
      if (ok && q) ok = (el.dataset.text || el.textContent).toLowerCase().includes(q);
      el.hidden = !ok;
    });
    root.querySelectorAll("[data-list]").forEach((list) => {
      const empty = root.querySelector('[data-empty-for="' + list.dataset.list + '"]');
      if (empty) empty.hidden = list.querySelectorAll("[data-item]:not([hidden])").length > 0;
    });
  }

  root.querySelectorAll("[data-fg]").forEach((c) => c.addEventListener("click", () => {
    const set = active[c.dataset.fg];
    set.has(c.dataset.fv) ? set.delete(c.dataset.fv) : set.add(c.dataset.fv);
    c.classList.toggle("on");
    apply();
  }));
  if (search) search.addEventListener("input", apply);

  // Actions: <button data-act="key" data-msg="..."> shows the message in [data-done="key"]
  root.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
    const key = b.dataset.act;
    const msg = root.querySelector('[data-done="' + key + '"]');
    if (msg) { msg.textContent = "\u2713 " + b.dataset.msg; msg.hidden = false; }
    const card = b.closest(".card");
    if (card && b.dataset.close) card.classList.add("done");
  }));

  // Toggles: <button data-toggle="id"> shows/hides [data-panel="id"]
  root.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", () => {
    const p = root.querySelector('[data-panel="' + b.dataset.toggle + '"]');
    if (p) p.hidden = !p.hidden;
  }));

  apply();
}
