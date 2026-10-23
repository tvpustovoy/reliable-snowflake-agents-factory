"use client";
// Purpose: attach the shared interactivity layer (lib/firn/interact.js) to the rendered screen.
import { useEffect } from "react";
import { initFirn } from "../lib/firn/interact.js";

export default function Interact() {
  useEffect(() => {
    const root = document.querySelector("[data-firn-root]");
    if (root) initFirn(root);
  }, []);
  return null;
}
