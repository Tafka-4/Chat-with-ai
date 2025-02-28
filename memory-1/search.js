import { python } from "pythonia";
import { config } from "dotenv";

async function calculateBM25(memory, query, k1 = 1.5, b = 0.75) {
    const kiwipiepy = await python("kiwipiepy");
    const kiwi = await kiwipiepy.Kiwi();

    let queryTokens;
    if (typeof query === "string") {
        const analyzed = await kiwi.tokenize(query);
        queryTokens = [];
        for await (const token of analyzed) {
            const form = token.form;
            queryTokens.push(form);
        }
    } else {
        queryTokens = query;
    }

    const corpus = [];
    for (const m of memory) {
        const analyzed = await kiwi.tokenize(m.memory);
        const tokens = [];
        for await (const token of analyzed) {
            const form = token.form;
            tokens.push(form);
        }
        corpus.push(tokens);
    }

    const totalDocuments = corpus.length;

    const avgDocLength =
        totalDocuments > 0
            ? corpus.reduce((sum, doc) => sum + doc.length, 0) / totalDocuments
            : 0;

    const termFrequency = [];
    const documentFrequency = {};

    corpus.forEach((doc) => {
        const tf = {};
        const seenTerms = new Set();

        doc.forEach((word) => {
            tf[word] = (tf[word] || 0) + 1;
            if (!seenTerms.has(word)) {
                documentFrequency[word] = (documentFrequency[word] || 0) + 1;
                seenTerms.add(word);
            }
        });

        termFrequency.push(tf);
    });

    const idf = {};
    for (const term in documentFrequency) {
        if (documentFrequency[term] > 0) {
            idf[term] = Math.log(
                (totalDocuments - documentFrequency[term] + 0.5) /
                    (documentFrequency[term] + 0.5) +
                    1
            );
        } else {
            idf[term] = 0;
        }
    }

    const scores = corpus.map((doc, docIndex) => {
        const docLength = doc.length;
        let score = 0;

        queryTokens.forEach((term) => {
            if (termFrequency[docIndex][term]) {
                const tf = termFrequency[docIndex][term];
                const termScore =
                    idf[term] *
                    ((tf * (k1 + 1)) /
                        (tf + k1 * (1 - b + b * (docLength / avgDocLength))));
                score += termScore;
            }
        });

        score *= memory[docIndex].importance ?? 1;

        return score;
    });

    return memory
        .map((m, idx) => ({
            time: m.time,
            memory: m.memory,
            importance: m.importance,
            score: scores[idx],
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
}

export default calculateBM25;
