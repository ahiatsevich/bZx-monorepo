const minimist = require("minimist");
const { pipe, map } = require("ramda");

const snooze = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const idleCycle = async () => {
  // noinspection InfiniteLoopJS
  while (true) {
    await snooze(1000);
  }
};

const getNetworkNameFromCommandLineParams = () => {
  // processing command-line arguments (network)
  let { network } = minimist(process.argv.slice(2));

  // eslint-disable-next-line eqeqeq
  if (network === undefined || network == true) {
    network = "development";
  }

  return network;
};

const HEX_RADIX = 16;
const prepend0x = arg => `0x${arg}`;
const remove0xPrefix = data => (data ? data.substr(2) : "");
const substr24 = arg => arg.substr(24);
const parseIntHex = arg => parseInt(arg, HEX_RADIX);

const SOLIDITY_TYPE_MAX_CHARS = 64;
const makeCheckProperObjCount = numFields => data => {
  const objCount = data.length / SOLIDITY_TYPE_MAX_CHARS / numFields;
  if (objCount % 1 !== 0)
    throw new Error("Data length invalid, must be whole number of objects");
  return data;
};
const makeGetOrderObjArray = numFields => data =>
  data.match(new RegExp(`.{1,${numFields * SOLIDITY_TYPE_MAX_CHARS}}`, "g"));

const NUM_LOAN_FIELDS = 3;
const checkProperObjCount = makeCheckProperObjCount(
  NUM_LOAN_FIELDS
);
const getOrderObjArray = makeGetOrderObjArray(
  NUM_LOAN_FIELDS
);

const getOrderParams = data =>
  data.match(new RegExp(`.{1,${SOLIDITY_TYPE_MAX_CHARS}}`, "g"));

const getLoan = params => ({
  loanOrderHash: prepend0x(params[0]),
  trader: pipe(
    substr24,
    prepend0x
  )(params[1]),
  loanEndUnixTimestampSec: parseIntHex(params[2])
});

const cleanData = raw =>
  raw
    ? pipe(
      remove0xPrefix,
      checkProperObjCount,
      getOrderObjArray,
      map(
        pipe(
          getOrderParams,
          getLoan
        )
      )
    )(raw)
    : [];

module.exports = {
  snooze,
  idleCycle,
  getNetworkNameFromCommandLineParams,
  cleanData
};
