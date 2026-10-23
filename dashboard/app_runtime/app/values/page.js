// Purpose: /values route — renders the shared ValuesScreen inside the app shell.
import Shell from "../../components/Shell.js";
import Screen from "../../components/screens/ValuesScreen.js";

export default function Page() {
  return <Shell id="values" Screen={Screen} />;
}
