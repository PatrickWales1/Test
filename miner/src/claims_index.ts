import * as fs from 'fs';
import { Readable } from 'stream';
import { ethers, Contract, Wallet, BigNumber } from 'ethers';
import { base64 } from '@scure/base';
import axios from 'axios';
import * as http_client from 'ipfs-http-client';
import Config from './config.json';
import { log } from './log';
import {
  dbGetJobs,
  dbGetTask,
  dbGetTaskInput,
  dbGetInvalidTask,
  dbGetSolution,
  dbGetContestation,
  dbGetContestationVotes,
  dbStoreTask,
  dbStoreInvalidTask,
  dbStoreTaskInput,
  dbStoreSolution,
  dbStoreContestation,
  dbStoreContestationVote,
  dbStoreFailedJob,
  dbQueueJob,
  dbDeleteJob,
  dbClearJobsByMethod,
  dbUpdateTaskSetRetracted,
  dbGetClaimsJobs,
} from './db';

import {
  // AnythingV3Model,
  // ZeroscopeModel,
  Kandinsky2Model,
  getModelById,
  checkModelFilter,
  hydrateInput,
} from './models';

import { pinFileToIPFS, pinFilesToIPFS } from './ipfs';

import {
  sleep,
  now,
  taskid2Seed,
  expretry,
  generateCommitment,
} from './utils';

import {
  MiningConfig,
  Task,
  Solution,
  Job,
  Model,
  QueueJobProps,
  DBTask,
  DBInvalidTask,
  DBSolution,
  DBContestation,
  DBContestationVote,
  DBTaskInput,
  DBJob,
} from './types';

import { c } from './mc';

import { replicate } from './ml';

import {
  wallet,
  arbius,
  token,
  // governor,
  solver,
  getBlockNumber,
  depositForValidator,
  getValidatorStaked,
} from './blockchain';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';


export async function main() {
    // need extra for ethers
    log.debug("Setting max file listeners to 100 for ethers");
    process.setMaxListeners(50); // TODO: Update this for throughput

    log.debug("Bootup check");
    await versionCheck();
      
    arbius.on('VersionChanged', async(
      version: ethers.BigNumber,
      evt:     ethers.Event,
    ) => {
      log.debug('Event.VersionChanged', version.toString());
      await versionCheck();
    });
  
    // job processor / main loop
    while (true) {
      const jobs = await dbGetClaimsJobs(20);
      log.debug(`OUR-LOGS: ALL JOBS ${JSON.stringify(jobs)}`);
      if (jobs.length === 0) {
        await sleep(100);
        continue;
      }
  
      log.debug(`Job queue has ${jobs.length} jobs`);
      await processAllClaims(jobs);
    }
}
    
async function processAllClaims(claims: DBJob[]) { 
    for (const claim of claims) {
      const decoded = JSON.parse(claim.data);
      log.debug(`OUR-LOGS: (6) START: processAllClaims ${JSON.stringify(decoded)}`);
      await processClaim(decoded.taskid);
    }
}

function versionCheck() {
    throw new Error('Function not implemented.');
}


async function processClaim(taskid: string) {
    const receipt = await expretry(async () => {
        const { claimed } = await expretry(async () => await arbius.solutions(taskid));
        log.debug("processClaim [claimed]", claimed);
        if (claimed) {
        log.warn(`Solution (${taskid}) already claimed`);
        return null;
        }

        const { validator: contestationValidator } = await expretry(async () => await arbius.contestations(taskid));
        log.debug("processClaim [contestationValidator]", contestationValidator);
        if (contestationValidator != "0x0000000000000000000000000000000000000000") {
        log.error(`Contestation found for solution ${taskid}, cannot claim`);

        return null;
        }

        const tx = await arbius.claimSolution(taskid, {
        gasLimit: 300_000,
        });
        const receipt = await tx.wait()
        log.info(`Claim ${taskid} in ${receipt.transactionHash}`);
        return receipt;
    });

    if (receipt == null) {
        log.error(`Failed claiming (${taskid})`);
        return;
    }

    log.debug(`Solution (${taskid}) claimed`);
}