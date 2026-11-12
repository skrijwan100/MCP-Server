import { z } from "zod";
import { octokit } from "../config/github.js";

export function registerPrTools(server) {

  // 1. Create Pull Request
  server.tool(
  "create_pr",
  "Create a new pull request",
  {
    owner: z.string(),
    repo: z.string(),
    title: z.string().min(1),
    head: z.string(),
    base: z.string().default("main"),
    body: z.string().optional(),
    draft: z.boolean().default(false),
  },
  async ({ owner, repo, title, head, base, body, draft }) => {
    try {
      // Prevent creating a PR from a branch into itself
      if (head === base) {
        return {
          content: [
            {
              type: "text",
              text: "❌ Head and Base branches cannot be the same.",
            },
          ],
        };
      }

      // Check if an open PR already exists
      const { data: existing } = await octokit.pulls.list({
        owner,
        repo,
        head: `${owner}:${head}`,
        base,
        state: "open",
      });

      if (existing.length > 0) {
        return {
          content: [
            {
              type: "text",
              text:
                `⚠️ An open Pull Request already exists.\n\n` +
                `PR #${existing[0].number}\n` +
                `${existing[0].html_url}`,
            },
          ],
        };
      }

      const { data } = await octokit.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body,
        draft,
      });

      return {
        content: [
          {
            type: "text",
            text:
`✅ Pull Request Created Successfully

Repository : ${owner}/${repo}
PR          : #${data.number}
Title       : ${data.title}
Author      : ${data.user.login}
Draft       : ${data.draft ? "Yes" : "No"}

Branch      : ${data.head.ref} → ${data.base.ref}

URL         : ${data.html_url}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to create Pull Request.\n\n${e.message}`,
          },
        ],
      };
    }
  }
);

  // 2. List all PRs
  server.tool(
  "list_prs",
  "List pull requests in a repository",
  {
    owner: z.string(),
    repo: z.string(),
    state: z.enum(["open", "closed", "all"]).default("open"),
    per_page: z.number().min(1).max(100).default(30),
  },
  async ({ owner, repo, state, per_page }) => {
    try {
      const { data } = await octokit.pulls.list({
        owner,
        repo,
        state,
        per_page,
      });

      if (data.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `📭 No ${state} pull requests found.`,
            },
          ],
        };
      }

      const text =
        `📋 Pull Requests (${state})\n\n` +
        data
          .map((pr) => {
            const status = pr.merged_at
              ? "🟣 Merged"
              : pr.state === "open"
              ? "🟢 Open"
              : "🔴 Closed";

            return [
              `#${pr.number} - ${pr.title}`,
              `Status : ${status}${pr.draft ? " (Draft)" : ""}`,
              `Author : ${pr.user.login}`,
              `Branch : ${pr.head.ref} → ${pr.base.ref}`,
              `Created: ${pr.created_at}`,
              `URL    : ${pr.html_url}`,
            ].join("\n");
          })
          .join("\n\n--------------------------------\n\n");

      return {
        content: [
          {
            type: "text",
            text,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to list pull requests.\n\n${e.message}`,
          },
        ],
      };
    }
  }
);

  // 3. Get PR Details
server.tool(
  "get_pr",
  "Get detailed information about a pull request",
  {
    owner: z.string(),
    repo: z.string(),
    pull_number: z.number().int().positive(),
  },
  async ({ owner, repo, pull_number }) => {
    try {
      const { data } = await octokit.pulls.get({
        owner,
        repo,
        pull_number,
      });

      const merged =
        data.merged_at !== null
          ? `✅ Yes (${data.merged_at})`
          : "❌ No";

      const mergeable =
        data.mergeable === null
          ? "⏳ GitHub is calculating..."
          : data.mergeable
          ? "✅ Yes"
          : "❌ No";

      const text =
`📌 Pull Request #${data.number}

Title        : ${data.title}
State        : ${data.state}
Draft        : ${data.draft ? "Yes" : "No"}
Merged       : ${merged}

Author       : ${data.user.login}

Source       : ${data.head.label}
Target       : ${data.base.label}

Mergeable    : ${mergeable}
Merge State  : ${data.mergeable_state}

Commits      : ${data.commits}
Files Changed: ${data.changed_files}
Additions    : ${data.additions}
Deletions    : ${data.deletions}

Created      : ${data.created_at}
Updated      : ${data.updated_at}

URL          : ${data.html_url}`;

      return {
        content: [
          {
            type: "text",
            text,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to retrieve Pull Request.\n\n${e.message}`,
          },
        ],
      };
    }
  }
);

  // 4. Merge PR
  server.tool(
  "merge_pr",
  "Merge a pull request",
  {
    owner: z.string(),
    repo: z.string(),
    pull_number: z.number().int().positive(),
    merge_method: z
      .enum(["merge", "squash", "rebase"])
      .default("merge"),
  },
  async ({ owner, repo, pull_number, merge_method }) => {
    try {
      // Get PR information
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number,
      });

      if (pr.merged) {
        return {
          content: [
            {
              type: "text",
              text: `⚠️ Pull Request #${pull_number} has already been merged.`,
            },
          ],
        };
      }

      if (pr.state === "closed") {
        return {
          content: [
            {
              type: "text",
              text: `⚠️ Pull Request #${pull_number} is already closed.`,
            },
          ],
        };
      }

      if (!pr.mergeable) {
        return {
          content: [
            {
              type: "text",
              text:
                `❌ Pull Request cannot be merged.\n\n` +
                `Possible reasons:\n` +
                `• Merge conflicts\n` +
                `• Branch protection rules\n` +
                `• Required checks have not passed`,
            },
          ],
        };
      }

      const { data } = await octokit.pulls.merge({
        owner,
        repo,
        pull_number,
        merge_method,
      });

      if (!data.merged) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Merge failed.\n\n${data.message}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text:
              `✅ Pull Request Merged Successfully\n\n` +
              `Repository : ${owner}/${repo}\n` +
              `PR         : #${pr.number}\n` +
              `Title      : ${pr.title}\n` +
              `Author     : ${pr.user.login}\n` +
              `Method     : ${merge_method}\n` +
              `SHA        : ${data.sha}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to merge Pull Request.\n\n${e.message}`,
          },
        ],
      };
    }
  }
);

  // 5. Close PR
  server.tool(
  "close_pr",
  "Close a pull request without merging",
  {
    owner: z.string(),
    repo: z.string(),
    pull_number: z.number().int().positive(),
  },
  async ({ owner, repo, pull_number }) => {
    try {
      // Get PR details first
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number,
      });

      if (pr.state === "closed") {
        return {
          content: [
            {
              type: "text",
              text: `⚠️ Pull Request #${pull_number} is already closed.`,
            },
          ],
        };
      }

      if (pr.merged_at) {
        return {
          content: [
            {
              type: "text",
              text: `⚠️ Pull Request #${pull_number} has already been merged and cannot be closed.`,
            },
          ],
        };
      }

      const { data } = await octokit.pulls.update({
        owner,
        repo,
        pull_number,
        state: "closed",
      });

      return {
        content: [
          {
            type: "text",
            text:
              `✅ Pull Request Closed Successfully\n\n` +
              `#${data.number}: ${data.title}\n` +
              `Author: ${data.user.login}\n` +
              `State: ${data.state}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to close Pull Request.\n\n${e.message}`,
          },
        ],
      };
    }
  }
);
  // 6. Check Sync Status - Branch pichiye ache kina check koro
  server.tool(
  "check_sync",
  "Check if fork is behind upstream",
  {
    owner: z.string(),
    repo: z.string(),
    branch: z.string().default("main"),
  },
  async ({ owner, repo, branch }) => {
    try {
      // Get repository information
      const { data: repository } = await octokit.repos.get({
        owner,
        repo,
      });

      if (!repository.fork || !repository.parent) {
        return {
          content: [
            {
              type: "text",
              text: "❌ This repository is not a fork.",
            },
          ],
        };
      }

      const upstreamOwner = repository.parent.owner.login;
      const upstreamBranch = repository.parent.default_branch;

      const { data } = await octokit.repos.compareCommits({
        owner,
        repo,
        base: `${upstreamOwner}:${upstreamBranch}`,
        head: branch,
      });

      return {
        content: [
          {
            type: "text",
            text:
              `Status: ${data.status}\n` +
              `Ahead: ${data.ahead_by}\n` +
              `Behind: ${data.behind_by}\n\n` +
              (data.behind_by > 0
                ? "⚠️ Your fork is OUTDATED."
                : "✅ Your fork is UP TO DATE."),
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `❌ ${e.message}`,
          },
        ],
      };
    }
  }
);

  // 7. Sync Branch - Main er code branch e ene dao
 server.tool(
  "sync_branch",
  "Sync fork with upstream repository",
  {
    owner: z.string(),
    repo: z.string(),
    branch: z.string().default("main"),
  },
  async ({ owner, repo, branch }) => {
    try {
      const { data } = await octokit.request(
        "POST /repos/{owner}/{repo}/merge-upstream",
        {
          owner,
          repo,
          branch,
        }
      );

      return {
        content: [
          {
            type: "text",
            text:
              `✅ Fork synced successfully!\n\n` +
              `Branch: ${branch}\n` +
              `Merge Commit: ${data.merge_commit_sha}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Sync failed.\n${e.message}`,
          },
        ],
      };
    }
  }
);
}