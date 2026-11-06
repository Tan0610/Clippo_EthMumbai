import { createWalletClient, http, keccak256, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getOverride, requireEnv } from "../config";
import { ApiError } from "../http";
import { publicClient } from "./clients";
import { arcChain, chainConfig } from "./config";
import { escrowAbi } from "./escrow-abi";

/** Signed by Clippo's key after the backend validated a World ID result. The contract checks it (see ClippoEscrow.HumanProof). */
export interface HumanProof {
  human: Hex;
  expiresAt: string;
  signature: Hex;
}

export const KIND_CAMPAIGN = 1;
export const KIND_SPLIT = 2;
const PROOF_TTL_SECONDS = 30 * 60;

/** Stable bytes32 for one World ID human: a one-way hash of the verifier's identifier, so the identifier stays off-chain. */
export const humanHash = (id: string) => keccak256(toHex(`clippo:human:v1|${id.trim().toLowerCase()}`));

/**
 * Clippo's backend wallet (HUMAN_ATTESTOR_PRIVATE_KEY). The contract gives it two powers only: attest that a World ID check
 * passed, and trigger a payout that can only reach the creator who earned it. It cannot choose who gets paid. It pays the gas.
 */
export interface ClippoWallet {
  signApproval(p: { campaignId: bigint; kind: number; subject: Hex; approver: string; human: Hex }): Promise<HumanProof>;
  /** Link a wallet to its human on-chain if it is not linked yet. Returns the tx hash, or null when already linked. */
  ensureHuman(wallet: string, identifier: string): Promise<string | null>;
  /** Send a creator's claimable money to that creator. */
  claimFor(campaignId: bigint, creator: string): Promise<string>;
}

const ZERO = `0x${"0".repeat(64)}`;

export function clippoWallet(): ClippoWallet {
  const o = getOverride<ClippoWallet>("clippoWallet");
  if (o) return o;
  const key = requireEnv("Clippo's backend wallet", "HUMAN_ATTESTOR_PRIVATE_KEY");
  const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as Hex);
  const cfg = chainConfig();
  if (!cfg.escrow) throw new ApiError(503, "CHAIN_NOT_CONFIGURED", "ESCROW_ADDRESS is not configured");
  const escrow = cfg.escrow;
  const domain = { name: "ClippoEscrow", version: "1", chainId: cfg.chainId, verifyingContract: escrow } as const;
  const wallet = createWalletClient({ account, chain: arcChain(cfg), transport: http(cfg.rpcUrl) });
  const pc = publicClient();
  const expiry = () => BigInt(Math.floor(Date.now() / 1000) + PROOF_TTL_SECONDS);

  const proofOf = (human: Hex, expiresAt: bigint, signature: Hex): HumanProof => ({ human, expiresAt: expiresAt.toString(), signature });

  return {
    async signApproval({ campaignId, kind, subject, approver, human }) {
      const expiresAt = expiry();
      const signature = await account.signTypedData({
        domain,
        types: {
          HumanApproval: [
            { name: "campaignId", type: "uint256" },
            { name: "kind", type: "uint8" },
            { name: "subject", type: "bytes32" },
            { name: "approver", type: "address" },
            { name: "human", type: "bytes32" },
            { name: "expiresAt", type: "uint64" },
          ],
        },
        primaryType: "HumanApproval",
        message: { campaignId, kind, subject, approver: approver as Hex, human, expiresAt },
      });
      return proofOf(human, expiresAt, signature);
    },
    async ensureHuman(walletAddress, identifier) {
      const human = humanHash(identifier);
      const current = await pc.readContract({ address: escrow, abi: escrowAbi, functionName: "humanOf", args: [walletAddress as Hex] });
      if (current !== ZERO) {
        if (current === human) return null;
        throw new ApiError(409, "ALREADY_USED", "This wallet is already linked to a different World ID on-chain");
      }
      const expiresAt = expiry();
      const signature = await account.signTypedData({
        domain,
        types: {
          HumanRegistration: [
            { name: "wallet", type: "address" },
            { name: "human", type: "bytes32" },
            { name: "expiresAt", type: "uint64" },
          ],
        },
        primaryType: "HumanRegistration",
        message: { wallet: walletAddress as Hex, human, expiresAt },
      });
      const hash = await wallet.writeContract({
        address: escrow,
        abi: escrowAbi,
        functionName: "registerHuman",
        args: [walletAddress as Hex, { human, expiresAt, signature }],
      });
      const r = await pc.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new ApiError(502, "HUMAN_LINK_FAILED", "Could not link this wallet to its World ID on-chain");
      return hash;
    },
    async claimFor(campaignId, creator) {
      const hash = await wallet.writeContract({ address: escrow, abi: escrowAbi, functionName: "claimFor", args: [campaignId, creator as Hex] });
      const r = await pc.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new ApiError(422, "TX_REVERTED", "The payout transaction reverted on-chain");
      return hash;
    },
  };
}

export const toChainProof = (p: HumanProof) => ({ human: p.human, expiresAt: BigInt(p.expiresAt), signature: p.signature });
