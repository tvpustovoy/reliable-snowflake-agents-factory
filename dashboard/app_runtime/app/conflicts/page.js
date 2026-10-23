// Purpose: /conflicts route — renders the shared ConflictsScreen inside the app shell.
import Shell from "../../components/Shell.js";
import Screen from "../../components/screens/ConflictsScreen.js";

export default function Page() {
  return <Shell id="conflicts" Screen={Screen} />;
}
