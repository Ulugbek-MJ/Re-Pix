import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MECHANICS = `Sen "Piksel Qal'a" retro RPG o'yinining jang murabbiyisan. Faqat o'zbek tilida, qisqa (3-5 punkt, jami 90 so'zdan kam), aniq va amaliy maslahat ber. Faqat quyidagi mexanikaga tayan, mavjud bo'lmagan narsalarni (inventar, sehr, dash, qalqon, iksir, daraja) o'ylab topma.

O'YINCHI (ritsar): 6 yurak. Tezlik 90. WASD/strelkalar — yurish, Space — qilich zarbasi (oldinga qisqa yoy, 0.24s), cooldown 0.4s. Zarba yegandan so'ng 0.8s daxlsizlik (miltillaydi). Zarba tekkan dushman ozgina itariladi. Escape — pauza.
DUSHMANLAR:
- Slime (yashil shilimshiq): sakrab-sakrab quvadi; sakrashlar orasida to'xtaydi — shu paytda urish qulay. Tegsa 1 zarar.
- Ko'rshapalak (binafsha ruh): to'lqinsimon (sinus) uchib yaqinlashadi, yo'nalishi bashorat qilish qiyin; yonga qadam tashlab kutib, yaqin kelganda urish kerak. Tegsa 1 zarar.
- Skelet jangchi (qo'chqor turi): to'xtab nishon oladi, so'ng to'g'ri chiziqda tez yuguradi (dash). Nishon olayotganda chetga chiqib, dashdan keyin to'xtaganida orqasidan urish kerak. Tegsa 1 zarar.
BOSS (iblis): 25 jon, katta, tegsa zarar. Hujumi: 0.7s tayyorgarlik (bolta ko'tariladi, qizil doira ko'rinadi), so'ng atrofga radius 42 bo'lgan zarba — 2 yurak zarar va qattiq itarish. Joni yarmidan kamayganda tezlashadi. Strategiya: qizil doira paydo bo'lganda darhol radiusdan chiqib ketish, zarbadan keyin qaytib 1-2 marta urish va yana uzoqlashish. Avval kichik dushmanlarni tozalash foydali.
O'lsang — urinish soni oshadi va hammasi qayta boshlanadi.`;

export const getCombatTip = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ enemy: z.enum(["slime", "bat", "skeleton", "boss"]), problem: z.string().max(500) }).parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "AI sozlanmagan." };
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const names = { slime: "Slime", bat: "Ko'rshapalak", skeleton: "Skelet jangchi", boss: "Boss (iblis)" };
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system: MECHANICS,
        prompt: `Qiynalayotgan raqib: ${names[data.enemy]}.\nO'yinchi muammosi: ${data.problem.trim() || "(izoh yo'q)"}`,
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const text = (await result.text).trim();
      if (!text) return { ok: false as const, error: "Maslahat olinmadi." };
      return { ok: true as const, text };
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      const msg =
        status === 429
          ? "Juda ko'p so'rov. Birozdan so'ng urinib ko'ring."
          : status === 402
            ? "AI kreditlari tugadi."
            : "Maslahat olishda xato yuz berdi.";
      return { ok: false as const, error: msg };
    }
  });
