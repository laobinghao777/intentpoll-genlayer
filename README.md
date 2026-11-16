# IntentPoll — your words, your choice

Live application: https://genlayer-proofwork.sillynightingale1.chatgpt.site/intentpoll

Bradbury Phase 2 contract (chain 4221): https://scan.bradbury.genlayer.com/address/0xa395Cf3019C8720Ba2aFCCfe62DB65cd896aF6cE

IntentPoll is a complete wallet-based preference workspace. It addresses an authorization problem in AI-assisted polling: a classifier's interpretation of a message should not automatically become a counted vote. GenLayer independently interprets free text against committed options; only the originating wallet can confirm that interpretation. An ambiguous or unconfirmed suggestion contributes zero.

## Use the application

1. Open the live app without a wallet to inspect polls, frozen options, current tallies and the public consent ledger. Expand an address to inspect original text, revisions, interpretation and consent events. Copy a public link or export JSON.
2. Connect an EIP-1193 wallet with Bradbury test GEN. Create a poll with a clear question and 2–6 distinct options, or choose an existing open poll. The creator cannot edit committed options.
3. Commit a free-text preference. Choose **Interpret my text** to run independent GenLayer intent consensus. Inspect the suggested option and original message.
4. If the interpretation matches your intent, choose **Confirm option N**. Only this explicit wallet transaction enters the latest revision into the tally. Ambiguous results cannot be confirmed.
5. Before closure, withdraw or commit revised text if needed. A new revision immediately removes an older confirmation. Earlier text and event history remain public. Only the poll creator can close the prototype; closure freezes all ballot changes.

The hosted Worker is a keyless read/estimation relay and asset server. Browser writes are signed and broadcast by the user's wallet. Pending transaction IDs persist locally; checks resume the original request rather than resending. An unknown wallet response remains blocked pending explicit transaction-ID reconciliation. A success message requires FINALIZED + MAJORITY_AGREE + accepted + FINISHED_WITH_RETURN, followed by a state read.

## Contract and consensus design

`create_poll` commits question/options and their SHA-256 snapshot. `cast_ballot` appends a new wallet-owned revision with its original text hash. `classify` independently maps the text to a one-based option ID, or 0 when the preference is not uniquely established. The prompt treats all inputs as untrusted data and handles negation, abstention, equal alternatives and unrelated messages conservatively. Shape checks reject booleans/out-of-range IDs and fabricated quotations. Valid quotations are canonicalized to entire original messages so stable `strict_eq` consensus compares decision IDs rather than arbitrary quote wording.

`confirm` requires the sender's current revision to be classified with an option ID greater than zero. `withdraw` removes its current contribution. The tally is computed deterministically from only the last revision per address when its status is confirmed. No operator can confirm or withdraw another wallet's ballot; the creator's only special control is closing the poll. No contract method edits options or deletes prior revisions.

## Limits and honest interpretation

This is an open **wallet preference prototype**, not a verified-person election. One address is not one human; there is no Sybil resistance, eligibility gate, anti-bribery system, secret ballot or guaranteed voting window. The creator can close immediately, including while votes await interpretation or consent. Every ballot and address is public. Limits are 30 addresses per poll and 3 text revisions per address, to bound state and model inputs. A wallet can still withdraw its latest ballot after using its revisions while the poll remains open.

Consensus may misinterpret intent. The consent step lets the originating wallet reject the interpretation, revise within the cap or withdraw. It does not prove a person read carefully or controls only one address. Do not use this prototype for binding elections or high-stakes allocation. The seeded documentation-format poll is a synthetic example using **one builder wallet**, not real community participation or adoption. No rewards, production usage or returns are claimed.

## Reproduce

```sh
python tests.py
npm ci --ignore-scripts
node --test receipt-policy.test.mjs
# Set GENLAYER_PRIVATE_KEY_FILE to your own ignored Bradbury test-wallet key file.
npm run deploy
npm run demo
```

25 Python business-rule tests cover zero counts before consent, no double counting, ambiguous results, revision/withdrawal accounting, sender authorization, closure, independent addresses, option bounds/deduplication, strict IDs, quote provenance, revision limits, atomic independent disagreement and preserved hashes. The SDK stub isolates deterministic rules; it does not pretend to simulate the live validator network. Four Node regressions separately check consensus/execution receipts.

The live demo creates a synthetic two-option poll, commits a preference for an interactive walkthrough, classifies it, asserts that the tally is still zero, then confirms and asserts a single current-wallet count. It refuses a duplicate start. If interrupted, reconcile with `node scripts/run.mjs`; do not blindly rerun the demo. Backend scripts verify the network genesis and manager, cap signed transactions at 0.3 test GEN, protocol deposits at 0.2 and session balance loss at 1. Keys and local signer ledgers are ignored.

`node read.mjs` reads the published deployment without loading a private key. Public `before-confirmation.json`, `demo-result.json` and `deployment.json` are generated after successful execution and retain the before/after consent state and transaction costs.

## Rebuild the frontend

The standalone `web/` folder contains all browser UI, styling, wallet actions, the public RPC relay, pinned dependencies and Worker build scripts. Run `npm ci --ignore-scripts`, `npm run build`, then `npm run preview` inside that folder. No backend signing key or runtime secret is required. The optional public contract constant can be changed to your own deployment. The hosted shared origin also retains the earlier, separately submitted applications.

MIT license. IntentPoll is a new application and contract with a different state machine and use case; it does not resubmit an existing standalone primitive.
