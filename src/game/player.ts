import { Animator, Body, updatePhysics, isFlashing } from "./animation";
import type { Input } from "./input";
import { renderSprite } from "./sprites";
import { sfx } from "./audio";

export const PLAYER_MAX_HP = 6;
const SPEED = 90;
const ATTACK_TIME = 0.24;
const ATTACK_COOLDOWN = 0.4;
const HURT_TIME = 0.25;
const INVULN = 0.8;

export class Player implements Body {
  x = 160;
  y = 190;
  size = 12;
  vx = 0;
  vy = 0;
  hp = PLAYER_MAX_HP;
  maxHp = PLAYER_MAX_HP;
  flash = 0;
  fx = 0;
  fy = -1;
  attackTimer = 0;
  cooldown = 0;
  hurtTimer = 0;
  invuln = 0;
  /** Joriy hujumda allaqachon urilganlar */
  hitSet = new Set<Body>();
  anim = new Animator({
    idle: { frames: 2, frameTime: 0.5, loop: true },
    walk: { frames: 4, frameTime: 0.12, loop: true },
    attack: { frames: 3, frameTime: ATTACK_TIME / 3, loop: false },
    hurt: { frames: 1, frameTime: HURT_TIME, loop: false },
    death: { frames: 3, frameTime: 1 / 3, loop: false },
  });

  get dead() {
    return this.anim.state === "death";
  }

  takeHit(dmg: number, fromX: number, fromY: number, force: number) {
    if (this.invuln > 0 || this.dead) return;
    this.hp -= dmg;
    if (this.hp <= 0) sfx.death();
    else sfx.hit();
    this.flash = 0.4;
    this.invuln = INVULN;
    const dx = this.x - fromX, dy = this.y - fromY;
    const l = Math.hypot(dx, dy) || 1;
    this.vx = (dx / l) * force;
    this.vy = (dy / l) * force;
    this.attackTimer = 0;
    if (this.hp <= 0) this.anim.set("death", true);
    else {
      this.hurtTimer = HURT_TIME;
      this.anim.set("hurt", true);
    }
  }

  /** Hujum zonasi (faqat hujum vaqtida). */
  attackBox(): Body | null {
    if (this.attackTimer <= 0) return null;
    return { x: this.x + this.fx * 12, y: this.y + this.fy * 12, size: 16 } as Body;
  }

  update(dt: number, input: Input) {
    this.anim.update(dt);
    updatePhysics(this, dt);
    if (this.dead) return;
    this.cooldown -= dt;
    this.invuln -= dt;
    this.hurtTimer -= dt;
    if (this.attackTimer > 0) this.attackTimer -= dt;

    const wantAttack = input.consumeAttack();
    const { x, y } = input.axis();

    if (wantAttack && this.cooldown <= 0 && this.hurtTimer <= 0) {
      this.attackTimer = ATTACK_TIME;
      this.cooldown = ATTACK_COOLDOWN;
      this.hitSet.clear();
      sfx.attack();
      this.anim.set("attack", true);
    }

    const busy = this.attackTimer > 0 || this.hurtTimer > 0;
    if (!busy) {
      if (x || y) {
        const l = Math.hypot(x, y);
        this.x += (x / l) * SPEED * dt;
        this.y += (y / l) * SPEED * dt;
        if (Math.abs(x) >= Math.abs(y)) { this.fx = Math.sign(x); this.fy = 0; }
        else { this.fx = 0; this.fy = Math.sign(y); }
        this.anim.set("walk");
      } else this.anim.set("idle");
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    renderSprite(ctx, "knight", this.anim.state, this.anim.frame, this.x, this.y,
      isFlashing(this) || this.anim.state === "hurt", this.fx < 0, this.fy < 0);
  }
}
