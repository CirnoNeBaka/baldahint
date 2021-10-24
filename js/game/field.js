"use strict"

const utils = require("../utils.js")
const alphabet = require("../dictionary/alphabet.js")

class Field {
    constructor() {
        this.size = 0
        this.cells = []
    }

    cloneFrom(other) {
        this.size = other.size
        this.cells = other.cells.slice(0)
    }

    addUsedWord(word) {
        this.usedWords[word] = true
    }

    reset(size, value = alphabet.EmptySymbol) {
        if (typeof size != "number" || size <= 0 || size % 2 == 0)
            throw new Error(`Invalid field size: ${size}x${size}`)

        this.size = size
        this.cells = new Array(size * size).fill(value)
    }

    get(x, y) {
        return this.cells[x + this.size * y]
    }

    set(x, y, value) {
        this.cells[x + this.size * y] = value
    }

    isInside(x, y) {
        return true &&
            x >= 0 && x < this.size &&
            y >= 0 && y < this.size
    }

    adjacentCells(x, y) {
        let result = []
        if (x - 1 >= 0)        result.push({x: x - 1, y: y})
        if (x + 1 < this.size) result.push({x: x + 1, y: y})
        if (y - 1 >= 0)        result.push({x: x, y: y - 1})
        if (y + 1 < this.size) result.push({x: x, y: y + 1})
        return result
    }

    forEachCell(func) {
        for (let i = 0; i < this.size; ++i)
            for (let j = 0; j < this.size; ++j)
                func(this.get(i, j), i, j)
    }

    forEachAdjacentCell(x, y, func) {
        if (x - 1 >= 0)        func(this.get(x - 1, y), x - 1, y)
        if (x + 1 < this.size) func(this.get(x + 1, y), x + 1, y)
        if (y - 1 >= 0)        func(this.get(x, y - 1), x, y - 1)
        if (y + 1 < this.size) func(this.get(x, y + 1), x, y + 1)
    }

    toString() {
        let result = ""
        for (let i = 0; i < this.size; ++i) {
            for (let j = 0; j < this.size; ++j) {
                const symbol = this.get(i, j)
                result += symbol == alphabet.EmptySymbol ? "." : symbol
            }
            result += "\n"
        }
        return result
    }

    save() {
        return {
            cells: this.toStringArray()
        }
    }

    load(fromData) {
        if (!fromData.hasOwnProperty("cells"))
            throw new Error("Invalid data trying to load field")

        this.fromStringArray(fromData.cells)
    }

    toStringArray() {
        let strings = []
        for (let i = 0; i < this.size; ++i) {
            let buffer = ""
            for (let j = 0; j < this.size; ++j)
                buffer += this.get(i, j)
            strings.push(buffer)
        }
        return strings
    }

    fromStringArray(strings) {
        this.size = strings.length
        this.reset(this.size, alphabet.EmptySymbol)
        for (let i = 0; i < this.size; ++i) {
            const letters = utils.lettersOf(strings[i])
            for (let j = 0; j < this.size; ++j) {
                this.set(i, j, letters[j])
            }
        }
    }
}

module.exports = Field