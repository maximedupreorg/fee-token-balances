const Web3 = require("web3");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const { createObjectCsvWriter } = require("csv-writer");

dotenv.config();

const FROM_BLOCK = +process.env.FROM_BLOCK;
const BSC_BLOCK_QUERY_LIMIT = 2000;
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

    const currentBlockNumber = await web3.eth.getBlockNumber();

    const blockDifference = currentBlockNumber - FROM_BLOCK;
    const nbQueries = Math.ceil(blockDifference / BSC_BLOCK_QUERY_LIMIT);
    const toAddresses = [];

    for (let i = 0; i < nbQueries; i++) {
        console.log(`Query ${i + 1}/${nbQueries}`);

        const queryFromBlock = FROM_BLOCK + i * BSC_BLOCK_QUERY_LIMIT;

        const events = await contract.getPastEvents("Transfer", {
            fromBlock: queryFromBlock,
            toBlock: queryFromBlock + BSC_BLOCK_QUERY_LIMIT,
        });

        toAddresses.push(...events.map((e) => e.returnValues.to.toLowerCase()));

        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const combinedAddresses = [
        ...toAddresses,
        process.env.TREASURY_WALLET.toLowerCase(),
        process.env.CONTRACT_ADDRESS.toLowerCase(),
    ];
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
        console.log("writing balance for", a);

        records.push({
            holderAddress: `"${a}"`,
            balance: `"${
                (await contract.methods.balanceOf(a).call()) / 10 ** 9
            }"`,
            pendingBalanceUpdate: '"No"',
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    await csvWriter.writeRecords(records);
})();
