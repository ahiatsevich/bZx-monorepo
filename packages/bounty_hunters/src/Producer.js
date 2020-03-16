const BigNumber = require("bignumber.js");
const moment = require("moment");
const { Logger } = require("./LoggerFactory");
const consts = require("./../consts");

const getIsLiquidationInProgress = (redis, loanOrderHash, trader) => redis.get(`bzx:liquidate:${loanOrderHash}:${trader}`);

const publishLiquidationRequest = (idx, redis, redlock, liquidateQueue, request) => {
  request.idx = idx;
  redlock.lock("bzx:processing:lock", 250).then(lock => {
    if (request.force) {
      liquidateQueue.add(request).then(() => lock.unlock());
      return;
    }
    getIsLiquidationInProgress(redis, request.loanOrderHash, request.trader).then(e => {
      if (e) {
        Logger.log("consumer", `${idx} :: submit skip ${request.blockNumber}:${request.loanOrderHash}`);
        lock.unlock();
      } else {
        liquidateQueue.add(request).then(() => lock.unlock());
      }
    });
  });
};

const processBatchOrders = (bzx, redis, redlock, queue, blockNumber, sender, loansObjArray, position) => {
  /* eslint no-plusplus: ["producer-error", { "allowForLoopAfterthoughts": true }] */
  const promises = [];
  for (let i = 0; i < loansObjArray.length; i++) {
    const { loanOrderHash, trader, loanEndUnixTimestampSec } = loansObjArray[i];
    const idx = position + i;

    promises.push(new Promise((resolve) => {
      getIsLiquidationInProgress(redis, loanOrderHash).then(isLiquidationInProgress => {
        if (isLiquidationInProgress) {
          return;
        }
        return bzx.getMarginLevels(loanOrderHash, trader);
      }).then(marginData => {

        if (!marginData) {
          marginData = {
            initialMarginAmount: 0,
            maintenanceMarginAmount: 0,
            currentMarginAmount: 0
          }
        }

        const { initialMarginAmount, maintenanceMarginAmount, currentMarginAmount } = marginData;

        const isUnSafe = !BigNumber(currentMarginAmount).gt(maintenanceMarginAmount);

        const expireDate = moment(loanEndUnixTimestampSec * 1000).utc();
        const isExpired = moment(moment().utc()).isAfter(expireDate);

        if (isExpired || isUnSafe) {
          Logger.log("producer", `${idx} :: loan ${loanOrderHash}::${trader}::${loanEndUnixTimestampSec}`);
          Logger.log(
            "producer",
            `${idx} :: initial/maintenance/current ${initialMarginAmount}/${maintenanceMarginAmount}/${currentMarginAmount}`
          );
          Logger.log("producer", `${idx} :: Loan is not safe. Processing ${blockNumber}\n`);
          publishLiquidationRequest(idx, redis, redlock, queue, { blockNumber, loanOrderHash, sender, trader });
        } else {
          Logger.log("producer", `${idx} :: Loan ${loanOrderHash}::${trader} is safe.\n`);
        }
        resolve();
      }).catch(error => {
        Logger.log("producer", `${idx} :: loan ${loanOrderHash}::${trader}::${loanEndUnixTimestampSec}`);
        Logger.log("producer-error", "processBatchOrders catch");
        Logger.log("producer-error", error);
        resolve();
      });
    }));
  }
  return Promise.all(promises);
};

const processBlockLoans = async (bzx, redis, redlock, queue, sender) => {
  let position = 0;

  // noinspection ES6MissingAwait
  bzx.getGasPrice();

  while (true) {
    try {
      const blockNumber = await bzx.web3.eth.getBlockNumber();
      Logger.log("producer", `Next batch. Current block: ${blockNumber}`);
      Logger.log("producer", `Sender account: ${sender}\n`);

      const loansObjArray = await bzx.getActiveLoans(position, consts.batchSize);

      await processBatchOrders(bzx, redis, redlock, queue, blockNumber, sender, loansObjArray, position);
      if (loansObjArray.length < consts.batchSize) {
        break;
      } else {
        position += consts.batchSize;
      }
    } catch (error) {
      Logger.log("producer-error", "processBlockOrders catch");
      Logger.log("producer-error", error);
    }
  }
};

module.exports = {
  processBlockLoans,
  publishLiquidationRequest
};
