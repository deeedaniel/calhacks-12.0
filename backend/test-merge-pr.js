/**
 * Standalone test script for mergePullRequest function
 * Run with: node test-merge-pr.js
 */

require("dotenv").config();
const GithubTools = require("./lib/github-tools");

async function testMergePR() {
  console.log("🧪 Testing mergePullRequest function...\n");

  // Check if token is available
  if (!process.env.GITHUB_ACCESS_TOKEN) {
    console.error("❌ GITHUB_ACCESS_TOKEN not found in environment variables");
    console.error("Please create a .env file with your GitHub token");
    process.exit(1);
  }

  try {
    const githubTools = new GithubTools(process.env.GITHUB_ACCESS_TOKEN);
    console.log("✅ GitHub tools initialized\n");

    // ============================================
    // TEST 1: Try to merge a PR (change this number!)
    // ============================================
    const PR_NUMBER = 1; // ⚠️ CHANGE THIS to an actual PR number in your repo

    console.log(`📝 Test 1: Attempting to merge PR #${PR_NUMBER}...`);
    const result1 = await githubTools.mergePullRequest({
      pullNumber: PR_NUMBER,
      mergeMethod: "merge",
    });

    console.log("\nResult:");
    console.log(JSON.stringify(result1, null, 2));
    console.log("\n" + "=".repeat(60) + "\n");

    // ============================================
    // TEST 2: Test with squash merge
    // ============================================
    // Uncomment to test squash merge
    /*
    console.log(`📝 Test 2: Attempting to squash and merge PR #${PR_NUMBER}...`);
    const result2 = await githubTools.mergePullRequest({
      pullNumber: PR_NUMBER,
      mergeMethod: "squash",
      commitTitle: "Squashed commit from PR",
      commitMessage: "This is a test merge using squash",
    });

    console.log("\nResult:");
    console.log(JSON.stringify(result2, null, 2));
    console.log("\n" + "=".repeat(60) + "\n");
    */

    // ============================================
    // TEST 3: Test with branch deletion
    // ============================================
    // Uncomment to test with branch deletion
    /*
    console.log(`📝 Test 3: Merge PR #${PR_NUMBER} and delete branch...`);
    const result3 = await githubTools.mergePullRequest({
      pullNumber: PR_NUMBER,
      mergeMethod: "merge",
      deleteBranch: true,
    });

    console.log("\nResult:");
    console.log(JSON.stringify(result3, null, 2));
    console.log("\n" + "=".repeat(60) + "\n");
    */

    // ============================================
    // TEST 4: Test error handling (invalid PR)
    // ============================================
    console.log("📝 Test 4: Testing error handling with invalid PR...");
    const result4 = await githubTools.mergePullRequest({
      pullNumber: 99999, // Non-existent PR
      mergeMethod: "merge",
    });

    console.log("\nResult:");
    console.log(JSON.stringify(result4, null, 2));
    console.log("\n" + "=".repeat(60) + "\n");

    // ============================================
    // TEST 5: Test invalid merge method
    // ============================================
    console.log("📝 Test 5: Testing error handling with invalid merge method...");
    const result5 = await githubTools.mergePullRequest({
      pullNumber: PR_NUMBER,
      mergeMethod: "invalid-method",
    });

    console.log("\nResult:");
    console.log(JSON.stringify(result5, null, 2));

    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error(error.message);
    process.exit(1);
  }
}

// Run the tests
testMergePR();

