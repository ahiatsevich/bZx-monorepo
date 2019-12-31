const BigNumber = require("bignumber.js");
const { cleanData } = require("./Utils");

const addresses = {
  1: "0x1Cf226E9413AddaF22412A2E182F9C0dE44AF002",
  42: "0x9009e85a687b55b5d6C314363C228803fAd32d01"
};

const abi = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "start",
        "type": "uint256"
      },
      {
        "name": "count",
        "type": "uint256"
      }
    ],
    "name": "getActiveLoans",
    "outputs": [
      {
        "name": "",
        "type": "bytes"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "loanOrderHash",
        "type": "bytes32"
      },
      {
        "name": "trader",
        "type": "address"
      }
    ],
    "name": "getMarginLevels",
    "outputs": [
      {
        "name": "initialMarginAmount",
        "type": "uint256"
      },
      {
        "name": "maintenanceMarginAmount",
        "type": "uint256"
      },
      {
        "name": "currentMarginAmount",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "loanOrderHash",
        "type": "bytes32"
      },
      {
        "name": "trader",
        "type": "address"
      },
      {
        "name": "maxCloseAmount",
        "type": "uint256"
      }
    ],
    "name": "liquidatePosition",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "loanOrderHash",
        "type": "bytes32"
      },
      {
        "name": "trader",
        "type": "address"
      }
    ],
    "name": "getCloseAmount",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

class BZx {
  constructor(_web3, networkId) {
    this.web3 = _web3;
    this.contract = new _web3.eth.Contract(abi, addresses[networkId]);
  }

  async getActiveLoans(start, count) {
    const data = await this.contract.methods.getActiveLoans(
      this.web3.utils.toBN(start).toString(10),
      this.web3.utils.toBN(count).toString(10)
    ).call();

    return cleanData(data);
  }

  async getMarginLevels(loanOrderHash, trader) {
    const data = await this.contract.methods
      .getMarginLevels(loanOrderHash, trader)
      .call();
    return {
      initialMarginAmount: data[0],
      maintenanceMarginAmount: data[1],
      currentMarginAmount: data[2]
    };
  }

  async getCloseAmount(loanOrderHash, trader) {
    return new BigNumber(await this.contract.methods
      .getCloseAmount(loanOrderHash, trader)
      .call());
  }

  async liquidateLoan(loanOrderHash, trader, liquidateAmount, getObject) {
    const txObj = this.contract.methods.liquidatePosition(
      loanOrderHash,
      trader,
      liquidateAmount ? liquidateAmount : "0"
    );
    if (getObject) {
      return txObj;
    }
    return txObj.send(txOpts);
  }
}

async function getBZX(web3) {
  const networkId = await web3.eth.net.getId();
  return new BZx(web3, networkId);
}

module.exports = {
  getBZX
};
