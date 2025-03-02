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

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const previousConversation = [];
const memory = new Memory();

async function getUniqueName(query) {
    const prompt = `이 문장에서 고유 명사로 처리할만한 명사들을 찾아주세요. 없다면 빈 배열을 반환해주세요.
    예시 형식:
    [
        "고유 명사1",
        "고유 명사2",
        "고유 명사3"
    ]

    문장: ${query}`;
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0
    });
    const data = JSON.parse(response.choices[0].message.content);
    const kiwipiepy = python.import("kiwipiepy");
    const kiwi = await kiwipiepy.Kiwi();
    data.forEach(async (name) => {
        const result = await kiwi.add_user_word(name, "NNP");
        if (!result) {
            console.error(`Error: 고유명사 처리 중 ${name} 추가 실패`);
        }
    });
}

async function getData(query) {
    const prompt = `이 문장의 중요도를 0~1 사이의 숫자로 평가해주세요. 그리고 해당 기억에 대한 감정을 판단해주세요. 
    감정은 기쁨, 슬픔, 분노, 놀람, 혐오, 중립 중 하나로 판단해주세요. 또한, 감정에 대한 강도를 0~1 사이의 숫자로 평가해주세요.
    예시 형식:
    {
        importance: 0.5,
        emotion: "기쁨",
        intensity: 0.5
    }

    문장: ${query}`;
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0
    });
    const data = JSON.parse(response.choices[0].message.content);
    data.importance = parseFloat(data.importance.trim());
    data.intensity = parseFloat(data.intensity.trim());
    return data;
}

async function modifyMemory(query) {
    const memoryTemp = await memory.searchMemory(query);
    const memoryString = memoryTemp.map((item) => item.memory).join("\n");
    const prompt = `해당 요청에 적절하게 기억을 삭제하거나, 수정하세요.
    예시 형식:
    {
        delete: {
            "기억1",
            "기억2"
        },
        modify: {
            "기억3": "기억3 수정"
        }
    }
    관련 기억: ${memoryString}\n\n이전대화: ${previousConversation.join(
        "\n"
    )}\n\n질문: ${query}`;
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: prompt }],
    });
    const data = JSON.parse(response.choices[0].message.content);
    if (data.delete) {
        for (const memory of data.delete) {
            memory.deleteMemory(memory);
        }
    }
    if (data.modify) {
        for (const memory of data.modify) {
            memory.updateMemory(memory.key, memory.value);
        }
    }
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
    const data = await getData(query);
    await getUniqueName(query);
    await memory.addMemory(query, data.importance, data.emotion, data.intensity);
    await memory.addMemory(
        response.choices[0].message.content,
        data.importance,
        data.emotion,
        data.intensity
    );
    await modifyMemory(query);
    previousConversation.push(
        previousConversation.length + 1 + " User: " + query
    );
    previousConversation.push(
        previousConversation.length +
            1 +
            " Assistant: " +
            response.choices[0].message.content
    );
    if (previousConversation.length > 30) {
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
