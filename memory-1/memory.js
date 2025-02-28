import calculateBM25 from "./search.js";

class Memory {
    constructor() {
        this._memory = [];
    }

    async searchMemory(query) {
        return calculateBM25(this._memory, query);
    }

    addMemory(memory, importance) {
        const m = {
            time: new Date().toISOString(),
            memory: memory,
            importance: importance,
        };
        this._memory.push(m);
    }

    removeMemory(memory) {
        this._memory = this._memory.filter((m) => m !== memory);
    }

    updateMemory(memory, newMemory) {
        this._memory = this._memory.map((m) => (m === memory ? newMemory : m));
    }
}

export default Memory;
