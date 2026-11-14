import { z } from "zod";
import { octokit } from "../config/github.js";

export function registerRepoTools(server) {

  // 1. Sob repo list dekha
  server.tool(
    "list_repos",
    "List repositories for the authenticated user",
    {
      type: z.enum(["all", "owner", "member"]).default("owner"),
      sort: z
        .enum(["created", "updated", "pushed", "full_name"])
        .default("updated"),
      direction: z.enum(["asc", "desc"]).default("desc"),
      per_page: z.number().min(1).max(100).default(30),
    },
    async ({ type, sort, direction, per_page }) => {
      try {
        const { data } =
          await octokit.repos.listForAuthenticatedUser({
            type,
            sort,
            direction,
            per_page,
          });

        if (data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "📭 No repositories found.",
              },
            ],
          };
        }

        const text =
          `📚 Repositories (${data.length})\n\n` +
          data
            .map((repo) => {
              return [
                `📦 ${repo.full_name}`,
                `Description : ${repo.description ?? "No description"}`,
                `Visibility  : ${repo.private ? "Private 🔒" : "Public 🌍"}`,
                `Default     : ${repo.default_branch}`,
                `Language    : ${repo.language ?? "Unknown"}`,
                `Stars       : ⭐ ${repo.stargazers_count}`,
                `Forks       : 🍴 ${repo.forks_count}`,
                `Fork        : ${repo.fork ? "Yes" : "No"}`,
                `Archived    : ${repo.archived ? "Yes" : "No"}`,
                `Updated     : ${repo.updated_at}`,
                `URL         : ${repo.html_url}`,
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
              text: `❌ Failed to retrieve repositories.\n\n${e.message}`,
            },
          ],
        };
      }
    }
  );

  // 2. Ekta repo er details dekha
  server.tool(
    "get_repo",
    "Get detailed information about a GitHub repository",
    {
      owner: z.string(),
      repo: z.string(),
    },
    async ({ owner, repo }) => {
      try {
        const { data } = await octokit.repos.get({
          owner,
          repo,
        });

        const text = `📦 Repository Information

Repository : ${data.full_name}

Name        : ${data.name}
Owner       : ${data.owner.login}
Description : ${data.description ?? "No description"}

Visibility  : ${data.private ? "Private 🔒" : "Public 🌍"}

Default Branch : ${data.default_branch}

Primary Language : ${data.language ?? "Unknown"}

Stars       : ⭐ ${data.stargazers_count}
Forks       : 🍴 ${data.forks_count}
Watchers    : 👀 ${data.watchers_count}
Open Issues : 🐞 ${data.open_issues_count}

Fork        : ${data.fork ? "Yes" : "No"}
Archived    : ${data.archived ? "Yes" : "No"}
Disabled    : ${data.disabled ? "Yes" : "No"}

License     : ${data.license?.name ?? "None"}

Created At  : ${data.created_at}
Updated At  : ${data.updated_at}
Last Push   : ${data.pushed_at}

Clone URL   : ${data.clone_url}
Git URL     : ${data.git_url}

Homepage    : ${data.homepage ?? "None"}

Repository URL
${data.html_url}`;

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
              text: `❌ Failed to retrieve repository.\n\n${e.message}`,
            },
          ],
        };
      }
    }
  );

  // 3. Notun repo banano
  server.tool(
    "create_repo",
    "Create a new GitHub repository",
    {
      name: z.string().min(1),

      description: z.string().optional(),

      private: z.boolean().default(false),

      auto_init: z.boolean().default(true),

      gitignore_template: z.string().optional(),

      license_template: z.string().optional(),

      homepage: z.string().url().optional(),
    },

    async ({
      name,
      description,
      private: isPrivate,
      auto_init,
      gitignore_template,
      license_template,
      homepage,
    }) => {
      try {
        const { data } =
          await octokit.repos.createForAuthenticatedUser({

            name,

            description,

            private: isPrivate,

            auto_init,

            gitignore_template,

            license_template,

            homepage,
          });

        return {
          content: [
            {
              type: "text",
              text:
                `✅ Repository Created Successfully

Repository : ${data.full_name}

Description : ${data.description ?? "No description"}

Visibility  : ${data.private ? "Private 🔒" : "Public 🌍"}

Default Branch : ${data.default_branch}

Clone URL

${data.clone_url}

Repository URL

${data.html_url}`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text:
                `❌ Failed to create repository.

${e.message}`,
            },
          ],
        };
      }
    }
  );

  // 4. Repo delete kora
server.tool(
  "delete_repo",
  "Permanently delete a GitHub repository",
  {
    owner: z.string(),
    repo: z.string(),
  },
  async ({ owner, repo }) => {
    try {
      // Get repository details first
      const { data: repository } = await octokit.repos.get({
        owner,
        repo,
      });

      await octokit.repos.delete({
        owner,
        repo,
      });

      return {
        content: [
          {
            type: "text",
            text:
`✅ Repository deleted successfully.

Repository : ${repository.full_name}

Visibility : ${repository.private ? "Private 🔒" : "Public 🌍"}

Description : ${repository.description ?? "No description"}

Default Branch : ${repository.default_branch}`,
          },
        ],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text:
`❌ Failed to delete repository.

${e.message}`,
          },
        ],
      };
    }
  }
);

  // 5. Repo er description update kora
  server.tool("update_repo", "update Repo description", {
    owner: z.string(),
    repo: z.string(),
    description: z.string()
  }, async ({ owner, repo, description }) => {
    const { data } = await octokit.repos.update({ owner, repo, description });
    return { content: [{ type: "text", text: `Updated repo: ${data.description}` }] };
  });

  // 6. Branch list dekha
  server.tool("list_branches", "see all branch list", {
    owner: z.string(),
    repo: z.string()
  }, async ({ owner, repo }) => {
    const { data } = await octokit.repos.listBranches({ owner, repo });
    const list = data.map(b => b.name).join("\n");
    return { content: [{ type: "text", text: list }] };
  });

  // 7. Notun branch banano
  server.tool("create_branch", "Create new branch", {
    owner: z.string(),
    repo: z.string(),
    branch: z.string(),
    from_branch: z.string().default("main")
  }, async ({ owner, repo, branch, from_branch }) => {
    const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${from_branch}` });
    const { data } = await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: refData.object.sha });
    return { content: [{ type: "text", text: `New Branch created done: ${data.ref}` }] };
  });
}