# Tutorial: Agent-Driven Project Launch with Antigravity & Netlify

## Project Launch Guide: Agent-Driven Development (Option 1)

This tutorial covers the end-to-end process of building and deploying a web application using Google Antigravity's Agent-driven development mode and Netlify.

## Step 1: Initial Setup in Google Antigravity

1. Open the Agent Manager  
   Launch Google Antigravity and select the Open Agent Manager button from the welcome screen or the top-right corner of the editor. This surface acts as your "mission control" for orchestrating multiple agents across different workspaces.

2. Configure Option 1: Agent-Driven Development  
   Access your settings (⚙️ icon) and navigate to the Review Policy section. Select Option 1: Agent-driven development.
- What this does: In this mode, the agent is granted high autonomy to execute terminal commands and modify files without asking for permission at every step.

- Safety Tip: You can still monitor all actions via the Walkthrough and Artifacts tabs to ensure the project stays on track.
3. Create a New Workspace  
   Click the + button in the side panel to create a new workspace. Name it according to your project (e.g., `netlify-web-app`) and select a local folder to store your files.

## Custom Agentic Rules (Option 1 Configuration)

To optimize the agent's behavior for this specific stack, navigate to Customizations > Rules in the Antigravity menu. You should add the following instructions as a Workspace Rule to ensure consistent code quality and seamless Netlify integration.

```markdown
# Netlify Project Best Practices
- **Deployment Config:** Always create a `netlify.toml` file in the root directory. Set the `publish` directory to `dist` and the `command` to `npm run build`.- **Environment Handling:** Use `.env.example` to document required variables. Never hardcode sensitive API keys; instead, prompt the user or use placeholders.- **Vite Integration:** When using Vite, ensure that any environment variables intended for the client side are prefixed with `VITE_`.
```

```markdown
# Code Quality & Testing Rules
- **Modularity:** Do not write all logic in a single file. Break components into a `src/components` directory.
- **Accessibility:** Ensure all generated HTML includes standard ARIA labels and follows WCAG 2.1 guidelines for color contrast.
- **Verification:** After building a feature, automatically launch the headless browser to verify that primary buttons and navigation links are interactive.
```

## Step 2: Building via Agentic Prompting

4. Provide the Project Prompt  
   Enter your request into the Agent Manager chat. To ensure a smooth Netlify deployment, be specific about your tech stack.
- Example Prompt: *"Build a responsive React landing page using Vite and Tailwind CSS. Ensure it is optimized for Netlify deployment, including a netlify.toml file"*.
5. Review the Implementation Plan  
   Even in Agent-driven mode, Antigravity will generate an Implementation Plan artifact. Quickly scan this blueprint to verify the architecture—such as the folder structure and dependencies—before the agent begins the build.

6. Automated Build and Verification  
   Watch as the agent creates the `index.html`, `app.js`, and configuration files. The agent will automatically open a separate Chrome profile to test the site locally and verify that features like navigation and forms work as intended.

## Step 3: Deploying to Netlify (Free Tier)

7. Connect to GitHub  
   To enable continuous deployment, tell the agent: *"Save this project to a new private GitHub repository"*. The agent will stage, commit, and push your code to your GitHub account.

8. Initialize Netlify Site  
   Log in to your Netlify Dashboard and select Add New Site > Import from an existing project.
- Select GitHub: Authorize Netlify to access your account and pick the repository created by Antigravity.

- Configure Settings: Netlify typically auto-detects the build command (e.g., `npm run build`) and the publish directory (e.g., `dist`).
9. Alternative: Deploy via Netlify CLI  
   If you prefer to stay within the IDE, you can ask the agent: *"Deploy this folder to Netlify using the CLI"*. Using the `--allow-anonymous` flag, the agent can even create a temporary live URL for you to claim later without an immediate account sign-in.

## Step 4: Finalizing Production

10. Claim Your Live URL  
    Once the build status turns green and says Published, Netlify will provide a public URL (e.g., `https://your-app-name.netlify.app`). You can now share this link or set up a custom domain through the Netlify settings.

---

*Tutorial updated for Google Antigravity Agentic IDE — April 29, 2026.*
