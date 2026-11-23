
import { freighter, port } from "./port-layout.ts";

function ease(t: number) {
  return t * t * (3 - 2 * t);
}

// One hour of replay includes an unloading pass and a return loading pass.
// Heights are measured from the concrete apron to the bottom of the slung pallet.
export function cargoPose(seconds: number) {
  const hour = ((seconds % 3600) + 3600) % 3600;
  const t = Math.min(hour, 3600 - hour) / 1800;
  const phase = seconds*.002 + freighter.z;
  const hatch = freighter.deckHeight - port.quayY + .055*Math.sin(phase)
    + (port.craneZ-freighter.z)*Math.sin(.006*Math.sin(phase*.83));
  const lift = 5.55;
  if (t < .25) {
    const rise = ease(Math.max(0, (t - .08) / .17));
    return { yaw: 0, height: hatch + (lift - hatch) * rise };
  }
  if (t < .70) return { yaw: port.receivingAngle * ease((t - .25) / .45), height: lift };
  const lower = ease(Math.min(1, (t - .70) / .21));
  return { yaw: port.receivingAngle, height: lift + (port.trailerDeck - lift) * lower };
}
