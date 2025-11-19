// Import all example loops so their registerLoop side-effects run.
// This file can be imported once (e.g. from SceneCanvas or LoopManager)
// to ensure the loops are registered with the loopRegistry.

import { registerLoop } from "../loopRegistry";
import FallenObjectsLoop from "./FallenObjectsLoop";
import Loop0Impl from "./Loop0";
import Loop1Impl from "./Loop1";
import Loop2Impl from "./Loop2";
import NormalLoop from "./NormalLoop";
import PianoPuzzleLoop from "./PianoPuzzleLoop";
import RadioPuzzleLoop from "./RadioPuzzleLoop";

registerLoop(Loop0Impl);
registerLoop(RadioPuzzleLoop);
registerLoop(Loop1Impl);
registerLoop(PianoPuzzleLoop)
registerLoop(Loop2Impl);
registerLoop(NormalLoop);
registerLoop(FallenObjectsLoop);
registerLoop(NormalLoop);


