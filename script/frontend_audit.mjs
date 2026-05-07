import {_electron as electron} from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root = process.cwd();
const mainBundle = path.join(root, '.vite', 'build', 'main.js');

if (!fs.existsSync(mainBundle)) {
  throw new Error(`Built Electron main bundle not found: ${mainBundle}. Run npm run package first.`);
}

try {
  execFileSync('pkill', ['-x', 'Kevlar Codex Desktop'], {stdio: 'ignore'});
} catch {
  // No existing app process is fine.
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kevlar-frontend-audit-'));
const projectRoot = path.join(tempDir, 'project');
const secondProjectRoot = path.join(tempDir, 'project-two');
const fakeCodexPath = path.join(tempDir, 'codex');
const dbPath = path.join(tempDir, 'audit.db');
const screenshotsDir = path.join(tempDir, 'screenshots');

fs.mkdirSync(projectRoot);
fs.mkdirSync(secondProjectRoot);
fs.mkdirSync(screenshotsDir);
fs.writeFileSync(path.join(projectRoot, 'README.md'), '# Audit Project\n');
fs.writeFileSync(path.join(secondProjectRoot, 'README.md'), '# Second Audit Project\n');
fs.writeFileSync(
  fakeCodexPath,
  `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes('--version')) {
  console.log('codex-cli 0.30.0');
  process.exit(0);
}
if (args[0] === 'login' && args[1] === 'status') {
  console.log('Logged in using ChatGPT');
  process.exit(0);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  if (input.includes('interrupt audit')) {
    setInterval(() => {}, 1000);
    return;
  }

  if (input.includes('Kevlar Side-Car observer')) {
    emitAgentMessage(JSON.stringify({
      cards: [
        {kind: 'summary', title: 'Audit Summary', content: 'Summary card content.'},
        {kind: 'decision', title: 'Audit Decision', content: 'Decision card content.'},
        {kind: 'open_question', title: 'Audit Question', content: 'Question card content.'},
        {kind: 'next_step', title: 'Audit Next Step', content: '[ ] Next step card content.'}
      ]
    }));
    return;
  }

  emitAgentMessage(input.includes('button audit') ? 'Button audit response' : 'Keyboard audit response');
  console.log(JSON.stringify({msg: {type: 'token_count', total_tokens: 77}}));
});

function emitAgentMessage(message) {
  console.log(JSON.stringify({msg: {type: 'agent_message', message}}));
}
`,
);
fs.chmodSync(fakeCodexPath, 0o755);

const audit = {
  checks: [],
  consoleErrors: [],
  pageErrors: [],
};

let electronApp = null;

try {
  let launched = await launchApp();
  electronApp = launched.electronApp;
  const state = await runFrontendAudit(launched.page);
  await screenshot(launched.page, 'after-full-audit');
  await electronApp.close();
  electronApp = null;

  launched = await launchApp();
  electronApp = launched.electronApp;
  await verifyRestartPersistence(launched.page, state);

  if (audit.consoleErrors.length || audit.pageErrors.length) {
    throw new Error(
      [
        'Frontend audit observed browser-side errors.',
        ...audit.consoleErrors.map((message) => `console: ${message}`),
        ...audit.pageErrors.map((message) => `pageerror: ${message}`),
      ].join('\n'),
    );
  }

  console.log(`Frontend audit passed (${audit.checks.length} checks)`);
} catch (error) {
  if (electronApp) {
    const pages = electronApp.windows();
    if (pages[0]) await screenshot(pages[0], 'failure');
  }
  console.error(`Screenshots: ${screenshotsDir}`);
  throw error;
} finally {
  if (electronApp) await electronApp.close().catch(() => {});
  fs.rmSync(tempDir, {recursive: true, force: true});
}

async function launchApp() {
  const app = await electron.launch({
    args: ['.'],
    cwd: root,
    env: {
      ...process.env,
      KEVLAR_TEST_DB_PATH: dbPath,
      CODEX_CLI_PATH: fakeCodexPath,
    },
  });
  const page = await app.firstWindow();
  page.on('console', (message) => {
    if (message.type() === 'error') audit.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => audit.pageErrors.push(error.message));
  await page.setViewportSize({width: 1440, height: 920});
  await page.waitForLoadState('domcontentloaded');
  await expectTitle(page, 'Kevlar Codex Desktop');
  return {electronApp: app, page};
}

async function runFrontendAudit(page) {
  await check('initial empty/start states', async () => {
    await expectVisible(page.getByText('Run Codex locally'));
    await expectVisible(page.getByText('Add a local project folder'));
    await expectVisible(page.getByText('No chat selected'));
    await expectDisabled(page.getByLabel('Run Side-Car'));
  });

  await check('settings status, refresh, close', async () => {
    await page.getByRole('button', {name: 'Settings'}).click();
    await expectVisible(page.getByText('Ready'));
    await expectVisible(page.getByText('codex-cli 0.30.0', {exact: true}));
    await expectVisible(page.getByText('Logged in using ChatGPT', {exact: true}));
    await page.getByRole('button', {name: 'Refresh'}).click();
    await expectVisible(page.getByText('gpt-5.2', {exact: true}));
    await page.getByLabel('Close settings').click();
    await expectHidden(page.getByText('Codex CLI'));
  });

  const state = await check('seed local data through preload IPC', async () => page.evaluate(async ({projectRoot, secondProjectRoot}) => {
    const alphaProject = await window.kevlar.projects.create({name: 'Alpha Project', rootPath: projectRoot});
    const betaProject = await window.kevlar.projects.create({name: 'Beta Project', rootPath: secondProjectRoot});
    const alphaChat = await window.kevlar.chats.create({name: 'Alpha Chat', projectId: alphaProject.id});
    await window.kevlar.chats.create({name: 'Beta Chat', projectId: betaProject.id});
    await window.kevlar.tasks.create({title: 'Global Audit Task', projectId: null});
    await window.kevlar.tasks.create({title: 'Local Audit Task', projectId: alphaProject.id});
    await window.kevlar.tasks.create({title: 'Processing Audit Task', projectId: alphaProject.id});
    const processingTask = (await window.kevlar.tasks.list()).find((task) => task.title === 'Processing Audit Task');
    if (processingTask) await window.kevlar.tasks.updateStatus({id: processingTask.id, status: 'Processing'});
    await window.kevlar.teams.create({name: 'Audit Team', description: 'Original audit description'});
    return {alphaProjectId: alphaProject.id, betaProjectId: betaProject.id, alphaChatId: alphaChat.id};
  }, {projectRoot, secondProjectRoot}));

  await check('sidebar search, rename, delete, and new chat controls', async () => {
    await expectVisible(page.getByText('Alpha Project'));
    await page.getByPlaceholder('Search').fill('Beta');
    await expectVisible(page.getByText('Beta Project'));
    await expectHidden(page.getByText('Alpha Project'));
    await page.getByPlaceholder('Search').fill('');
    await page.getByText('Alpha Project').hover();
    await page.getByLabel('Rename project Alpha Project').click();
    await page.getByLabel('Project name for Alpha Project').fill('Alpha Renamed');
    await page.keyboard.press('Enter');
    await expectVisible(page.getByText('Alpha Renamed'));
    await page.getByText('Beta Chat').hover();
    await page.getByLabel('Rename chat Beta Chat').click();
    await page.getByLabel('Chat name for Beta Chat').fill('Beta Renamed Chat');
    await page.keyboard.press('Enter');
    await expectVisible(page.getByText('Beta Renamed Chat'));
    await page.getByRole('button', {name: 'New chat'}).click();
    await expectVisible(page.getByRole('heading', {name: 'New Chat'}));
    await page.getByText('New Chat').first().hover();
    await page.getByLabel('Delete chat New Chat').click();
    await expectVisible(page.getByText('Run Codex locally'));
    await page.getByText('Beta Renamed Chat').hover();
    await page.getByLabel('Delete chat Beta Renamed Chat').click();
    await expectHidden(page.getByText('Beta Renamed Chat'));
  });

  await check('start screen action cards and project selector are real controls', async () => {
    await page.getByText('Inspect package readiness').click();
    await expectInputValue(page.locator('textarea').first(), 'Inspect package readiness and list any issues before distribution.');
    await page.locator('button[aria-label="Select start project"]').click();
    await page.getByRole('menuitem', {name: 'Alpha Renamed'}).click();
    await expectText(page.locator('button[aria-label="Select start project"]'), 'Alpha Renamed');
    await expectEnabled(page.getByLabel('Send message to Codex').first());
  });

  await check('new chat from start screen sends by keyboard and persists', async () => {
    const input = page.locator('textarea').first();
    await input.fill('keyboard audit');
    await input.press('Enter');
    await expectVisible(page.getByText('Keyboard audit response'));
    await expectPersistedMessage(page, 'Keyboard audit response');
  });

  await check('chat rename, project reassignment, button send, and interrupt', async () => {
    await page.getByRole('heading', {name: 'New Chat'}).hover();
    await page.getByLabel('Rename active chat New Chat').click();
    await page.getByLabel('Chat name').fill('Primary Audit Chat');
    await page.keyboard.press('Enter');
    await expectVisible(page.getByRole('heading', {name: 'Primary Audit Chat'}));
    await page.getByLabel('Chat project').selectOption(state.betaProjectId);
    await expectVisible(page.getByPlaceholder('Message Codex in Beta Project'));
    await page.getByLabel('Chat project').selectOption(state.alphaProjectId);
    await page.getByPlaceholder('Message Codex in Alpha Renamed').fill('button audit');
    await page.getByLabel('Send message to Codex').click();
    await expectVisible(page.getByText('Button audit response'));
    await page.evaluate(async ({projectId}) => {
      const chat = await window.kevlar.chats.create({name: 'Interrupt Audit Chat', projectId});
      return chat.id;
    }, {projectId: state.alphaProjectId});
    await page.getByText('Interrupt Audit Chat').click();
    await page.getByPlaceholder('Message Codex in Alpha Renamed').fill('interrupt audit');
    await page.getByLabel('Send message to Codex').click();
    await page.getByLabel('Stop Codex run').click();
    await expectVisible(page.getByText('Run failed', {exact: true}));
  });

  await check('board global/local/new task/assignment/status/title/delete', async () => {
    await page.getByText('Agent Board').click();
    await page.getByLabel('Show global tasks').click();
    await expectVisible(page.getByText('Global Audit Task'));
    await page.getByLabel('Show local tasks').click();
    await expectVisible(page.getByText('Local Audit Task'));
    await expectHidden(page.getByText('Global Audit Task'));
    await page.getByRole('button', {name: 'New Task'}).click();
    await expectVisible(page.getByText('New Agent Task').first());
    await page.getByText('Local Audit Task').click();
    await page.getByRole('button', {name: 'Set task status Processing'}).click();
    await expectTask(page, 'Local Audit Task', {status: 'Processing'});
    await expectVisible(page.getByText('Processing Audit Task'));
    await page.getByLabel('Assign agent for task Processing Audit Task').click();
    await page.getByRole('menuitem', {name: 'AlphaBot'}).click();
    await expectTask(page, 'Processing Audit Task', {assignedAgent: 'AlphaBot'});
    await page.getByText('Processing Audit Task').click();
    await page.getByText('Rename task Processing Audit Task').click();
    await page.getByLabel('Task title').fill('Renamed Processing Task');
    await page.keyboard.press('Enter');
    await page.getByLabel('Close task details').click();
    await expectVisible(page.getByText('Renamed Processing Task'));
    await page.getByText('Renamed Processing Task').click();
    await page.getByLabel('Delete task Renamed Processing Task').click();
    await expectHidden(page.getByText('Renamed Processing Task'));
  });

  await check('project board rename propagates to sidebar and chat placeholder', async () => {
    await page.getByLabel('Rename active project Alpha Renamed').click();
    await page.getByLabel('Project board title').fill('Alpha Board Renamed');
    await page.keyboard.press('Enter');
    await expectVisible(page.getByRole('heading', {name: 'Alpha Board Renamed'}));
    await page.getByText('Primary Audit Chat').click();
    await expectVisible(page.getByPlaceholder('Message Codex in Alpha Board Renamed'));
  });

  await check('teams create/search/edit-cancel/edit-save/delete/member/role', async () => {
    await page.getByText('Teams').click();
    await expectVisible(page.getByRole('heading', {name: 'Audit Team'}));
    await page.getByPlaceholder('Search teams...').fill('zzz');
    await expectVisible(page.getByText('No teams found.'));
    await page.getByPlaceholder('Search teams...').fill('');
    await page.getByRole('button', {name: 'Create team'}).click();
    await expectVisible(page.getByRole('heading', {name: 'New Team'}));
    await page.locator('button[aria-label="Open team settings"]').click();
    await page.getByRole('menuitem', {name: 'Edit Team Profile'}).click();
    await page.getByLabel('Team name').fill('Discarded Team Name');
    await page.getByRole('button', {name: 'Cancel'}).click();
    await expectVisible(page.getByRole('heading', {name: 'New Team'}));
    await page.locator('button[aria-label="Open team settings"]').click();
    await page.getByRole('menuitem', {name: 'Edit Team Profile'}).click();
    await page.getByLabel('Team name').fill('Frontend Audit Team');
    await page.getByLabel('Team description').fill('Edited audit description');
    await page.getByRole('button', {name: 'Save'}).click();
    await expectVisible(page.getByRole('heading', {name: 'Frontend Audit Team'}));
    await page.getByRole('button', {name: 'Add Member'}).click();
    await page.getByPlaceholder('Agent name').fill('Audit Agent');
    await page.getByPlaceholder('Role').fill('Reviewer');
    await page.getByRole('button', {name: 'Add Member'}).last().click();
    await expectVisible(page.getByText('Audit Agent'));
    await page.getByLabel('Open member actions for Audit Agent').click();
    await page.getByRole('menuitem', {name: 'Remove'}).click();
    await expectHidden(page.getByText('Audit Agent'));
    await page.getByRole('button', {name: 'New Role'}).click();
    await page.getByPlaceholder('Role name').fill('Audit Role');
    await page.getByPlaceholder('Permissions, comma separated').fill('read, write');
    await page.getByRole('button', {name: 'Add Role'}).click();
    await expectVisible(page.getByText('Audit Role'));
    await page.getByRole('button', {name: 'Delete role Audit Role'}).click();
    await expectHidden(page.getByText('Audit Role'));
    await page.locator('button[aria-label="Open team settings"]').click();
    await page.getByRole('menuitem', {name: 'Delete Team'}).click();
    await expectHidden(page.getByRole('heading', {name: 'Frontend Audit Team'}));
  });

  await check('plugins and automations status views', async () => {
    await page.getByText('Plugins').click();
    await expectVisible(page.getByText('Codex Runtime'));
    await expectVisible(page.getByText('Renderer boundary'));
    await page.getByText('Automations').click();
    await expectVisible(page.getByText('Local Run Queue'));
    await expectVisible(page.getByText('Foreground execution'));
  });

  await check('side-car tabs, visible-card send, direct promote, and clear', async () => {
    await page.getByText('Primary Audit Chat').click();
    await page.getByLabel('Run Side-Car').click();
    await expectVisible(page.getByText('Audit Summary'));
    await page.getByRole('button', {name: 'Decisions'}).click();
    await expectVisible(page.getByText('Audit Decision'));
    await page.getByRole('button', {name: 'Send visible Decisions Side-Car card to primary chat'}).click();
    await expectVisible(page.getByText('Side-Car Audit Decision'));
    await page.getByRole('button', {name: 'Questions'}).click();
    await expectVisible(page.getByText('Audit Question'));
    await page.getByRole('button', {name: 'Promote Side-Car card Audit Question'}).click();
    await expectVisible(page.getByText('Side-Car Audit Question'));
    await page.getByRole('button', {name: 'Next Steps'}).click();
    await expectVisible(page.getByText('Audit Next Step'));
    await page.getByLabel('Clear Side-Car history').click();
    await expectVisible(page.getByText('No Side-Car cards yet'));
  });

  await check('sidebar delete active chat and active project resets views', async () => {
    await page.locator('span.truncate').filter({hasText: 'Primary Audit Chat'}).hover();
    await page.getByLabel('Delete chat Primary Audit Chat').click();
    await expectHidden(page.getByText('Primary Audit Chat'));
    await expectVisible(page.getByText('Run Codex locally'));
    await page.locator('span.truncate').filter({hasText: 'Alpha Board Renamed'}).hover();
    await page.getByLabel('Delete project Alpha Board Renamed').click();
    await expectHidden(page.getByText('Alpha Board Renamed'));
  });

  return state;
}

async function verifyRestartPersistence(page, state) {
  await check('restart persistence for surviving local data', async () => {
    await expectVisible(page.getByText('Beta Project'));
    await page.getByText('Teams').click();
    await expectVisible(page.getByRole('heading', {name: 'Audit Team'}));
    await page.getByText('Agent Board').click();
    await expectVisible(page.getByText('Global Audit Task'));
    await page.evaluate(async ({projectId}) => {
      const chat = await window.kevlar.chats.create({name: 'Restart Verification Chat', projectId});
      await window.kevlar.chats.appendMessage({chatId: chat.id, role: 'assistant', content: 'Restart persisted message'});
      return chat.id;
    }, {projectId: state.betaProjectId});
    await page.getByText('Restart Verification Chat').click();
    await expectVisible(page.getByText('Restart persisted message'));
  });
}

async function check(name, callback) {
  const beforeConsole = audit.consoleErrors.length;
  const beforePage = audit.pageErrors.length;
  const result = await callback();
  if (audit.consoleErrors.length !== beforeConsole || audit.pageErrors.length !== beforePage) {
    throw new Error(`Browser-side error during check: ${name}`);
  }
  audit.checks.push(name);
  console.log(`✓ ${name}`);
  return result;
}

async function expectVisible(locator, timeout = 5000) {
  await locator.waitFor({state: 'visible', timeout});
}

async function expectHidden(locator, timeout = 5000) {
  await locator.waitFor({state: 'hidden', timeout});
}

async function expectEnabled(locator) {
  const target = locator.first();
  await target.waitFor({state: 'visible', timeout: 5000});
  if (await target.isDisabled()) throw new Error(`Expected enabled locator: ${target}`);
}

async function expectDisabled(locator) {
  const target = locator.first();
  await target.waitFor({state: 'visible', timeout: 5000});
  if (!(await target.isDisabled())) throw new Error(`Expected disabled locator: ${target}`);
}

async function expectInputValue(locator, expected) {
  const value = await locator.inputValue();
  if (value !== expected) throw new Error(`Expected input value "${expected}", got "${value}"`);
}

async function expectText(locator, expected) {
  const target = locator.first();
  await target.waitFor({state: 'visible', timeout: 5000});
  const text = await target.textContent();
  if (!text?.includes(expected)) throw new Error(`Expected text containing "${expected}", got "${text}"`);
}

async function expectPersistedMessage(page, content) {
  const found = await page.evaluate(async (content) => {
    const chats = await window.kevlar.chats.list();
    for (const chat of chats) {
      const messages = await window.kevlar.chats.messages(chat.id);
      if (messages.some((message) => message.content.includes(content))) return true;
    }
    return false;
  }, content);
  if (!found) throw new Error(`Message was not persisted: ${content}`);
}

async function expectTask(page, title, expected) {
  const found = await page.evaluate(async ({title, expected}) => {
    const tasks = await window.kevlar.tasks.list();
    return tasks.some((task) => {
      if (task.title !== title) return false;
      return Object.entries(expected).every(([key, value]) => task[key] === value);
    });
  }, {title, expected});
  if (!found) throw new Error(`Task "${title}" did not match ${JSON.stringify(expected)}`);
}

async function screenshot(page, name) {
  await page.screenshot({path: path.join(screenshotsDir, `${name}.png`), fullPage: true}).catch(() => {});
}

async function expectTitle(page, expected) {
  const title = await page.title();
  if (title !== expected) throw new Error(`Expected title "${expected}", got "${title}"`);
}
