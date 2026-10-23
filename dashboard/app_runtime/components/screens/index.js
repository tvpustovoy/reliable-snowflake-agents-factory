// Purpose: registry of Firn screens — used by app routes and the agent HTML generator.
import HomeScreen from "./HomeScreen.js";
import MapScreen from "./MapScreen.js";
import ConflictsScreen from "./ConflictsScreen.js";
import FactsScreen from "./FactsScreen.js";
import ValuesScreen from "./ValuesScreen.js";
import AgentsScreen from "./AgentsScreen.js";
import GapsScreen from "./GapsScreen.js";
import EvolutionScreen from "./EvolutionScreen.js";
import CultureScreen from "./CultureScreen.js";

export const SCREEN_COMPONENTS = {
  home: HomeScreen, map: MapScreen, conflicts: ConflictsScreen, facts: FactsScreen, values: ValuesScreen,
  agents: AgentsScreen, gaps: GapsScreen, evolution: EvolutionScreen, culture: CultureScreen,
};
