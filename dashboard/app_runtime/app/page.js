// Purpose: / route — Home screen (money, goals, decision inbox) inside the app shell.
import Shell from "../components/Shell.js";
import Screen from "../components/screens/HomeScreen.js";

export default function Page() {
  return <Shell id="home" Screen={Screen} />;
}
