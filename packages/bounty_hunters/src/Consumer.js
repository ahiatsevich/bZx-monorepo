const BigNumber = require("bignumber.js");

const { Logger } = require("./LoggerFactory");
const { publishLiquidationRequest } = require("./Producer");
const consts = require("./../consts");

const liquidateLoan = async (bzx, sender, loanOrderHash, trader, blockNumber, redis, redlock, queue, amount, force, idx) => {
  const logs = [];
  const errorLogs = [];
  const log = () => {
    Logger.log("consumer", `Liquidation of ${loanOrderHash} :: ${trader}`);
    for (let _log of logs) {
      Logger.log("consumer", _log);
    }
    for (let _log of errorLogs) {
      Logger.log("consumer-error", _log);
    }
  };
  if (!force) {
    logs.push(`Liquidity check block number: ${blockNumber}`);
    try {
      const currentBlockNumber = await bzx.web3.eth.getBlockNumber();
      logs.push(`Current block number: ${currentBlockNumber}`);
      if (blockNumber < (currentBlockNumber - consts.maxBlocksDelay) && !force) {
        logs.push(`Liquidation request is OLD!!! SKIPPING\n`);
        log();
        return;
      }
    } catch (error) {
      errorLogs.push(`Block number validation error! -> ${error.message}`);
    }
  }

  logs.push(`Attempting to liquidate...`);
  const txOpts = {
    from: sender,
    gasPrice: BigNumber(bzx.gasPrice || consts.defaultGasPrice).times(consts.gasPriceMultiplier)
  };

  const txObj = await bzx.liquidateLoan(loanOrderHash, trader, amount, true);

  try {
    const gasEstimate = await txObj.estimateGas(txOpts);
    txOpts.gas = Math.round(gasEstimate + gasEstimate * 0.2);
    const request = txObj.send(txOpts);
    request.once("transactionHash", hash => {
      logs.push(`Transaction submitted. Tx hash: ${hash}`);
    });

    await request;

    if (amount != 0) {
      const remaining = await bzx.getCloseAmount(loanOrderHash, trader);
      if (remaining != 0) {
        logs.push(`OK. Attempting to liquidate remaining amount ${remaining}`);
        const request = { blockNumber, loanOrderHash, sender, trader, amount: 0, force: true };
        publishLiquidationRequest(idx, redis, redlock, queue, request);
      }
    } else {
      logs.push(`Liquidation complete!\n`);
    }
  } catch (error) {
    if (error.message.search('out of gas') >= 0)
    {
      if (amount === 0) {
        amount = await bzx.getCloseAmount(loanOrderHash, trader);
      }
      const oldAmount = amount;
      amount = (new BigNumber(amount)).div(2).integerValue(BigNumber.ROUND_CEIL);

      logs.push(`OOG. Attempting to liquidate with a lower amount ${oldAmount} >> ${amount}`);

      const request = { blockNumber, loanOrderHash, sender, trader, amount, force: true };
      publishLiquidationRequest(idx, redis, redlock, queue, request);
    } else {
      errorLogs.push(`${error.message}\n`);
    }
  }

  log();
};

const processLiquidationQueue = async (bzx, redis, redlock, processorNumber, job, done, queue) => {
  Logger.log(
    "consumer-queue",
    `processing(${processorNumber}) prepare ${job.data.blockNumber.toString()}:${job.data.loanOrderHash}`
  );

  await redlock.lock("bzx:processing:lock", 100).then(lock => {
    redis.set(`bzx:liquidate:${job.data.loanOrderHash}:${job.data.trader}`, 1, "EX", 20000);
    lock.unlock();
  });

  Logger.log(
    "consumer-queue",
    `processing(${processorNumber}) start ${job.data.blockNumber.toString()}:${job.data.loanOrderHash}`
  );

  await liquidateLoan(
    bzx,
    job.data.sender,
    job.data.loanOrderHash,
    job.data.trader,
    job.data.blockNumber,
    redis,
    redlock,
    queue,
    job.data.amount || 0,
    job.data.force || false,
    job.data.idx
  );

  Logger.log(
    "consumer-queue",
    `processing(${processorNumber}) done ${job.data.blockNumber.toString()}:${job.data.loanOrderHash}`
  );

  redlock.lock("bzx:processing:lock", 100).then(lock => {
    redis.del(`bzx:liquidate:${job.data.loanOrderHash}:${job.data.trader}`).then(() => {
      done();
    });
    lock.unlock();
  });

  Logger.log(
    "consumer-queue",
    `processing(${processorNumber}) finished ${job.data.blockNumber.toString()}:${job.data.loanOrderHash}`
  );
};

module.exports = {
  processLiquidationQueue
};
