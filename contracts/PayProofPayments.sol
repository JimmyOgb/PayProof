// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @dev Minimal interface for standard ERC-20 token interactions.
 */
interface IERC20 {
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title PayProofPayments
 * @notice Minimal, non-custodial on-chain payment settlement layer for PayProof on Arc Mainnet.
 * @dev Settles payments using the official Arc Mainnet USDC contract (0x3600000000000000000000000000000000000000).
 *      No intermediate funds custody, no fees, no owner privileges, and no upgradeable proxies.
 */
contract PayProofPayments {
    /// @notice The official Arc Mainnet USDC token contract.
    IERC20 public immutable usdcToken;

    /// @notice The official Arc Mainnet chain ID (5042).
    uint256 public immutable arcChainId;

    /// @notice Stored on-chain payment record.
    struct Payment {
        address merchant;
        uint256 amount;
        uint256 expiry;
        bytes32 requestHash;
        bool paid;
    }

    /// @notice Mapping from unique payment ID to Payment record.
    mapping(bytes32 => Payment) public payments;

    /// @notice Emitted when a merchant initializes a payment request on-chain.
    event PaymentCreated(
        bytes32 indexed paymentId,
        address indexed merchant,
        uint256 amount,
        uint256 expiry,
        bytes32 requestHash
    );

    /// @notice Emitted when a customer pays the requested payment.
    event PaymentCompleted(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed merchant,
        uint256 amount,
        bytes32 requestHash
    );

    // Custom errors for gas efficiency and clear reverts
    error InvalidTokenAddress();
    error InvalidMerchantAddress();
    error ZeroAmount();
    error ExpiryNotInFuture();
    error PaymentAlreadyExists();
    error PaymentDoesNotExist();
    error PaymentAlreadyPaid();
    error PaymentExpired();
    error IncorrectPaymentAmount();
    error USDCTransferFailed();

    /**
     * @param _usdc Address of official Arc Mainnet USDC (0x3600000000000000000000000000000000000000).
     */
    constructor(address _usdc) {
        if (_usdc == address(0)) revert InvalidTokenAddress();
        usdcToken = IERC20(_usdc);
        arcChainId = block.chainid;
    }

    /**
     * @notice Registers a new payment request on-chain.
     * @param paymentId Unique payment identifier (bytes32).
     * @param merchant The recipient wallet receiving the settlement.
     * @param amount The exact payment amount in USDC base units.
     * @param expiry Expiration timestamp (Unix epoch seconds).
     * @param requestHash Off-chain canonical integrity checksum hash.
     */
    function createPayment(
        bytes32 paymentId,
        address merchant,
        uint256 amount,
        uint256 expiry,
        bytes32 requestHash
    ) external {
        if (amount == 0) revert ZeroAmount();
        if (merchant == address(0)) revert InvalidMerchantAddress();
        if (expiry <= block.timestamp) revert ExpiryNotInFuture();
        if (payments[paymentId].merchant != address(0)) revert PaymentAlreadyExists();

        payments[paymentId] = Payment({
            merchant: merchant,
            amount: amount,
            expiry: expiry,
            requestHash: requestHash,
            paid: false
        });

        emit PaymentCreated(paymentId, merchant, amount, expiry, requestHash);
    }

    /**
     * @notice Settles an on-chain payment.
     * @dev Transfers USDC directly from msg.sender to the merchant using safe transfer verification.
     *      Follows Checks-Effects-Interactions pattern.
     * @param paymentId The unique payment identifier to settle.
     * @param amount The payment amount in USDC base units, matching the request.
     */
    function pay(bytes32 paymentId, uint256 amount) external {
        Payment storage paymentRecord = payments[paymentId];
        address merchant = paymentRecord.merchant;

        // 1. Checks
        if (merchant == address(0)) revert PaymentDoesNotExist();
        if (paymentRecord.paid) revert PaymentAlreadyPaid();
        if (block.timestamp > paymentRecord.expiry) revert PaymentExpired();
        if (amount != paymentRecord.amount) revert IncorrectPaymentAmount();

        bytes32 requestHash = paymentRecord.requestHash;

        // 2. Effects
        paymentRecord.paid = true;

        // 3. Interactions (direct settlement from payer to merchant)
        _safeTransferFrom(usdcToken, msg.sender, merchant, amount);

        emit PaymentCompleted(
            paymentId,
            msg.sender,
            merchant,
            amount,
            requestHash
        );
    }

    /**
     * @dev Internal helper executing safe ERC-20 transferFrom with return data check.
     */
    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value
    ) internal {
        (bool success, bytes memory data) = address(token).call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert USDCTransferFailed();
        }
    }
}
