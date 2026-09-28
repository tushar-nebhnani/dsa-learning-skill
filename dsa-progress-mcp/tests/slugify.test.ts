import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { slugify } from "../src/tools/record-solved-problem.js";

describe("slugify", () => {
  it("ignores case, spacing and punctuation", () => {
    assert.equal(slugify("Two Sum II - Input Array Is Sorted"), "two-sum-ii-input-array-is-sorted");
    assert.equal(slugify("  two  sum! "), "two-sum");
  });

  it("keeps symbols that change the meaning", () => {
    assert.equal(slugify("C++ Tricks"), "c-plus-plus-tricks");
    assert.notEqual(slugify("C++ Tricks"), slugify("C Tricks"));
    assert.equal(slugify("C# Basics"), "c-sharp-basics");
  });

  it("removes accents instead of dropping the letter", () => {
    assert.equal(slugify("Café Problem"), "cafe-problem");
  });

  it("keeps letters from any script", () => {
    assert.equal(slugify("两数之和"), "两数之和");
    assert.equal(slugify("Сумма двух"), "сумма-двух");
  });

  it("returns an empty slug when there is nothing to keep", () => {
    assert.equal(slugify("?!"), "");
  });
});
