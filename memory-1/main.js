import { python } from "pythonia";
import { config } from "dotenv";
import OpenAI from "openai";
import readline from "readline";
import Memory from "./memory.js";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

config();

const memory = new Memory();
memory.addMemory("김가나가 과일를 먹었다.", 0.3);
memory.addMemory("김다나가 귤를 먹었다.", 0.3);
memory.addMemory("김라나가 두리안를 먹었다.", 0.3);
memory.addMemory("김마나가 오징어를 먹었다.", 0.3);
memory.addMemory("김바나가 소고기를 먹었다.", 0.3);
memory.addMemory("김사나가 돼지고기를 먹었다.", 0.3);
memory.addMemory("김아나가 치즈를 먹었다.", 0.3);
memory.addMemory("김자나가 치즈를 먹었다.", 0.3);
memory.addMemory("김차나가 고기를 먹었다.", 0.3);
memory.addMemory("김카나가 마늘를 먹었다.", 0.3);
memory.addMemory("김타나가 고수를 먹었다.", 0.3);
memory.addMemory("김파나가 파프리카를 먹었다.", 0.3);
memory.addMemory("김하나가 포도를 먹었다.", 0.3);
memory.addMemory("김나나가 사과를 먹었다.", 0.3);
memory.addMemory("김가가가 바나나를 먹었다.", 0.3);
memory.addMemory("김다다가 딸기를 먹었다.", 0.3);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const previousConversation = [];

async function getImportance(query) {
    const prompt = `이 문장의 중요도를 0~1 사이의 숫자로 평가해주세요. 오직 숫자만 반환해주세요.
    문장: ${query}`;
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: prompt }],
    });
    return parseFloat(response.choices[0].message.content.trim());
}

async function gpt(query) {
    const memoryTemp = await memory.searchMemory(query);
    const memoryString = memoryTemp.map((item) => item.memory).join("\n");
    const prompt = `기억: ${memoryString}\n\n이전대화: ${previousConversation.join(
        "\n"
    )}\n\n질문: ${query}`;
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "assistant", content: prompt }],
    });
    memory.addMemory(query, await getImportance(query));
    memory.addMemory(
        response.choices[0].message.content,
        await getImportance(response.choices[0].message.content)
    );
    previousConversation.push(
        previousConversation.length + 1 + " User: " + query
    );
    previousConversation.push(
        previousConversation.length +
            1 +
            " Assistant: " +
            response.choices[0].message.content
    );
    if (previousConversation.length > 50) {
        previousConversation.shift();
    }
    return response.choices[0].message.content;
}

async function main() {
    while (true) {
        const userInput = await new Promise((resolve) => {
            rl.question("질문: ", resolve);
        });
        if (userInput === "exit") {
            break;
        }
        if (userInput === "memory") {
            console.log(memory._memory);
            continue;
        }
        const result = await gpt(userInput);
        console.log(result);
    }

    rl.close();
    python.exit();
    process.exit(0);
}

main().catch(console.error);
