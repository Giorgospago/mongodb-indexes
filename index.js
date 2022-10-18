require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
    try {
        const skipIndexes = ["_id_"];

        const exportClient = new MongoClient(process.env.EXPORT_URI);
        await exportClient.connect();
        const exportDb = exportClient.db();

        const importClient = new MongoClient(process.env.IMPORT_URI);
        await importClient.connect();
        const importDb = importClient.db();

        const promiseIndexes = [];
        const collections = await exportDb.collections();
        for (const collection of collections) {
            try {
                const indexes = await collection.indexes();
                for (const index of indexes) {
                    if (!skipIndexes.includes(index.name)) {
                        const existingIndexes = await importDb.collection(collection.collectionName).indexes();
                        if (!existingIndexes.find(i => i.name === index.name)) {
                            console.log(collection.collectionName, index.name, index.key);
                            promiseIndexes.push(
                                importDb
                                    .collection(collection.collectionName)
                                    .createIndex(
                                        index.key,
                                        {
                                            name: index.name,
                                            background: true
                                        }
                                    )
                            )
                        }
                    }
                }
            } catch (e) {
                console.log(e.message);
            }
        }

        await Promise.all(promiseIndexes);
        console.log("\n\nINDEXES IMPORTED SUCCESSFULLY\n\n");

    } catch (e) {
        console.log(e.message);
    }
}
main();
