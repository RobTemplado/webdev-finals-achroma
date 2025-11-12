// Simple global input store for cross-tree communication (R3F + DOM)
// No external deps; MobileControls writes here, FPSControls reads here.

export type InputSnapshot = {
  // movement axes: x = strafe (-1 left .. 1 right), y = forward (-1 back .. 1 forward)
  moveX: number;
  moveY: number;
  // look deltas accumulated since last consumption (pixels)
  lookDX: number;
  lookDY: number;
  // whether touch/mobile controls are active
  touchMode: boolean;
  // one-shot interaction press (E key or mobile button)
  interactPressed: boolean;
};

const state: InputSnapshot = {
  moveX: 0,
  moveY: 0,
  lookDX: 0,
  lookDY: 0,
  touchMode: false,
  interactPressed: false,
};

// Internal keyboard tracking so movement + interact are normalized with touch
const keyState = {
  w: false,
  a: false,
  s: false,
  d: false,
};

function recomputeAxesFromKeys() {
  // Combine keys into discrete axes; diagonals automatically supported
  let x = 0;
  if (keyState.a) x -= 1;
  if (keyState.d) x += 1;
  let y = 0;
  if (keyState.w) y += 1;
  if (keyState.s) y -= 1;
  setMoveAxes(x, y);
}

function handleKeyDown(e: KeyboardEvent) {
  switch (e.code) {
    case "KeyW":
      if (!keyState.w) {
        keyState.w = true;
        recomputeAxesFromKeys();
      }
      break;
    case "KeyA":
      if (!keyState.a) {
        keyState.a = true;
        recomputeAxesFromKeys();
      }
      break;
    case "KeyS":
      if (!keyState.s) {
        keyState.s = true;
        recomputeAxesFromKeys();
      }
      break;
    case "KeyD":
      if (!keyState.d) {
        keyState.d = true;
        recomputeAxesFromKeys();
      }
      break;
    case "KeyE":
      // One-shot interact
      pressInteract();
      break;
    default:
      break;
  }
}

function handleKeyUp(e: KeyboardEvent) {
  switch (e.code) {
    case "KeyW":
      if (keyState.w) {
        keyState.w = false;
        recomputeAxesFromKeys();
      }
      break;
    case "KeyA":
      if (keyState.a) {
        keyState.a = false;
        recomputeAxesFromKeys();
      }
      break;
    case "KeyS":
      if (keyState.s) {
        keyState.s = false;
        recomputeAxesFromKeys();
      }
      break;
    case "KeyD":
      if (keyState.d) {
        keyState.d = false;
        recomputeAxesFromKeys();
      }
      break;
    default:
      break;
  }
}

// Register listeners once on the client side
if (typeof window !== "undefined") {
  const w = window as any;
  if (!w.__inputStoreKeysAttached) {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    w.__inputStoreKeysAttached = true;
  }
}

export function setTouchMode(on: boolean) {
  state.touchMode = on;
}

export function setMoveAxes(x: number, y: number) {
  // clamp to [-1, 1]
  state.moveX = Math.max(-1, Math.min(1, x));
  state.moveY = Math.max(-1, Math.min(1, y));
}

export function addLookDelta(dx: number, dy: number) {
  state.lookDX += dx;
  state.lookDY += dy;
}

export function consumeLookDelta() {
  const dx = state.lookDX;
  const dy = state.lookDY;
  state.lookDX = 0;
  state.lookDY = 0;
  return { dx, dy };
}

export function getMoveAxes() {
  return { x: state.moveX, y: state.moveY };
}

export function isTouchMode() {
  return state.touchMode;
}

// Mark an interaction press; consumers should call consumeInteract() to read and clear
export function pressInteract() {
  state.interactPressed = true;
}

// Returns true if an interaction was pressed since last call and clears the flag
export function consumeInteract(): boolean {
  const v = state.interactPressed;
  state.interactPressed = false;
  return v;
}
