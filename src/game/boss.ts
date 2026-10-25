import { Animator, Body, updatePhysics, isFlashing } from "./animation";
import type { Player } from "./player";
import { renderSprite } from "./sprites";

export const BOSS_MAX_HP = 25;
const SLAM_WINDUP = 0.7;
const SLAM_RADIUS = 42;

export class Boss implements Body {
  x = 160;
  y = 70;
  size = 28;
  vx = 0;
  vy = 0;
  hp = BOSS_MAX_HP;
  maxHp = BOSS_MAX_HP;
  flash = 0;
  slamTimer = 3;
  windup = 0;
  /** Zarba to'lqini vizual effekti */
  shock = 0;
  private facingLeft = false;
  anim = new Animator({
    idle: { frames: 2, frameTime: 0.45, loop: true },
    walk: { frames: 4, frameTime: 0.18, loop: true },
    attack: { frames: 3, frameTime: SLAM_WINDUP / 3, loop: false },
    hurt: { frames: 1, frameTime: 0.16, loop: false },
    death: { frames: 3, frameTime: 1.4 / 3, loop: false },
  });

  get dead() {
    return this.anim.state === "death";
  }

  /** Boss kuchli itarishga chidamliroq */
  update(dt: number, p: Player) {
    this.anim.update(dt);
    this.vx *= 0.9;
    this.vy *= 0.9;
    updatePhysics(this, dt);
    if (this.shock > 0) this.shock -= dt;
    if (this.dead) return;

    if (this.windup > 0) {
      this.windup -= dt;
      if (this.windup <= 0) {
        this.shock = 0.3;
        if (Math.hypot(p.x - this.x, p.y - this.y) < SLAM_RADIUS + p.size / 2) p.takeHit(2, this.x, this.y, 260);
        this.slamTimer = 2.2 + Math.random() * 1.2;
        this.anim.set("walk");
      }
      return;
    }
    if (this.anim.state === "hurt" && !this.anim.done) return;

    this.slamTimer -= dt;
    const dx = p.x - this.x, dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    if (dx !== 0) this.facingLeft = dx < 0;
    const speed = this.hp < this.maxHp / 2 ? 42 : 30;
    this.x += (dx / d) * speed * dt;
    this.y += (dy / d) * speed * dt;
    this.anim.set("walk");
    if (this.slamTimer <= 0 && d < 90) {
      this.windup = SLAM_WINDUP;
      this.anim.set("attack", true);
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    const { state, frame } = this.anim;

    if (this.windup > 0) {
      ctx.strokeStyle = `rgba(255,60,60,${0.4 + 0.4 * Math.sin(this.windup * 30)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, SLAM_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.shock > 0) {
      ctx.fillStyle = `rgba(255,180,80,${this.shock * 2})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, SLAM_RADIUS * (1.3 - this.shock), 0, Math.PI * 2);
      ctx.fill();
    }

    renderSprite(ctx, "demon", state, frame, this.x, this.y,
      isFlashing(this) || state === "hurt", this.facingLeft);
  }
}
