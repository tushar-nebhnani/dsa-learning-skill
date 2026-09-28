import { z } from "zod";
import { ComfortLevel, Difficulty, LearningMode, Result } from "../generated/prisma/enums.js";

/** Longest title, language or topic accepted; keeps slugs and indexed values well under Postgres' limits. */
const MAX_NAME_LENGTH = 200;

/** A short, single-line name: trimmed, with runs of whitespace collapsed. */
const name = () =>
  z
    .string()
    .overwrite((value) => value.trim().replace(/\s+/g, " "))
    .min(1)
    .max(MAX_NAME_LENGTH);

/** An enum that also accepts "Easy", " BEGINNER " or "not solved", since models often write them that way. */
const looseEnum = <T extends Record<string, string>>(values: T) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase().replace(/[\s-]+/g, "_") : value),
    z.enum(values),
  );

/** The saved preferences, as returned by get_learner_profile and save_learner_preferences. */
const learnerPreferencesSchema = z.object({
  preferredLanguage: z.string().nullable(),
  languageComfort: z.enum(ComfortLevel).nullable(),
  dsaComfort: z.enum(ComfortLevel).nullable(),
  learningMode: z.enum(LearningMode).nullable(),
  currentTopic: z.string().nullable(),
});

// get_learner_profile

export const learnerProfileSchema = {
  name: z.string().nullable(),
  onboarded: z.boolean(),
  totalSolved: z.number().int(),
  revisitsDue: z.number().int(),
  preferences: learnerPreferencesSchema,
};

// save_learner_preferences

export const preferencesSchema = {
  preferredLanguage: name()
    .nullable()
    .optional()
    .describe("The language the learner practises in, e.g. Python."),
  languageComfort: looseEnum(ComfortLevel)
    .nullable()
    .optional()
    .describe("How comfortable the learner is with that language."),
  dsaComfort: looseEnum(ComfortLevel)
    .nullable()
    .optional()
    .describe("How comfortable the learner is with DSA."),
  learningMode: looseEnum(LearningMode)
    .nullable()
    .optional()
    .describe(
      "roadmap = follow the roadmap; topic = stay on a topic the learner chose.",
    ),
  currentTopic: name()
    .nullable()
    .optional()
    .describe("The topic being practised now, e.g. Sliding Window."),
};

export const savedPreferencesSchema = {
  onboarded: z.boolean(),
  preferences: learnerPreferencesSchema,
};

// list_solved_problems

export const solvedProblemsSchema = {
  topic: z.string(),
  count: z.number().int(),
  problems: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      difficulty: z.enum(Difficulty),
      language: z.string(),
      result: z.enum(Result),
      revisit: z.boolean(),
      firstSolvedAt: z.string(),
      lastSolvedAt: z.string(),
    }),
  ),
  solvedInOtherTopics: z.array(z.object({ slug: z.string(), title: z.string(), topic: z.string() })),
};

// record_solved_problem

export const recordSchema = {
  title: name().describe("The problem's title. Use exactly the same title when recording a revisit."),
  difficulty: looseEnum(Difficulty),
  language: name().describe("The language the learner solved it in."),
  result: looseEnum(Result).describe(
    "accepted if every test passed; partial if some tests passed; not_solved if the learner did not reach a working solution.",
  ),
  documentationMd: z.string().trim().min(1).describe("The full Stage 11 documentation in Markdown."),
  // Required rather than defaulted, so a revisit is never cleared just because the field was left out.
  revisit: z
    .boolean()
    .describe(
      "Required. true schedules a revisit 7 days from now; false clears any revisit already scheduled for this problem. " +
        "When recording a revisit, pass true again if the learner still needs another one.",
    ),
};

export const recordedSchema = {
  slug: z.string(),
  title: z.string(),
  topic: z.string(),
  difficulty: z.enum(Difficulty),
  language: z.string(),
  result: z.enum(Result),
  revisit: z.boolean(),
  revisitAt: z.string().nullable(),
  firstSolvedAt: z.string(),
  lastSolvedAt: z.string(),
};

// list_problems_to_revisit

export const revisitsSchema = {
  count: z.number().int(),
  problems: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      topic: z.string(),
      difficulty: z.enum(Difficulty),
      result: z.enum(Result),
      revisitAt: z.string().nullable(),
      due: z.boolean(),
      lastSolvedAt: z.string(),
    }),
  ),
};
