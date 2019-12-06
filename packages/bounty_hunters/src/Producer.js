const BigNumber = require("bignumber.js");
const moment = require("moment");
const { Logger } = require("./LoggerFactory");
const consts = require("./../consts");

const getIsLiquidationInProgress = (redis, loanOrderHash) => redis.get(`bzx:liquidate:${loanOrderHash}`);

const publishLiquidationRequest = (idx, redis, redlock, liquidateQueue, request) => {
  redlock.lock("bzx:processing:lock", 250).then(lock => {
    getIsLiquidationInProgress(redis, request.loanOrderHash).then(e => {
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
  for (let i = 0; i < loansObjArray.length; i++) { // TODO @bshevchenko: refactor with queue?
    const { loanOrderHash, trader, loanEndUnixTimestampSec } = loansObjArray[i];
    const idx = position + i;
    promises.push(new Promise((resolve, reject) => {
      getIsLiquidationInProgress(redis, loanOrderHash).then(isLiquidationInProgress => {
        if (isLiquidationInProgress) {
          return;
        }
        return bzx.getMarginLevels({
          loanOrderHash,
          trader
        });
      }).then(marginData => {
        // logger.log("producer",  marginData);
        const { initialMarginAmount, maintenanceMarginAmount, currentMarginAmount } = marginData;

        const isUnSafe = !BigNumber(currentMarginAmount).gt(maintenanceMarginAmount);

        const expireDate = moment(loanEndUnixTimestampSec * 1000).utc();
        const isExpired = moment(moment().utc()).isAfter(expireDate);

        // TODO @bshevchenko: partial liquidations

        Logger.log("producer", `${idx} :: loanOrderHash: ${loanOrderHash}`);
        Logger.log("producer", `${idx} :: trader: ${trader}`);
        Logger.log("producer", `${idx} :: loanEndUnixTimestampSec: ${loanEndUnixTimestampSec}`);
        Logger.log("producer", `${idx} :: initialMarginAmount: ${initialMarginAmount}`);
        Logger.log("producer", `${idx} :: maintenanceMarginAmount: ${maintenanceMarginAmount}`);
        Logger.log("producer", `${idx} :: currentMarginAmount: ${currentMarginAmount}`);

        if (isExpired || isUnSafe) {
          Logger.log("producer", `${idx} :: Loan is not safe. Processing ${blockNumber}\n`);
          publishLiquidationRequest(idx, redis, redlock, queue, { blockNumber, loanOrderHash, sender, trader });
        } else {
          Logger.log("producer", `${idx} :: Loan is safe.\n`);
        }
        resolve();
      }).catch(error => {
        Logger.log("producer", `${idx} :: loanOrderHash: ${loanOrderHash}`);
        Logger.log("producer", `${idx} :: trader: ${trader}`);
        Logger.log("producer", `${idx} :: loanEndUnixTimestampSec: ${loanEndUnixTimestampSec}`);
        Logger.log("producer-error", "processBatchOrders catch");
        Logger.log("producer-error", error);
        reject();
      });
    }));
  }
  return Promise.all(promises);
};

const processBlockLoans = async (bzx, redis, redlock, queue, sender) => {
  let position = 0;
  while (true) {
    try {
      const blockNumber = await bzx.web3.eth.getBlockNumber();
      Logger.log("producer", `Next batch. Current block: ${blockNumber}`);
      Logger.log("producer", `Sender account: ${sender}\n`);

      const loansObjArray = await bzx.getActiveLoans({
        start: position, // starting item
        count: consts.batchSize // max number of items returned
      });
      // logger.log("producer", loansObjArray);

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
  processBlockLoans
};
