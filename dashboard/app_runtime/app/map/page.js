// Purpose: /map route — Map screen (zone mandates) inside the app shell.
import Shell from "../../components/Shell.js";
import Screen from "../../components/screens/MapScreen.js";

export default function Page() {
  return <Shell id="map" Screen={Screen} />;
}
