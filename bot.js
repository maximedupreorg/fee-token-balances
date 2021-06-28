const Web3 = require("web3");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const { createObjectCsvWriter } = require("csv-writer");

dotenv.config();

const web3 = new Web3(process.env.ALCHEMY_API_KEY_URL);

(async () => {
    const contractAbiRes = await fetch(
        `${process.env.ETHERSCAN_API_ENDPOINT}?module=contract&action=getabi&&address=${process.env.CONTRACT_ADDRESS}&apikey=${process.env.ETHERSCAN_API_KEY}`,
    );

    const contractAbi = await contractAbiRes.json();

    const contract = new web3.eth.Contract(
        JSON.parse(contractAbi.result),
        process.env.CONTRACT_ADDRESS,
    );

    const events = await contract.getPastEvents("Transfer", {
        fromBlock: "earliest",
        toBlock: "latest",
    });

    const toAddresses = events.map((e) => e.returnValues.to.toLowerCase());
    const combinedAddresses = [...toAddresses, process.env.TREASURY_WALLET];
    const uniqAddresses = [...new Set(combinedAddresses)];

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

    await csvWriter.writeRecords(records);
})();
