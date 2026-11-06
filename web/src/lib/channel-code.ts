/**
 * Wallet-bound channel code. A creator proves a YouTube channel is theirs by pasting this code in the channel bio.
 * It contains the creator's wallet, so the Chainlink CRE nodes can check the binding themselves from the public bio,
 * without trusting Clippo's database for "which wallet owns this channel".
 */
export const channelCodeFor = (wallet: string) => `clippo:${wallet.toLowerCase()}`;

export const hasWalletBoundCode = (code: string, wallet: string) => code === channelCodeFor(wallet);

/** A verified YouTube channel still holding an old random code: CRE cannot bind it to a wallet until it is verified again. */
export const needsReverify = (ch: { platform: string; verified: boolean; verificationCode: string }, wallet: string) =>
  ch.platform === "YOUTUBE" && ch.verified && !hasWalletBoundCode(ch.verificationCode, wallet);
