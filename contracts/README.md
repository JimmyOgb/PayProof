# PayProof Smart Contracts

This directory contains smart contract interfaces, ABIs, and any optional on-chain payment escrow/settlement contracts for PayProof on Arc mainnet.

## Official Arc Mainnet Predeployed Contracts

* **USDC ERC-20 Interface**: `0x3600000000000000000000000000000000000000`
* **Native Currency**: USDC (18 decimals at the EVM gas level)

## Direct Transfers vs. Contract Routing

PayProof supports direct peer-to-peer merchant settlement (customer wallet → merchant address) and can optionally route through an escrow or payment router contract with payment reference hashes.
