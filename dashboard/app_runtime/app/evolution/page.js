// Purpose: /evolution route — renders the shared EvolutionScreen inside the app shell.
import Shell from "../../components/Shell.js";
import Screen from "../../components/screens/EvolutionScreen.js";

export default function Page() {
  return <Shell id="evolution" Screen={Screen} />;
}
