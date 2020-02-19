#!/usr/bin/env node
const { spawn } = require("child_process");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

(async function() {
  // Parse args into key value pairs
  // they are more verbose but easier to work with
  var args = process.argv
    .slice(2)
    .map(arg => arg.split("="))
    .reduce((args, [value, key]) => {
      args[value] = key;
      return args;
    }, {});
  try {
    await main({
      args: {
        ...args,
        workingDirectory: args.workingDirectory || process.cwd()
      },
      argv: process.argv
    });
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();

// Where the magic happens
async function main({ args, argv }) {
  const { service, command, workingDirectory, action, port } = args;

  // For now we just support the one service
  if (service !== "localhost.run") {
    throw new Error(
      "Service not found. Currently the only service supported is 'localhost.run'"
    );
  }

  // Don't add repeat entries into ssh
  const shouldAdd = await shouldAddToKnownHosts();
  if (shouldAdd) {
    console.log(shouldAdd);
    const { stdout, stderr } = await exec(
      "ssh-keyscan ssh.localhost.run >> ~/.ssh/known_hosts"
    );
  }
  // Do it.
  const tunnelProps = await openTunnel({ port });
  // Exec can be used for one off runs of tools
  if (action === "exec") {
    await actionExec({
      command,
      workingDirectory,
      ...tunnelProps
    });
  }
  // Spawn is for servers that open and stay running until
  // they are killed.
  if (action === "spawn") {
    await actionSpawn({
      command,
      workingDirectory,
      args: args.args,
      ...tunnelProps
    });
  }
}

async function shouldAddToKnownHosts() {
  try {
    const results = (await exec("ssh-keygen -F ssh.localhost.run")).stdout
      .toString()
      .trim();
    const found = results.indexOf("# Host ssh.localhost.run found") > -1;
    return !found;
  } catch (e) {
    return true;
  }
}

async function actionExec({ command, workingDirectory, httpUrl, httpsUrl }) {
  console.log({ httpUrl, httpsUrl });
  console.log(
      (
        await exec(command, {
          env: {
            TUNTUN_HTTP: httpUrl,
            TUNTUN_HTTPS: httpsUrl,
            ...process.env
          },
          cwd: workingDirectory
        })
      ).stdout
        .toString()
        .trim()
  );
}

async function actionSpawn({
  command,
  workingDirectory,
  httpUrl,
  httpsUrl,
  args
}) {
  console.log({ httpUrl, httpsUrl });
  const actionChild = spawn(command, [args], {
    env: {
      TUNTUN_HTTP: httpUrl,
      TUNTUN_HTTPS: httpsUrl,
      ...process.env
    },
    cwd: workingDirectory
  });
  actionChild.stdout.on("data", data => {
    const dataStr = data.toString().trim();
    console.log(dataStr);
  });
}

function openTunnel({ port }) {
  return new Promise((resolve, reject) => {
    const child = spawn(`ssh`, [
      `-tt`, // https://stackoverflow.com/questions/7114990/pseudo-terminal-will-not-be-allocated-because-stdin-is-not-a-terminal
      `-R`, // Rest of the standard localhost.run command...
      `80:localhost:${port}`,
      `ssh.localhost.run`
    ]);
    child.on("exit", function(code, signal) {
      console.log(
        "child process exited with " + `code ${code} and signal ${signal}`
      );
    });

    child.stdout.on("data", data => {
      const dataStr = data.toString();
      if (dataStr.indexOf("Connect to ") > -1) {
        var matches = dataStr.match(/\bhttps?:\/\/\S+/gi);
        if (matches.length > 0) {
          resolve({
            httpUrl: matches[0],
            httpsUrl: matches[1]
          });
        }
      }
    });

    child.stderr.on("data", data => {
      if (
        data
          .toString()
          .indexOf("Warning: Permanently added the RSA host key for IP") > -1
      ) {
        return;
      }
      console.error(`tuntun child stderr:\n${data}`);
    });
  });
}
