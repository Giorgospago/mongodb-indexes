require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
    const skipIndexes = ["_id_"];

    const exportClient = new MongoClient(process.env.EXPORT_URI);
    await exportClient.connect();
    const exportDb = exportClient.db();

    const importClient = new MongoClient(process.env.IMPORT_URI);
    await importClient.connect();
    const importDb = importClient.db();

    try {
        const collections = await exportDb.collections();
        for (const collection of collections) {
            try {
                const indexes = await collection.indexes();
                for (const index of indexes) {
                    if (!skipIndexes.includes(index.name)) {
                        const existingIndexes = await importDb.collection(collection.collectionName).indexes();
                        if (!existingIndexes.find(i => i.name === index.name)) {
                            try {
                                await importDb
                                    .collection(collection.collectionName)
                                    .createIndex(
                                        index.key,
                                        {
                                            name: index.name,
                                            background: true
                                        }
                                    );
                                console.log(collection.collectionName, index.name, index.key);
                            } catch (e) {
                                if (e.message.indexOf("wildcard")) {
                                    console.error("Wildcard: ", collection.collectionName, index.name);
                                }
                                if (e.message.indexOf("ns does not exist")) {
                                    console.error("Collection: " + collection.collectionName + " does not exist");
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                if (e.message.indexOf("ns does not exist")) {
                    console.error("Collection: " + collection.collectionName + " does not exist");
                }
            }
        }
    } catch (e) {
        console.log(e.message);
    }
    await exportClient.close();
    await importClient.close();
    console.log("\n\nINDEXES IMPORTED SUCCESSFULLY\n\n");
}

main();
