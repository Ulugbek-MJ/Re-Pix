import { Animator, Body, updatePhysics, isFlashing, clampToRoom } from "./animation";
import type { Player } from "./player";
import { renderSprite } from "./sprites";

export type EnemyKind = "blob" | "wisp" | "rammer";

/**
 * blob   – sekin, sakrab-sakrab o'yinchini quvadi
 * wisp   – tez, to'lqinsimon (sinus) uchib aylanadi
 * rammer – to'xtab nishon oladi, so'ng tez yugurib uriladi
 */
export class Enemy implements Body {
  vx = 0;
  vy = 0;
  flash = 0;
  hp: number;
  maxHp: number;
  size: number;
  t = Math.random() * 3;
  aiTimer = 1;
  dashX = 0;
  dashY = 0;
  dashing = false;
  removed = false;
  private facingLeft = false;
  anim = new Animator({
    idle: { frames: 2, frameTime: 0.4, loop: true },
    walk: { frames: 3, frameTime: 0.14, loop: true },
    attack: { frames: 2, frameTime: 0.12, loop: true },
    hurt: { frames: 2, frameTime: 0.1, loop: false },
    death: { frames: 4, frameTime: 0.12, loop: false },
  });

  constructor(public kind: EnemyKind, public x: number, public y: number) {
    this.hp = this.maxHp = kind === "blob" ? 3 : kind === "wisp" ? 2 : 4;
    this.size = kind === "rammer" ? 14 : 11;
    {
      this.anim = new Animator({
        idle: { frames: 2, frameTime: 0.4, loop: true },
        walk: { frames: 4, frameTime: 0.14, loop: true },
        attack: { frames: 3, frameTime: 0.55 / 3, loop: false },
        hurt: { frames: 1, frameTime: 0.2, loop: false },
        death: { frames: 3, frameTime: 0.16, loop: false },
      });
    }
  }

  get dead() {
    return this.anim.state === "death";
  }

  update(dt: number, p: Player) {
    this.anim.update(dt);
    updatePhysics(this, dt);
    if (this.dead) {
      if (this.anim.done) this.removed = true;
      return;
    }
    if (this.anim.state === "hurt") {
      if (this.anim.done) this.anim.set("walk");
      return;
    }
    this.t += dt;
    const dx = p.x - this.x, dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    if (dx !== 0) this.facingLeft = dx < 0;

    if (this.kind === "blob") {
      // sakrash: harakat faqat sinus musbat bo'lganda
      const hop = Math.max(0, Math.sin(this.t * 5));
      this.x += (dx / d) * 45 * hop * dt;
      this.y += (dy / d) * 45 * hop * dt;
      this.anim.set(hop > 0 ? "walk" : "idle");
    } else if (this.kind === "wisp") {
      const px_ = -dy / d, py_ = dx / d; // perpendikulyar
      const wave = Math.sin(this.t * 4) * 70;
      this.x += ((dx / d) * 55 + px_ * wave) * dt;
      this.y += ((dy / d) * 55 + py_ * wave) * dt;
      this.anim.set("walk");
    } else {
      this.aiTimer -= dt;
      if (this.dashing) {
        this.x += this.dashX * 160 * dt;
        this.y += this.dashY * 160 * dt;
        this.anim.set("attack");
        if (this.aiTimer <= 0) { this.dashing = false; this.aiTimer = 1.2; }
      } else {
        this.anim.set("idle");
        if (this.aiTimer <= 0) {
          this.dashing = true;
          this.dashX = dx / d;
          this.dashY = dy / d;
          this.aiTimer = 0.55;
        }
      }
    }
    clampToRoom(this);
  }

  render(ctx: CanvasRenderingContext2D) {
    const { state, frame } = this.anim;
    renderSprite(ctx, this.kind === "rammer" ? "skeleton" : this.kind === "blob" ? "slime" : "bat",
      state, frame, this.x, this.kind === "rammer" ? this.y : this.y - 3,
      isFlashing(this) || state === "hurt", this.facingLeft);
  }
}
