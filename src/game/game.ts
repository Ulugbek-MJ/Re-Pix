import { ROOM, applyHit, overlap, px, type Body } from "./animation";
import { Input } from "./input";
import { Player } from "./player";
import { Enemy } from "./enemy";
import { Boss } from "./boss";
import { GAME_VERSION } from "./version";
import { sfx } from "./audio";

const STORAGE_KEY = "pixel-rpg-attempt";
type Phase = "play" | "attempt" | "victory";

/** Butun o'yin holati shu obyektda — React state'da emas. */
export class Game {
  input = new Input();
  player = new Player();
  enemies: Enemy[] = [];
  boss = new Boss();
  attempt = 1;
  phase: Phase = "play";
  paused = false;
  msgTimer = 0;
  private raf = 0;
  private last = 0;
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    this.attempt = saved > 0 ? saved : 1;
    this.reset();
  }

  /** Boshlang'ich holat: dushmanlar qayta, HP to'liq. */
  reset() {
    this.player = new Player();
    this.boss = new Boss();
    this.enemies = [
      new Enemy("blob", 60, 60),
      new Enemy("blob", 260, 160),
      new Enemy("wisp", 260, 50),
      new Enemy("wisp", 50, 150),
      new Enemy("rammer", 80, 110),
      new Enemy("rammer", 240, 110),
    ];
    this.phase = "play";
  }

  /** Pauza faqat jang paytida, o'lim animatsiyasi yoki urinish yozuvida emas. */
  private canPause() {
    return this.phase === "play" && !this.player.dead;
  }

  setPaused(on: boolean) {
    if (on && !this.canPause()) return;
    if (this.paused === on) return;
    this.paused = on;
    if (on) sfx.suspend();
    else sfx.resume();
  }

  /** Urinish sonini o'zgartirmasdan boshidan boshlash. */
  restart() {
    this.reset();
    this.setPaused(false);
  }

  // Pauza tugmalari (xona koordinatalarida)
  private resumeBtn = { x: ROOM.w / 2 - 70, y: ROOM.h / 2 + 12, w: 140, h: 18 };
  private restartBtn = { x: ROOM.w / 2 - 70, y: ROOM.h / 2 + 36, w: 140, h: 18 };

  private onClick = (e: MouseEvent) => {
    if (!this.paused) return;
    const r = this.canvas.getBoundingClientRect();
    // CSS masshtabi -> bufer -> xona koordinatalari
    const bx = ((e.clientX - r.left) / r.width) * this.canvas.width;
    const by = ((e.clientY - r.top) / r.height) * this.canvas.height;
    const scale = Math.min(this.canvas.width / ROOM.w, this.canvas.height / ROOM.h);
    const x = (bx - (this.canvas.width - ROOM.w * scale) / 2) / scale;
    const y = (by - (this.canvas.height - ROOM.h * scale) / 2) / scale;
    const hit = (b: { x: number; y: number; w: number; h: number }) =>
      x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    if (hit(this.resumeBtn)) this.setPaused(false);
    else if (hit(this.restartBtn)) this.restart();
  };

  private onVisibility = () => {
    if (document.hidden) this.setPaused(true);
  };
  private onBlur = () => this.setPaused(true);

  start() {
    this.input.attach();
    this.canvas.addEventListener("click", this.onClick);
    document.addEventListener("visibilitychange", this.onVisibility);
    window.addEventListener("blur", this.onBlur);
    this.last = performance.now();
    const loop = (now: number) => {
      // last har kadrda yangilanadi: pauza vaqti dt ga qo'shilmaydi
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (this.input.consumePause()) this.setPaused(!this.paused);
      if (this.paused) {
        // pauzada bosilgan hujum/Enter navbatlari tozalanadi
        this.input.consumeAttack();
        this.input.consumeEnter();
      } else {
        this.update(dt);
      }
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.input.detach();
    this.canvas.removeEventListener("click", this.onClick);
    document.removeEventListener("visibilitychange", this.onVisibility);
    window.removeEventListener("blur", this.onBlur);
    sfx.resume();
  }

  update(dt: number) {
    if (this.phase === "attempt") {
      this.msgTimer -= dt;
      if (this.msgTimer <= 0) this.reset();
      return;
    }
    if (this.phase === "victory") {
      this.boss.update(dt, this.player);
      if (this.input.consumeEnter()) {
        this.attempt = 1;
        localStorage.setItem(STORAGE_KEY, "1");
        this.reset();
      }
      return;
    }

    const p = this.player;
    p.update(dt, this.input);
    for (const e of this.enemies) e.update(dt, p);
    this.boss.update(dt, p);
    this.enemies = this.enemies.filter((e) => !e.removed);

    // o'yinchi hujumi
    const box = p.attackBox();
    if (box) {
      const targets: Body[] = [...this.enemies.filter((e) => !e.dead)];
      if (!this.boss.dead) targets.push(this.boss);
      for (const t of targets) {
        if (!p.hitSet.has(t) && overlap(box, t)) {
          p.hitSet.add(t);
          sfx.hit();
          applyHit(t, 1, p.x, p.y, t === this.boss ? 120 : 220);
        }
      }
    }

    // kontakt zarar
    if (!p.dead) {
      for (const e of this.enemies) if (!e.dead && overlap(p, e)) p.takeHit(1, e.x, e.y, 180);
      if (!this.boss.dead && overlap(p, this.boss)) p.takeHit(1, this.boss.x, this.boss.y, 220);
    }

    // o'lim -> urinish
    if (p.dead && p.anim.done) {
      this.attempt++;
      localStorage.setItem(STORAGE_KEY, String(this.attempt));
      this.phase = "attempt";
      this.msgTimer = 2;
    }
    if (this.boss.dead && this.boss.anim.done) {
      this.phase = "victory";
      sfx.victory();
    }
  }

  render() {
    const c = this.ctx;
    // Fit the unchanged logical room uniformly inside the drawing buffer.
    c.clearRect(0, 0, c.canvas.width, c.canvas.height);
    const scale = Math.min(c.canvas.width / ROOM.w, c.canvas.height / ROOM.h);
    c.save();
    c.translate((c.canvas.width - ROOM.w * scale) / 2, (c.canvas.height - ROOM.h * scale) / 2);
    c.scale(scale, scale);
    // pol
    px(c, "#1b1426", 0, 0, ROOM.w, ROOM.h);
    for (let y = ROOM.wall; y < ROOM.h - ROOM.wall; y += 16)
      for (let x = ROOM.wall; x < ROOM.w - ROOM.wall; x += 16)
        px(c, ((x + y) / 16) % 2 ? "#3a2f4a" : "#342a43", x, y, 16, 16);
    // devorlar
    px(c, "#5c4a6e", 0, 0, ROOM.w, ROOM.wall);
    px(c, "#4a3b59", 0, ROOM.h - ROOM.wall, ROOM.w, ROOM.wall);
    px(c, "#4a3b59", 0, 0, ROOM.wall, ROOM.h);
    px(c, "#4a3b59", ROOM.w - ROOM.wall, 0, ROOM.wall, ROOM.h);
    for (let x = 0; x < ROOM.w; x += 16) px(c, "#6e5a82", x, 2, 14, 5);

    // chuqurlik bo'yicha tartib
    const all: { y: number; r: () => void }[] = [
      ...this.enemies.map((e) => ({ y: e.y, r: () => e.render(c) })),
      { y: this.boss.y, r: () => this.boss.render(c) },
    ];
    if (this.phase !== "attempt" || !this.player.dead) all.push({ y: this.player.y, r: () => this.player.render(c) });
    all.sort((a, b) => a.y - b.y).forEach((o) => o.r());

    this.renderHud();

    if (this.paused) {
      px(c, "rgba(0,0,0,0.6)", 0, 0, ROOM.w, ROOM.h);
      this.text("PAUZA", ROOM.w / 2, ROOM.h / 2 - 12, 18, "#ffcc33");
      for (const [b, label] of [
        [this.resumeBtn, "Davom etish: Esc"],
        [this.restartBtn, "Qaytadan boshlash"],
      ] as const) {
        px(c, "#ffcc33", b.x, b.y, b.w, b.h);
        px(c, "#2a1f38", b.x + 1, b.y + 1, b.w - 2, b.h - 2);
        this.text(label, ROOM.w / 2, b.y + 12, 7, "#e0d6ee");
      }
    }
    if (this.phase === "attempt") {
      px(c, "rgba(0,0,0,0.75)", 0, 0, ROOM.w, ROOM.h);
      this.text(`Urinish №${this.attempt}`, ROOM.w / 2, ROOM.h / 2, 14, "#ffcc33");
    }
    if (this.phase === "victory") {
      px(c, "rgba(10,5,20,0.8)", 0, 0, ROOM.w, ROOM.h);
      this.text("G'ALABA!", ROOM.w / 2, 95, 20, "#ffcc33");
      this.text(`${this.attempt}-urinishda yutdingiz`, ROOM.w / 2, 130, 8, "#ffffff");
      this.text("Enter — qaytadan", ROOM.w / 2, 165, 7, "#b8a8cc");
      this.text(`v${GAME_VERSION}`, ROOM.w - 34, ROOM.h - 8, 6, "rgba(255,255,255,0.45)");
    }
    c.restore();
  }

  private renderHud() {
    const c = this.ctx;
    for (let i = 0; i < this.player.maxHp; i++) {
      const on = i < this.player.hp;
      px(c, on ? "#ff4d6d" : "#3b2a3a", 4 + i * 10, 4, 8, 7);
      px(c, on ? "#ff4d6d" : "#3b2a3a", 5 + i * 10, 11, 6, 1);
    }
    const bw = 100;
    px(c, "#000", ROOM.w - bw - 6, 4, bw + 2, 7);
    px(c, "#8e44ad", ROOM.w - bw - 5, 5, (bw * Math.max(0, this.boss.hp)) / this.boss.maxHp, 5);
    this.text(`URINISH ${this.attempt}`, ROOM.w / 2, 11, 7, "#e0d6ee");
  }

  private text(s: string, x: number, y: number, size: number, color: string) {
    const c = this.ctx;
    c.font = `${size}px "Press Start 2P", monospace`;
    c.textAlign = "center";
    c.fillStyle = "#000";
    c.fillText(s, x + 1, y + 1);
    c.fillStyle = color;
    c.fillText(s, x, y);
  }
}
