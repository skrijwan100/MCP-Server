import { z } from "zod";
import { octokit } from "../config/github.js";

export function registerReadmeTools(server) {

  // 1. Get README
  server.tool("get_readme", "Get README content of a repo", {
    owner: z.string(),
    repo: z.string()
  }, async ({ owner, repo }) => {
    try {
      const { data } = await octokit.repos.getReadme({ owner, repo });
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return { content: [{ type: "text", text: content }] };
    } catch (error) {
      return { content: [{ type: "text", text: "README not found in this repo" }] };
    }
  });

  // 2. Create README
  server.tool("create_readme", "Create a new README file", {
    owner: z.string(),
    repo: z.string(),
    content: z.string()
  }, async ({ owner, repo, content }) => {
    const encodedContent = Buffer.from(content).toString("base64");
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: "README.md",
      message: "Create README.md",
      content: encodedContent
    });
    return { content: [{ type: "text", text: `README created: ${data.content.html_url}` }] };
  });

  // 3. Update README
  server.tool("update_readme", "Update existing README file", {
    owner: z.string(),
    repo: z.string(),
    content: z.string()
  }, async ({ owner, repo, content }) => {
    const { data: existing } = await octokit.repos.getContent({ owner, repo, path: "README.md" });
    const encodedContent = Buffer.from(content).toString("base64");
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: "README.md",
      message: "Update README.md",
      content: encodedContent,
      sha: existing.sha
    });
    return { content: [{ type: "text", text: `README updated: ${data.content.html_url}` }] };
  });

  // 4. Delete README
  server.tool("delete_readme", "Delete README file", {
    owner: z.string(),
    repo: z.string()
  }, async ({ owner, repo }) => {
    const { data: existing } = await octokit.repos.getContent({ owner, repo, path: "README.md" });
    await octokit.repos.deleteFile({
      owner,
      repo,
      path: "README.md",
      message: "Delete README.md",
      sha: existing.sha
    });
    return { content: [{ type: "text", text: "README deleted successfully" }] };
  });
}