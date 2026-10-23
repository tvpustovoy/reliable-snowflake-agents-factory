// Purpose: /culture route — renders the shared CultureScreen inside the app shell.
import Shell from "../../components/Shell.js";
import Screen from "../../components/screens/CultureScreen.js";

export default function Page() {
  return <Shell id="culture" Screen={Screen} />;
}
