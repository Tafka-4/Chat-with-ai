import calculateBM25 from "./search.js";

class Memory {
    constructor() {
        this._memory = [];
    }

    async searchMemory(query) {
        return calculateBM25(this._memory, query);
    }

    async addMemory(memory, importance, emotionType, intensity) {
        const m = {
            time: new Date().toISOString(),
            memory: memory,
            importance: importance,
            emotion: {
                emotionType: emotionType,
                intensity: intensity
            },
        };
        this._memory.push(m);
    }

    async removeMemory(memory) {
        this._memory = this._memory.filter((m) => m !== memory);
    }

    async updateMemory(memory, newMemory) {
        this._memory = this._memory.map((m) => (m === memory ? newMemory : m));
    }
}

export default Memory;
