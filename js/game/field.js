"use strict"

import * as utils from '../utils.js'
import * as alphabet from '../dictionary/alphabet.js'

class Field {
    constructor() {
        this.size = 0
        this.cells = []
    }

    cloneFrom(other) {
        this.size = other.size
        this.cells = other.cells.slice(0)
    }

    reset(size, value = alphabet.EmptySymbol) {
        if (typeof size != "number" || size <= 0 || size % 2 == 0)
            throw new Error(`Invalid field size: ${size}x${size}`)

        this.size = size
        this.cells = new Array(size * size).fill(value)
    }

    get(x, y) {
        if (!this.isInside(x, y))
            throw new Error(`Out of bounds get ${x}:${y}`)

        return this.cells[x + this.size * y]
    }

    set(x, y, value) {
        if (!this.isInside(x, y))
            throw new Error(`Out of bounds set ${x}:${y}`)

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
        this.adjacentCells(x, y).forEach(cell => func(this.get(cell.x, cell.y), cell.x, cell.y))
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

    save() {
        return this.toStringArray()
    }

    load(data) {
        if (!Array.isArray(data) || !data.length)
            throw new Error('Field: invalid load data:', data)

        this.fromStringArray(data)
    }

    hash() {
        return this.toStringArray().join("")
    }
}

export {
    Field
}