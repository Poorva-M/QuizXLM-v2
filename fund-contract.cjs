const StellarSdk = require("@stellar/stellar-sdk");

const ADMIN_SECRET = "SAB26RDDQWZN2QZUFZH73XAKF46Q23QOOF4KA7BPMXW2RJQPEHGFZXJ2";
const CONTRACT_ID  = "CCIJOQK5P3NWF7NZKYVCTTMOQDSQDPWHEAQWPSBRTDAISDSUN736LSSG";
const HORIZON_URL  = "https://horizon-testnet.stellar.org";

const server  = new StellarSdk.Horizon.Server(HORIZON_URL);
const keypair = StellarSdk.Keypair.fromSecret(ADMIN_SECRET);

console.log("Funding contract:", CONTRACT_ID);

server.loadAccount(keypair.publicKey())
  .then((account) => {
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: CONTRACT_ID,
          asset:       StellarSdk.Asset.native(),
          amount:      "100",
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    return server.submitTransaction(tx);
  })
  .then((result) => {
    console.log("✅ Contract funded!");
    console.log("TX:", result.hash);
    console.log("🔗", `https://stellar.expert/explorer/testnet/tx/${result.hash}`);
  })
  .catch((error) => {
    console.error("❌ Error:", error?.response?.data?.extras?.result_codes || error.message);
  });