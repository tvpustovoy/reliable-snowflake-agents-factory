// Purpose: /facts route — renders the shared FactsScreen inside the app shell.
import Shell from "../../components/Shell.js";
import Screen from "../../components/screens/FactsScreen.js";

export default function Page() {
  return <Shell id="facts" Screen={Screen} />;
}
