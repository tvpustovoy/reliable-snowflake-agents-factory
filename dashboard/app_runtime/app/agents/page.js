// Purpose: /agents route — renders the shared AgentsScreen inside the app shell.
import Shell from "../../components/Shell.js";
import Screen from "../../components/screens/AgentsScreen.js";

export default function Page() {
  return <Shell id="agents" Screen={Screen} />;
}
