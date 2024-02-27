import * as child_process from 'child_process';
import * as fs from 'fs';
import { initializeLogger, log } from './log';
import { c, initializeMiningConfig } from './mc';
import { initializeDatabase } from './db';
import { initializeML } from './ml';
import { initializeBlockchain, wallet } from './blockchain';
import { initializeRPC } from './rpc';
import { main } from './miner_index';

async function start(configPath: string) {
  try {
    const mconf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    initializeMiningConfig(mconf);
  } catch (e) {
    console.error(`unable to parse ${configPath}`);
    process.exit(1);
  }
  
  let portOffset = parseInt(process.argv[3]);
  let logPath = `log_miner_${portOffset}.txt`;
  initializeLogger(logPath);

  log.debug(`Starting RPC on port ${c.rpc.port + portOffset}`);  


  try {
    const rev = child_process.execSync('git rev-parse HEAD').toString().trim();
    log.info(`Arbius Miner ${rev.substring(0, 8)} starting`);
  } catch (e) {
    log.warn('Could not run "git rev-parse HEAD" do you have git in PATH?');
  }

  log.debug(`Logging to ${logPath}`);
 
  log.debug('!!!!!!!!!!!!! NOT RESETTING THE DB - so we dont lose claims !!!!!!!!!!!!!!!!')
  log.debug(`starting to load db from ${c.db_path}`);
  // await initializeDatabase(c);
  // log.debug(`Database loaded from ${c.db_path}`);

  await initializeML(c);
  log.debug(`ML initialized`);
  
  await initializeBlockchain();
  log.debug(`Loaded wallet (${wallet.address})`);

  log.debug(`Starting RPC on port ${c.rpc.port + portOffset}`)
  await initializeRPC(c.rpc.port + portOffset, c.rpc.host);
  log.debug(`RPC initialized`);

  await main();
  process.exit(0);
}

if (process.argv.length < 4) {
  console.error('usage: yarn start_miner MiningConfig.json  <portOffset>');
  process.exit(1);
}

let isPortInvalid = !process.argv?.[3] || isNaN(parseInt(process.argv[3]));
if (isPortInvalid) {
  console.error(`port offset is invalid: ${process.argv?.[3]}`);
  console.error('usage: yarn start_miner MiningConfig.json <portOffset>');
  process.exit(1);
}

start(process.argv[2]);
