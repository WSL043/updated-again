import RiveScript from "rivescript";
import philosophyBrain from "./brain/philosophy.rive?raw";
import smalltalkBrain from "./brain/smalltalk.rive?raw";
import updatesBrain from "./brain/updates.rive?raw";

const BRAINS = [smalltalkBrain, updatesBrain, philosophyBrain];
let enginePromise: Promise<RiveScript> | undefined;

function createEngine(): Promise<RiveScript> {
  const engine = new RiveScript({
    utf8: true,
    strict: true,
    errors: {
      replyNotMatched: "我没有命中这句话。可以问我更新、回滚、Remotion、Puter，或者让我给一个更新理由。",
      replyNotFound: "这条规则暂时没有回答。",
    },
  });

  for (const brain of BRAINS) {
    const errors: string[] = [];
    engine.stream(brain, (error) => errors.push(error));
    if (errors.length) return Promise.reject(new Error(errors.join("\n")));
  }
  engine.sortReplies();
  return Promise.resolve(engine);
}

export async function askLegacyBrain(userId: string, prompt: string, context: string): Promise<string> {
  enginePromise ??= createEngine();
  const engine = await enginePromise;
  engine.setVariable("project_context", context);
  const raw = prompt.trim().slice(0, 600);
  const message = raw === "我叫什么" ? raw : raw.replace(/^我叫\s*/, "我叫 ");
  return engine.reply(userId, message);
}

export const LEGACY_BRAIN_FACTS = {
  engine: "RiveScript 2.2.1",
  brainFiles: BRAINS.length,
  authoredReplyPaths: 130,
} as const;
