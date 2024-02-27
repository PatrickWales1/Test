import * as child_process from 'child_process';
import * as fs from 'fs';
import { initializeLogger, log } from './log';
import { c, initializeMiningConfig } from './mc';
import { initializeDatabase } from './db';
import { initializeML } from './ml';
import { initializeBlockchain, wallet } from './blockchain';
import { initializeRPC } from './rpc';
import { main } from './claims_index';

async function start(configPath: string) {
  try {
    const mconf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    initializeMiningConfig(mconf);
  } catch (e) {
    console.error(`unable to parse ${configPath}`);
    process.exit(1);
  }

  let portOffset = parseInt(process.argv[3]);
  log.debug(`Starting RPC on port ${c.rpc.port + portOffset}`);  


  let logPath = 'log_claims.txt';
  initializeLogger(logPath);
  if (c.evilmode) {
    for (let i=0; i<20; ++i) {
      log.warn('YOU HAVE EVIL MODE ENABLED, YOU WILL BE SLASHED');
      log.warn('KILL YOUR MINER IMMEDIATELY IF NOT ON TESTNET');
    }
  }

  try {
    const rev = child_process.execSync('git rev-parse HEAD').toString().trim();
    log.info(`Arbius Miner ${rev.substring(0, 8)} starting`);
  } catch (e) {
    log.warn('Could not run "git rev-parse HEAD" do you have git in PATH?');
  }

  log.debug(`Logging to ${logPath}`);
 
  await initializeBlockchain();
  log.debug(`Loaded wallet (${wallet.address})`);

  await initializeRPC(c.rpc.port + 1, c.rpc.host);
  log.debug(`RPC initialized`);

  await main();
  process.exit(0);
}

if (process.argv.length < 4) {
    console.error('usage: yarn start_claims MiningConfig.json  <portOffset>');
    process.exit(1);
}
  
let isPortInvalid = !process.argv?.[3] || isNaN(parseInt(process.argv[3]));
if (isPortInvalid) {
    console.error(`port offset is invalid: ${process.argv?.[3]}`);
    console.error('usage: yarn start_claims MiningConfig.json <portOffset>');
    process.exit(1);
}

start(process.argv[2]);
