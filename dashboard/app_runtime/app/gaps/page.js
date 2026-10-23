// Purpose: /gaps route — renders the shared GapsScreen inside the app shell.
import Shell from "../../components/Shell.js";
import Screen from "../../components/screens/GapsScreen.js";

export default function Page() {
  return <Shell id="gaps" Screen={Screen} />;
}
