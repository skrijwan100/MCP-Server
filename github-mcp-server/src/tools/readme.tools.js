import { z } from "zod";
import { octokit } from "../config/github.js";

export function registerReadmeTools(server) {

  // 1. Get README
  server.tool(
    "get_readme",
    "Get the README.md file from a repository",
    {
      owner: z.string(),
      repo: z.string(),
    },
    async ({ owner, repo }) => {
      try {
        const { data } = await octokit.repos.getReadme({
          owner,
          repo,
        });

        const content = Buffer.from(
          data.content,
          "base64"
        ).toString("utf8");

        return {
          content: [
            {
              type: "text",
              text:
                `📄 README

Repository : ${owner}/${repo}

${content}`,
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            {
              type: "text",
              text: `❌ README not found.\n\n${e.message}`,
            },
          ],
        };
      }
    }
  );

  // 2. Create README
  server.tool("create_readme", "Create a new README file", {
    owner: z.string(),
    repo: z.string(),
    content: z.string()
  }, async ({ owner, repo, content }) => {
    try {
      await octokit.repos.getReadme({ owner, repo });

      return {
        content: [{
          type: "text",
          text: "⚠️ README already exists. Use update_readme instead."
        }]
      };

    } catch {

      const { data } =
        await octokit.repos.createOrUpdateFileContents({

          owner,
          repo,
          path: "README.md",

          message: "Create README.md",

          content: Buffer.from(content).toString("base64"),
        });

      return {
        content: [{
          type: "text",
          text:
            `✅ README created successfully.

${data.content?.html_url}`
        }]
      };
    }
  });

  // 3. Update README
  server.tool("update_readme", "Update existing README file", {
    owner: z.string(),
    repo: z.string(),
    content: z.string()
  }, async ({ owner, repo, content }) => {
    try {

      const { data: existing } =
        await octokit.repos.getContent({
          owner,
          repo,
          path: "README.md",
        });

      if (Array.isArray(existing))
        throw new Error("README path is invalid.");

      const { data } =
        await octokit.repos.createOrUpdateFileContents({

          owner,
          repo,

          path: "README.md",

          message: "Update README.md",

          sha: existing.sha,

          content: Buffer
            .from(content)
            .toString("base64"),
        });

      return {
        content: [{
          type: "text",
          text:
            `✅ README updated successfully.

${data.commit.sha}`
        }]
      };

    }
    catch (e) {

      return {
        content: [{
          type: "text",
          text: `❌ ${e.message}`
        }]
      }

    }
  });

  // 4. Delete README
  server.tool("delete_readme", "Delete README file", {
    owner: z.string(),
    repo: z.string()
  }, async ({ owner, repo }) => {
    try {

      const { data: existing } =
        await octokit.repos.getContent({
          owner,
          repo,
          path: "README.md"
        });

      if (Array.isArray(existing))
        throw new Error("README not found.");

      await octokit.repos.deleteFile({

        owner,
        repo,

        path: "README.md",

        message: "Delete README.md",

        sha: existing.sha

      });

      return {
        content: [{
          type: "text",
          text: "✅ README deleted successfully."
        }]
      };

    }
    catch (e) {

      return {
        content: [{
          type: "text",
          text: `❌ ${e.message}`
        }]
      }

    }
  });
}