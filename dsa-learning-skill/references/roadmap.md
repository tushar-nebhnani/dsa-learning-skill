# DSA Roadmap

The topic order used when `learningMode` is `roadmap`. The roadmap is grouped into sections by data structure. Each section starts with the basics of that data structure, then moves through the patterns built on it.

## How to use this roadmap

- Each numbered item is one topic. Save its **bold name** exactly as written as `currentTopic`, so that problems are always filed under the same name.
- For a new learner, start at topic 1. Otherwise, continue from the learner's `currentTopic`.
- **Moving on:** move to the next topic once the learner has solved **3 problems** in the current topic with `result: accepted`, and at least one of them was `medium` or `hard`. Count only the `problems` returned by `list_solved_problems`. The learner may also ask to move on earlier, or to stay longer.
- If the learner's `dsaComfort` is `intermediate` or `advanced`, they may skip a topic they already know well, but only if they ask to.
- Within a topic, start with an `easy` problem for a `beginner` and a `medium` problem otherwise. Raise the difficulty after an `accepted` result, and keep it the same after a `partial` or `not_solved` result.

## Section 1: Arrays

1. **Array Basics**: traversal, in-place updates, swapping and reversing, and counting with a single pass.
2. **Prefix Sum**: running totals and range-sum queries, including prefix sums combined with a hash map (subarray sum equals k).
3. **Two Pointers**: pointers moving toward each other, or in the same direction, over a sorted or partitioned array.
4. **Sliding Window**: fixed-size and variable-size windows over contiguous subarrays.
5. **Kadane's Algorithm**: maximum subarray, and its variants such as maximum product and circular subarray.
6. **Sorting & Intervals**: using sorting as the key step, then merging, inserting and overlapping intervals.
7. **Cyclic Sort**: placing values in the range 1 to n at their own index to find missing and duplicate numbers.
8. **Matrix Traversal**: 2D arrays, spiral and diagonal order, rotating a matrix, and searching a sorted matrix.

## Section 2: Hashing

9. **Hash Map & Hash Set**: frequency counting, lookups, and checking for duplicates.
10. **Hashing with Arrays**: two sum, grouping (such as anagrams), and longest consecutive sequence.

## Section 3: Strings

11. **String Basics**: traversal, building strings efficiently, and palindromes.
12. **String Two Pointers & Windows**: the Two Pointers and Sliding Window patterns applied to strings.
13. **String Matching**: substring search, including the prefix function (KMP) and rolling hash.

## Section 4: Binary Search

14. **Binary Search Basics**: searching a sorted array, and finding the lower and upper bounds.
15. **Binary Search on Modified Arrays**: rotated sorted arrays, peak elements, and unknown sizes.
16. **Binary Search on Answer**: searching over the range of possible answers (for example, minimum capacity or maximum distance).

## Section 5: Linked Lists

17. **Linked List Basics**: traversal, insertion, deletion, and dummy head nodes.
18. **Fast & Slow Pointers**: middle of a list, cycle detection, and the start of a cycle.
19. **In-place Reversal**: reversing a whole list, a sublist, or k nodes at a time.
20. **Merging Lists**: merging two sorted lists, and splitting and reordering lists.

## Section 6: Stacks & Queues

21. **Stack Basics**: matching brackets, evaluating expressions, and a min stack.
22. **Monotonic Stack**: next greater or smaller element, and the largest rectangle in a histogram.
23. **Queue & Deque**: queue implementations, and queues built from stacks.
24. **Monotonic Deque**: sliding window maximum and minimum.

## Section 7: Recursion & Backtracking

25. **Recursion Basics**: base cases, the call stack, and recursion on arrays and strings.
26. **Subsets & Combinations**: generating subsets, combinations, and combination sum.
27. **Permutations**: generating permutations, with and without duplicates.
28. **Constraint Backtracking**: N-Queens, Sudoku, and word search in a grid.

## Section 8: Trees

29. **Tree Traversals (DFS)**: preorder, inorder, and postorder traversal, both recursive and iterative.
30. **Tree BFS**: level-order traversal, and views of a tree (right side, zigzag).
31. **Tree Path Problems**: height, diameter, path sums, and the lowest common ancestor.
32. **Binary Search Trees**: search, insertion, validation, and the kth smallest element.

## Section 9: Heaps

33. **Heap Basics**: how a heap works, and using a priority queue.
34. **Top K Elements**: the kth largest element, the k most frequent elements, and the k closest points.
35. **Two Heaps**: the median of a data stream.
36. **K-way Merge**: merging k sorted lists or arrays.

## Section 10: Graphs

37. **Graph Traversal (BFS & DFS)**: adjacency lists, connected components, and flood fill on grids.
38. **Topological Sort**: course schedules and dependency ordering.
39. **Union Find**: disjoint sets, and detecting cycles in undirected graphs.
40. **Shortest Paths**: BFS on unweighted graphs, Dijkstra, and Bellman-Ford.
41. **Minimum Spanning Tree**: Kruskal and Prim.

## Section 11: Greedy

42. **Greedy Basics**: activity selection, jump game, and gas station.
43. **Greedy with Sorting & Heaps**: scheduling, meeting rooms, and task assignment.

## Section 12: Dynamic Programming

44. **1D Dynamic Programming**: climbing stairs, house robber, and decode ways.
45. **2D Grid Dynamic Programming**: unique paths, and minimum path sum.
46. **Knapsack**: 0/1 knapsack, subset sum, and coin change.
47. **Subsequence Dynamic Programming**: longest increasing subsequence, and longest common subsequence.
48. **String Dynamic Programming**: edit distance, palindromic substrings, and word break.
49. **Interval Dynamic Programming**: burst balloons, and matrix chain multiplication.

## Section 13: Advanced Topics

50. **Tries**: insert and search, prefix matching, and word search with a trie.
51. **Bit Manipulation**: XOR tricks, counting bits, and subsets as bitmasks.
52. **Segment Tree & Fenwick Tree**: range queries with point updates.
