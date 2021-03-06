/**
 * Copyright 2017–2018, bZeroX, LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
 
pragma solidity 0.4.24;
pragma experimental ABIEncoderV2;

import "../storage/BZxObjects.sol";


/**
    @title OracleInterface, an interface for bZx compatible oracle contracts

    This interface is meant to be inherited by contracts implementing a
    compatible oracle solution for bZx. The functions should provide logic
    for price discovery of ERC20 token pairs, and handle the trading of
    those pairs through an on-chain mechanism. All functions are called by bZx,
    so all must be implemented. If a function is unneeded in a particular
    use-case, simply return immediately, but with a True value for Boolean
    returns.

    Care should be taken to define appropriate levels of security to prevent
    unauthorized use to functions that would normally be called by the bZx
    calling contract. One way of doing this is with the Ownable contract from
    OpenZeppelin.

    !!! Safeguard of user funds should be of the utmost importance !!!
 */
// solhint-disable-next-line contract-name-camelcase
contract OracleInterface {

    /// @dev Called by bZx after a loan order is taken
    /// @param loanOrder The loanOrder object
    /// @param loanOrderAux The loanOrderAux object
    /// @param loanPosition The loanPosition object
    /// @param taker The user that filled/took the loan
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didTakeOrder(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanOrderAux memory loanOrderAux,
        BZxObjects.LoanPosition memory loanPosition,
        address taker,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a position token is traded
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didTradePosition(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after interest should be paid to a lender
    /// @dev Assume the interest token has already been transfered to
    /// @dev this contract before this function is called.
    /// @param loanOrder The loanOrder object
    /// @param lender The lender
    /// @param amountOwed The amount interest to pay
    /// @param convert A boolean indicating if the interest should be converted to Ether
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didPayInterest(
        BZxObjects.LoanOrder memory loanOrder,
        address lender,
        uint amountOwed,
        bool convert,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a borrower has deposited additional collateral
    /// @dev token for an open loan
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didDepositCollateral(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a borrower has withdrawn excess collateral
    /// @dev token for an open loan
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didWithdrawCollateral(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a borrower has changed the collateral token
    /// @dev used for an open loan
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didChangeCollateral(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a borrower has withdraw their profits, if any
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param profitAmount The amount of profit withdrawn
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didWithdrawProfit(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint profitAmount,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a loan is closed
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param loanCloser The user that closed the loan
    /// @param isLiquidation A boolean indicating if the loan was closed due to liquidation
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didCloseLoan(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        address loanCloser,
        bool isLiquidation,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a trader transfers their ownership of a position to a new trader
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param oldTrader The old trader of the position
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didChangeTraderOwnership(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        address oldTrader,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a lender transfers their ownership of a position to a new lender
    /// @param loanOrder The loanOrder object
    /// @param oldLender The old lender of the position
    /// @param newLender The new lender of the position
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didChangeLenderOwnership(
        BZxObjects.LoanOrder memory loanOrder,
        address oldLender,
        address newLender,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Called by bZx after a lender increases the fillable amount of a loan order already on chain and partially filled
    /// @param loanOrder The loanOrder object
    /// @param lender The lender
    /// @param loanTokenAmountAdded The amount of loan token that was added to the order
    /// @param totalNewFillableAmount The total fillable amount still available for this order
    /// @param gasUsed The initial used gas, collected in a modifier in bZx, for optional gas refunds
    /// @return Successful execution of the function
    function didIncreaseLoanableAmount(
        BZxObjects.LoanOrder memory loanOrder,
        address lender,
        uint loanTokenAmountAdded,
        uint totalNewFillableAmount,
        uint gasUsed)
        public
        returns (bool);

    /// @dev Places a manual on-chain trade with a liquidity provider
    /// @param sourceTokenAddress The token being sold
    /// @param destTokenAddress The token being bought
    /// @param sourceTokenAmount The amount of token being sold
    /// @return The amount of destToken bought
    function doManualTrade(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        public
        returns (uint);

    /// @dev Places an automatic on-chain trade with a liquidity provider
    /// @param sourceTokenAddress The token being sold
    /// @param destTokenAddress The token being bought
    /// @param sourceTokenAmount The amount of token being sold
    /// @return The amount of destToken bought
    function doTrade(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        public
        returns (uint);

    /// @dev Verifies a position has fallen below margin maintenance
    /// @dev then liquidates the position on-chain
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @return The amount of destToken bought
    function verifyAndLiquidate(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition)
        public
        returns (uint);

    /// @dev Liquidates collateral to cover loan losses and does any other processing required by the oracle
    /// @param loanOrder The loanOrder object
    /// @param loanPosition The loanPosition object
    /// @param loanTokenAmountNeeded The amount of loan token needed to cover losses
    /// @param isLiquidation A boolean indicating if the loan was closed due to liquidation
    /// @return loanTokenAmountCovered and collateralTokenAmountUsed
    function processCollateral(
        BZxObjects.LoanOrder memory loanOrder,
        BZxObjects.LoanPosition memory loanPosition,
        uint loanTokenAmountNeeded,
        bool isLiquidation)
        public
        returns (uint loanTokenAmountCovered, uint collateralTokenAmountUsed);

    /// @dev Checks if a position has fallen below margin
    /// @dev maintenance and should be liquidated
    /// @param loanOrderHash A unique hash representing the loan order
    /// @param trader The address of the trader
    /// @param loanTokenAddress The token that was loaned
    /// @param positionTokenAddress The token in the current position (could also be the loanToken)
    /// @param collateralTokenAddress The token used for collateral
    /// @param loanTokenAmount The amount of loan token
    /// @param positionTokenAmount The amount of position token
    /// @param collateralTokenAmount The amount of collateral token
    /// @param maintenanceMarginAmount The maintenance margin amount from the loan
    /// @return Returns True if the trade should be liquidated immediately
    function shouldLiquidate(
        bytes32 loanOrderHash,
        address trader,
        address loanTokenAddress,
        address positionTokenAddress,
        address collateralTokenAddress,
        uint loanTokenAmount,
        uint positionTokenAmount,
        uint collateralTokenAmount,
        uint maintenanceMarginAmount)
        public
        view
        returns (bool);

    /// @dev Gets the trade price and amount received from a trade of sourceToken for destToken
    /// @param sourceTokenAddress Token being sold
    /// @param destTokenAddress Token being bought
    /// @param sourceTokenAmount The amount of token being sold
    /// @return The trade rate
    function getTradeData(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        public
        view
        returns (uint sourceToDestRate, uint destTokenAmount);

    /// @dev Returns the profit/loss data for the current position
    /// @param positionTokenAddress The token in the current position (could also be the loanToken)
    /// @param loanTokenAddress The token that was loaned
    /// @param positionTokenAmount The amount of position token
    /// @param loanTokenAmount The amount of loan token
    /// @return isProfit, profitOrLoss (denominated in positionToken)
    function getProfitOrLoss(
        address positionTokenAddress,
        address loanTokenAddress,
        uint positionTokenAmount,
        uint loanTokenAmount)
        public
        view
        returns (bool isProfit, uint profitOrLoss);

    /// @dev Returns the current margin level for this particular loan/position
    /// @param loanTokenAddress The token that was loaned
    /// @param positionTokenAddress The token in the current position (could also be the loanToken)
    /// @param collateralTokenAddress The token used for collateral
    /// @param loanTokenAmount The amount of loan token
    /// @param positionTokenAmount The amount of position token
    /// @param collateralTokenAmount The amount of collateral token
    /// @return The current margin amount (a percentage -> i.e. 54350000000000000000 == 54.35%)
    function getCurrentMarginAmount(
        address loanTokenAddress,
        address positionTokenAddress,
        address collateralTokenAddress,
        uint loanTokenAmount,
        uint positionTokenAmount,
        uint collateralTokenAmount)
        public
        view
        returns (uint);

    /// @dev Checks if the ERC20 token pair is supported by the oracle
    /// @param sourceTokenAddress Token being sold
    /// @param destTokenAddress Token being bought
    /// @param sourceTokenAmount Amount of token being sold
    /// @return True if price discovery and trading is supported
    function isTradeSupported(
        address sourceTokenAddress,
        address destTokenAddress,
        uint sourceTokenAmount)
        public
        view
        returns (bool);
}
