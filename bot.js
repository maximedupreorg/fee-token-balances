const Web3 = require("web3");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const { createObjectCsvWriter } = require("csv-writer");

dotenv.config();

const CONTRACT_ADDRESS = "0x2b13B338C6b1eA7baaB370bEfde57C2A87F9848e";

const web3 = new Web3(
    `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_RINKEBY}`,
);

(async () => {
    const contractAbiRes = await fetch(
        `https://api-rinkeby.etherscan.io/api?module=contract&action=getabi&&address=${CONTRACT_ADDRESS}&apikey=${process.env.ETHERSCAN_API_KEY}`,
    );

    const contractAbi = await contractAbiRes.json();

    const contract = new web3.eth.Contract(
        JSON.parse(contractAbi.result),
        CONTRACT_ADDRESS,
    );

    const events = await contract.getPastEvents("Transfer", {
        fromBlock: "earliest",
        toBlock: "latest",
    });

    const toAddresses = events.map((e) => e.returnValues.to);
    const baseAddresses = [
        process.env.TREASURY_WALLET,
        process.env.DISTRIBUTION_WALLET,
        process.env.TEAM_WALLET,
    ];
    const allAddresses = [...toAddresses, ...baseAddresses].map((a) =>
        a.toLowerCase(),
    );
    const uniqAddresses = [...new Set(allAddresses)];

    const csvWriter = createObjectCsvWriter({
        path: "data.csv",
        header: [
            { id: "holderAddress", title: "HolderAddress" },
            { id: "balance", title: "Balance" },
            { id: "pendingBalanceUpdate", title: "PendingBalanceUpdate" },
        ],
    });

    const records = [];

    for (let a of uniqAddresses) {
        records.push({
            holderAddress: a,
            balance: (await contract.methods.balanceOf(a).call()) / 10 ** 9,
            pendingBalanceUpdate: "No",
        });
    }

    await csvWriter.writeRecords(records); // returns a promise
})();
