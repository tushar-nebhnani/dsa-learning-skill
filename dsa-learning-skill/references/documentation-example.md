# Documentation Example

This is the reference format for **Stage 11: Documentation & PDF Generation**. The Feedback section holds the feedback from Stage 10, and this document is turned into the revision PDF, so keep the same headings, in the same order, for every problem.

Rules for filling it in:

- Document every stage, but keep each one short: what the learner concluded, not the whole conversation.
- Record the learner's mistakes in every stage where they happened. Each mistake gets three parts: **what they said or wrote**, **why it was wrong**, and **how they fixed it**.
- Record only the learner's own reasoning and code. Do not add approaches or code the learner did not reach themselves.
- If a stage had no mistakes, write `No mistakes.` Do not leave a heading empty.
- If a stage was repeated (for example Stage 8 sent the learner back to Stage 4), document both passes and label them `Pass 1` and `Pass 2`.
- If the problem was not found on any DSA platform in Stage 9, write `Local test cases` as the Platform.

The example below is a filled-in document for one problem.

---

# Longest Substring Without Repeating Characters

| Field            | Value                                                                   |
| ---------------- | ----------------------------------------------------------------------- |
| Language         | Python                                                                  |
| Platform         | LeetCode #3                                                             |
| Date solved      | 2026-09-27                                                              |
| Final result     | Accepted                                                                |
| Final complexity | Time O(n), Space O(min(n, k)), where k is the size of the character set |

## Stage 1: Problem

**Topic:** Sliding Window

**Problem Statement:** Given a string `s`, find the length of the longest substring that contains no repeating characters.

**Input:** A string `s`, `0 <= len(s) <= 5 * 10^4`, made of English letters, digits, symbols and spaces.

**Output:** An integer, the length of the longest valid substring.

**Examples:**

| Input        | Output | Reason                                               |
| ------------ | ------ | ---------------------------------------------------- |
| `"abcabcbb"` | `3`    | `"abc"`                                              |
| `"bbbbb"`    | `1`    | `"b"`                                                |
| `"pwwkew"`   | `3`    | `"wke"` (`"pwke"` is a subsequence, not a substring) |

**Real Life Application:** Detecting the longest run of unique events in a stream (for example, unique page visits in a session). A naive approach re-checks every possible window, which is O(n²) or worse and does not keep up with a live stream.

**Learner's questions:**

- Does a space count as a character? Yes.
- What is the answer for an empty string? `0`.

## Stage 2: Intuition

**Learner's final explanation:** "Find the longest continuous piece of the string where every character appears only once."

**Test cases worked by the learner:**

| Input    | Learner's answer       | Correct |
| -------- | ---------------------- | ------- |
| `"dvdf"` | `3` (`"vdf"`)          | Yes     |
| `"abba"` | `2` (`"ab"` or `"ba"`) | Yes     |
| `""`     | `0`                    | Yes     |

**Mistakes:**

1. **Said:** For `"pwwkew"` the answer is `4` (`"pwke"`).
   **Why wrong:** Treated a substring as a subsequence. A substring must be contiguous.
   **Fixed by:** Re-reading the definition after being asked whether `"pwke"` appears as-is inside `"pwwkew"`.

## Stage 3: Technical Approach

**Data structure:** Hash set holding the characters in the current window. O(1) average lookup for "is this character already in the window?".

**Rejected alternative:** A plain list. Checking membership in a list is O(window size), which turns the solution back into O(n²).

**Control flow:** One loop moving the right edge forward. When the new character is already in the window, shrink from the left until it is not.

**State tracked:** `left`, `right`, `window` (set), `best`.

**Mistakes:** No mistakes.

## Stage 4: Pseudo Code

### Pass 1 (set-based window)

```
left = 0, best = 0, window = empty set
for right from 0 to n - 1:
    while s[right] is in window:
        remove s[left] from window
        left = left + 1
    add s[right] to window
    best = max(best, right - left + 1)
return best
```

### Pass 2 (after Stage 8: jump using last seen index)

```
left = 0, best = 0, last_seen = empty map
for right from 0 to n - 1:
    if s[right] is in last_seen and last_seen[s[right]] >= left:
        left = last_seen[s[right]] + 1
    last_seen[s[right]] = right
    best = max(best, right - left + 1)
return best
```

## Stage 5: Dry Run & Debugging

**Bugs found:**

1. **Pass 1. Wrote:** `best = max(best, right - left)`
   **Test case used:** `"bbbbb"`. Expected `1`, pseudo code returned `0`.
   **Why wrong:** The window `[left, right]` is inclusive at both ends, so its length is `right - left + 1`.
   **Fixed by:** Dry running `right = 0, left = 0` and noticing a one-character window was counted as length `0`.

2. **Pass 2. Wrote:** `left = last_seen[s[right]] + 1` with no check against the current `left`.
   **Test case used:** `"abba"`. Expected `2`, pseudo code returned `3`.
   **Why wrong:** At `right = 3` (`'a'`), `last_seen['a'] = 0`, so `left` moved backwards from `2` to `1` and the window `"bba"` was counted, which contains a repeat.
   **Fixed by:** Tracing `left` at every iteration and seeing it decrease. Added the condition `last_seen[s[right]] >= left` so `left` only moves forward.

**Dry run of the final pseudo code on `"abba"`:**

| right | char | last_seen before | left | window | best |
| ----- | ---- | ---------------- | ---- | ------ | ---- |
| 0     | a    | {}               | 0    | "a"    | 1    |
| 1     | b    | {a:0}            | 0    | "ab"   | 2    |
| 2     | b    | {a:0, b:1}       | 2    | "b"    | 2    |
| 3     | a    | {a:0, b:2}       | 2    | "ba"   | 2    |

## Stage 6: Code

```python
def length_of_longest_substring(s: str) -> int:
    left = 0
    best = 0
    last_seen = {}
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best
```

**Mistakes:**

1. **Wrote:** `last_seen[ch] = right` before the `if` check.
   **Why wrong:** The check then always saw the current index, so `left` jumped past `right` and every window had length `0`.
   **Fixed by:** Sent back to Stage 5, dry ran `"ab"`, and saw `left = 1` at `right = 0`. Moved the update below the check.

## Stage 7: Complexity Analysis

### Pass 1 (set-based window)

**Time: O(n).** Each character is added to the window once and removed at most once, so the inner `while` loop does at most n removals across the whole run.

**Space: O(min(n, k)).** The set holds at most one entry per distinct character.

**Mistakes:**

1. **Said:** "The inner `while` loop makes it O(n²)."
   **Why wrong:** Each character is added to the window once and removed at most once, so the total work across all iterations is at most 2n.
   **Fixed by:** Counting how many times `left` can move in total over the whole run.

### Pass 2 (last seen index)

**Time: O(n).** The loop runs once per character. The map lookup and update are O(1) on average. `left` only jumps; there is no inner loop.

**Space: O(min(n, k)).** `last_seen` holds at most one entry per distinct character, which is capped by both the string length `n` and the character set size `k`.

**Mistakes:**

1. **Said:** "Space is O(n)."
   **Why wrong:** Not tight. The map can never hold more entries than there are distinct characters, so for a fixed character set (like ASCII, k = 128) it is effectively O(1).
   **Fixed by:** Answering "what is the most entries the map can have if `s` is one million characters of only `a`-`z`?"

## Stage 8: Optimisation

**Slowest section (Pass 1):** The inner `while` loop that removes characters one at a time.

**Improvement:** Store the last index of each character and jump `left` directly past the duplicate instead of stepping one character at a time.

**Result:** Asymptotic complexity stays O(n), but the number of operations drops from up to 2n to exactly n. Sent back to Stage 4 for Pass 2.

**Mistakes:** No mistakes.

## Stage 9: Submission

| Attempt | Result   | Failing input | Cause |
| ------- | -------- | ------------- | ----- |
| 1       | Accepted | —             | —     |

## Mistakes Summary

| #   | Stage | Mistake                              | Lesson                                                                       |
| --- | ----- | ------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | 2     | Treated a substring as a subsequence | Substring and subarray mean contiguous. Check the definition before solving. |
| 2   | 5     | Window length `right - left`         | For an inclusive window `[left, right]`, length is `right - left + 1`.       |
| 3   | 5     | `left` could move backwards          | In sliding window, `left` must never decrease. Guard every jump.             |
| 4   | 6     | Updated the map before reading it    | Read old state first, then write new state.                                  |
| 5   | 7     | Assumed a nested `while` means O(n²) | Count total pointer moves across the whole run, not per iteration.           |
| 6   | 7     | Gave a loose space bound             | State the tightest bound, including limits from the input's alphabet.        |

## Feedback

- **Rushed the problem definition.** The substring/subsequence mix-up in Stage 2 would have produced a wrong algorithm. Before answering, underline the key terms in the problem statement.
- **Off-by-one errors on window size.** Before writing any length formula, test it on a window of size 1.
- **Optimising introduced a new bug.** The jump in Pass 2 was faster but broke the "left only moves forward" rule. After any optimisation, re-run the edge cases that broke earlier versions (here, `"abba"`).
- **Order of operations in code.** The map update was in the right place in the pseudo code but moved in the code. Translate pseudo code line by line.
- **Strength:** Complexity reasoning improved quickly once asked to count total pointer moves. Use that approach on every two-pointer or sliding window problem.

## Revision Checklist

- [ ] Can I explain why a substring must be contiguous?
- [ ] Can I say why the set-based version is O(n) and not O(n²)?
- [ ] Can I dry run `"abba"` on the final code without looking?
- [ ] Can I explain why `last_seen[ch] >= left` is needed?
