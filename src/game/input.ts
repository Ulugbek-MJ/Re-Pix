const GAME_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Space", "Escape"];

export class Input {
  private keys = new Set<string>();
  private attackQueued = false;
  private enterQueued = false;
  private pauseQueued = false;

  private down = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT")) return;
    if (GAME_KEYS.includes(e.key) || e.code === "Space") e.preventDefault();
    if (e.code === "Space" && !e.repeat) this.attackQueued = true;
    if (e.code === "Enter" && !e.repeat) this.enterQueued = true;
    if ((e.code === "Escape" || e.code === "KeyP") && !e.repeat) this.pauseQueued = true;
    this.keys.add(e.code);
  };
  private up = (e: KeyboardEvent) => this.keys.delete(e.code);
  private blur = () => this.keys.clear();

  attach() {
    window.addEventListener("keydown", this.down);
    window.addEventListener("keyup", this.up);
    window.addEventListener("blur", this.blur);
  }
  detach() {
    window.removeEventListener("keydown", this.down);
    window.removeEventListener("keyup", this.up);
    window.removeEventListener("blur", this.blur);
  }

  axis() {
    const k = this.keys;
    const x = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    const y = (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0) - (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0);
    return { x, y };
  }
  /** Bir marta bosilgan hujum (iste'mol qilinadi). */
  consumeAttack() {
    const a = this.attackQueued;
    this.attackQueued = false;
    return a;
  }
  consumeEnter() {
    const a = this.enterQueued;
    this.enterQueued = false;
    return a;
  }
  /** Bir marta bosilgan Escape (iste'mol qilinadi). */
  consumePause() {
    const a = this.pauseQueued;
    this.pauseQueued = false;
    return a;
  }
}
