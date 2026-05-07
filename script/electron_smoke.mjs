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
  // The smoke test can run when no previous app instance exists.
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kevlar-electron-smoke-'));
const projectRoot = path.join(tempDir, 'project');
const fakeCodexPath = path.join(tempDir, 'codex');
const dbPath = path.join(tempDir, 'smoke.db');

fs.mkdirSync(projectRoot);
fs.writeFileSync(path.join(projectRoot, 'README.md'), '# Smoke Project\n');
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
  if (input.includes('interrupt smoke')) {
    setInterval(() => {}, 1000);
    return;
  }

  if (input.includes('Kevlar Side-Car observer')) {
    const sideCarOutput = {
      cards: [
        {kind: 'summary', title: 'Smoke Summary', content: 'Side-Car generated a local card.'},
        {kind: 'decision', title: 'Smoke Decision', content: 'Promotion should append to chat.'},
      ],
    };
    emitAgentMessage(JSON.stringify(sideCarOutput));
    return;
  }

  emitAgentMessage('Smoke Codex response');
  console.log(JSON.stringify({msg: {type: 'token_count', total_tokens: 42}}));
});

function emitAgentMessage(message) {
  console.log(JSON.stringify({msg: {type: 'agent_message', message}}));
}
`,
);
fs.chmodSync(fakeCodexPath, 0o755);

let electronApp = null;

try {
  let launched = await launchApp();
  electronApp = launched.electronApp;
  const smokeState = await runSmoke(launched.page, projectRoot);
  await electronApp.close();
  electronApp = null;

  launched = await launchApp();
  electronApp = launched.electronApp;
  await verifyPersistence(launched.page, smokeState.agentChatId);
  console.log('Electron smoke passed');
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
  await page.waitForLoadState('domcontentloaded');
  await expectTitle(page, 'Kevlar Codex Desktop');
  return {electronApp: app, page};
}

async function runSmoke(page, rootPath) {
  await verifySettings(page);

  await page.evaluate(async ({rootPath}) => {
    const project = await window.kevlar.projects.create({name: 'Smoke Project', rootPath});
    const chat = await window.kevlar.chats.create({name: 'Smoke Chat', projectId: project.id});
    await window.kevlar.tasks.create({title: 'Smoke Task', projectId: project.id});
    await window.kevlar.teams.create({name: 'Smoke Team', description: 'Smoke team description'});
    return {project, chat};
  }, {rootPath});

  await page.getByText('Smoke Project').waitFor({timeout: 5000});
  await page.getByText('Smoke Chat').waitFor({timeout: 5000});

  await page.getByText('Smoke Chat').hover();
  await page.getByLabel('Delete chat Smoke Chat').click();
  await assertNotVisible(page.getByText('Smoke Chat'));

  await page.getByText('Smoke Project').hover();
  await page.getByLabel('Delete project Smoke Project').click();
  await assertNotVisible(page.getByText('Smoke Project'));

  await page.getByText('Agent Board').click();
  await page.getByText('Smoke Task').click();
  await page.getByLabel('Delete task Smoke Task').click();
  await assertNotVisible(page.getByText('Smoke Task'));

  await page.getByText('Teams').click();
  await page.getByRole('heading', {name: 'Smoke Team'}).waitFor({timeout: 5000});

  await page.getByRole('button', {name: 'Add Member'}).click();
  await page.getByPlaceholder('Agent name').fill('Smoke Agent');
  await page.getByPlaceholder('Role').fill('Reviewer');
  await page.getByRole('button', {name: 'Add Member'}).last().click();
  await page.getByText('Smoke Agent').waitFor({timeout: 5000});

  await page.getByLabel('Open member actions for Smoke Agent').click();
  await page.getByRole('menuitem', {name: 'Remove'}).click();
  await assertNotVisible(page.getByText('Smoke Agent'));

  await page.getByRole('button', {name: 'New Role'}).click();
  await page.getByPlaceholder('Role name').fill('Smoke Role');
  await page.getByPlaceholder('Permissions, comma separated').fill('read, write');
  await page.getByRole('button', {name: 'Add Role'}).click();
  await page.getByText('Smoke Role').waitFor({timeout: 5000});
  await page.getByRole('button', {name: 'Delete'}).click();
  await assertNotVisible(page.getByText('Smoke Role'));

  const {agentChatId} = await page.evaluate(async ({rootPath}) => {
    const project = await window.kevlar.projects.create({name: 'Agent Project', rootPath});
    const agentChat = await window.kevlar.chats.create({name: 'Agent Chat', projectId: project.id});
    await window.kevlar.chats.create({name: 'Interrupt Chat', projectId: project.id});
    return {agentChatId: agentChat.id};
  }, {rootPath});

  await page.getByText('Agent Chat').click();
  await page.getByPlaceholder('Message Codex in Agent Project').fill('main chat smoke');
  await page.getByLabel('Send message to Codex').click();
  await page.getByText('Smoke Codex response').waitFor({timeout: 8000});
  await assertMessagePersisted(page, agentChatId, 'Smoke Codex response');

  await page.getByText('Interrupt Chat').click();
  await page.getByPlaceholder('Message Codex in Agent Project').fill('interrupt smoke');
  await page.getByLabel('Send message to Codex').click();
  await page.getByLabel('Stop Codex run').waitFor({timeout: 5000});
  await page.getByLabel('Stop Codex run').click();
  await page.getByText('Run failed', {exact: true}).waitFor({timeout: 8000});

  await page.getByText('Agent Chat').click();
  await page.getByLabel('Run Side-Car').click();
  await page.getByText('Smoke Summary').waitFor({timeout: 8000});
  await page.getByRole('button', {name: 'Promote Side-Car card Smoke Summary'}).click();
  await page.getByText('Side-Car Smoke Summary').waitFor({timeout: 5000});
  await assertMessagePersisted(page, agentChatId, 'Side-Car Smoke Summary');

  return {agentChatId};
}

async function verifySettings(page) {
  await page.getByRole('button', {name: 'Settings'}).click();
  await page.getByText('Ready').waitFor({timeout: 8000});
  await page.getByText('codex-cli 0.30.0', {exact: true}).waitFor({timeout: 5000});
  await page.getByText('Logged in using ChatGPT', {exact: true}).waitFor({timeout: 5000});
  await page.getByText('gpt-5.2', {exact: true}).waitFor({timeout: 5000});
  await page.getByLabel('Close settings').click();
}

async function verifyPersistence(page, agentChatId) {
  await page.getByText('Agent Chat').waitFor({timeout: 5000});
  await page.getByText('Agent Chat').click();
  await page.getByText('Smoke Codex response').waitFor({timeout: 5000});
  await page.getByText('Side-Car Smoke Summary').waitFor({timeout: 5000});
  await assertMessagePersisted(page, agentChatId, 'Smoke Codex response');
  await assertMessagePersisted(page, agentChatId, 'Side-Car Smoke Summary');
}

async function assertMessagePersisted(page, chatId, text) {
  const found = await page.evaluate(async ({chatId, text}) => {
    const messages = await window.kevlar.chats.messages(chatId);
    return messages.some((message) => message.content.includes(text));
  }, {chatId, text});
  if (!found) throw new Error(`Expected persisted message containing: ${text}`);
}

async function assertNotVisible(locator) {
  await locator.waitFor({state: 'detached', timeout: 5000}).catch(async () => {
    if (await locator.count()) {
      throw new Error(`Expected locator to disappear: ${locator}`);
    }
  });
}

async function expectTitle(page, expected) {
  const title = await page.title();
  if (title !== expected) {
    throw new Error(`Expected title "${expected}", got "${title}"`);
  }
}
