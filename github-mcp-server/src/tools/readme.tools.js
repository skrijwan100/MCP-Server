import { z } from "zod";
import { octokit } from "../config/github.js";

export function registerReadmeTools(server) {
  server.tool("get_readme", "Kono repo er README porbe", {
    owner: z.string(),
    repo: z.string()
  }, async ({ owner, repo }) => {
    const { data } = await octokit.repos.getReadme({ owner, repo });
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return { content: [{ type: "text", text: content }] };
  });
}