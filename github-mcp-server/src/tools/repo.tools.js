import { z } from "zod";
import { octokit } from "../config/github.js";

export function registerRepoTools(server) {

  // 1. Sob repo list dekha
  server.tool("list_repos", "All the repo list", {}, async () => {
    const { data } = await octokit.repos.listForAuthenticatedUser({ per_page: 100 });
    const list = data.map(r => `${r.name} - ${r.html_url} - ${r.description || "No description"}`).join("\n");
    return { content: [{ type: "text", text: list || "No repo found" }] };
  });

  // 2. Ekta repo er details dekha
  server.tool("get_repo", "details of singal repo", {
    owner: z.string(),
    repo: z.string()
  }, async ({ owner, repo }) => {
    const { data } = await octokit.repos.get({ owner, repo });
    // console.log(data)
    const text = `Name: ${data.name}\nDescription: ${data.description}\nStars: ${data.stargazers_count}\nForks: ${data.forks_count}\nLanguage: ${data.language}\nURL: ${data.html_url}`;
    return { content: [{ type: "text", text }] };
  });

  // 3. Notun repo banano
  server.tool("create_repo", "create new repo", {
    name: z.string(),
    description: z.string().optional(),
    isPrivate: z.boolean().optional()
  }, async ({ name, description, isPrivate }) => {
    const { data } = await octokit.repos.createForAuthenticatedUser({ name, description, private: isPrivate || false, auto_init: true });
    return { content: [{ type: "text", text: `New repo created : ${data.html_url}` }] };
  });

  // 4. Repo delete kora
  server.tool("delete_repo", "Repo delete", {
    owner: z.string(),
    repo: z.string()
  }, async ({ owner, repo }) => {
    await octokit.repos.delete({ owner, repo });
    return { content: [{ type: "text", text: `${repo} deleted` }] };
  });

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