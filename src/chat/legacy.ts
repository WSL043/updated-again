import RiveScript from "rivescript";
import { askCommunityCorpus, COMMUNITY_PAIR_COUNT } from "./community";
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
  try {
    const communityReply = await askCommunityCorpus(raw);
    if (communityReply) return communityReply;
  } catch {
    // The small project brain remains available if the larger corpus cannot load.
  }
  return /[A-Za-z]/.test(raw)
    ? "I couldn't find a good local reply. Try another wording, or ask about updates, rollback, Remotion, or Puter."
    : "这句没找到合适的本地回答。可以换个说法，或问我更新、回滚、Remotion 和 Puter。";
}

export const LEGACY_BRAIN_FACTS = {
  engine: "RiveScript 2.2.1",
  brainFiles: BRAINS.length,
  authoredReplyPaths: 130 + COMMUNITY_PAIR_COUNT,
} as const;
