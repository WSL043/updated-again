import RiveScript from "rivescript";
import { askCommunityCorpus, normalizePrompt } from "./community";
import philosophyBrain from "./brain/philosophy.rive?raw";
import smalltalkBrain from "./brain/smalltalk.rive?raw";
import updatesBrain from "./brain/updates.rive?raw";

const BRAINS = [smalltalkBrain, updatesBrain, philosophyBrain];
const NO_MATCH = "__UPDATED_AGAIN_NO_MATCH__";
let enginePromise: Promise<RiveScript> | undefined;

function createEngine(): Promise<RiveScript> {
  const engine = new RiveScript({
    utf8: true,
    strict: true,
    errors: {
      replyNotMatched: NO_MATCH,
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
  const projectReply = await engine.reply(userId, message);
  if (projectReply !== NO_MATCH) return projectReply;
  const normalized = normalizePrompt(raw);
  if (/\p{Script=Han}/u.test(raw) && normalized && normalized !== message) {
    const normalizedReply = await engine.reply(userId, normalized);
    if (normalizedReply !== NO_MATCH) return normalizedReply;
  }
  try {
    const communityReply = await askCommunityCorpus(raw);
    if (communityReply) return communityReply;
  } catch {
    // The small project brain remains available if the larger corpus cannot load.
  }
  return /[A-Za-z]/.test(raw)
    ? "I didn't catch that. Try saying it another way?"
    : "我没接住这句。换个说法再问一次？";
}
