// Purpose: wraps a screen for the app: tab nav + screen + interactivity hook.
import { Nav } from "./ui.js";
import Interact from "./Interact.js";

export default function Shell({ id, Screen }) {
  return (
    <>
      <Nav active={id} />
      <Screen />
      <Interact />
    </>
  );
}
