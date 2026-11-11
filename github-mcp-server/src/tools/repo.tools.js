import { z } from "zod";
import { octokit } from "../config/github.js";

export function registerRepoTools(server) {
  server.tool("list_repos", "Tor sob repo list dekhabe", {}, async () => {
    const { data } = await octokit.repos.listForAuthenticatedUser();
    const list = data.map(r => `${r.name} - ${r.html_url}`).join("\n");
    return { content: [{ type: "text", text: list }] };
  });

  server.tool("create_repo", "Notun repo banabe", {
    name: z.string(),
    description: z.string().optional()
  }, async ({ name, description }) => {
    const { data } = await octokit.repos.createForAuthenticatedUser({ name, description, auto_init: true });
    return { content: [{ type: "text", text: `Repo banano hoye geche: ${data.html_url}` }] };
  });
}