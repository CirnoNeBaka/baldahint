"use strict"

import * as utils from '../utils.js'

const EmptySymbol = "."

const russian = "абвгдежзийклмнопрстуфхцчшщьыъэюя"
const english = "abcdefghijklmnopqrstuvwxyz"

class Alphabet {
    constructor(lettersString) {
        this.letters = utils.lettersOf(lettersString)
    }

    containsLetter(letter) {
        return this.letters.includes(letter)
    }

    containsWord(word) {
        const letters = Array.isArray(word) ? word : utils.lettersOf(word)
        return letters.every(letter => this.letters.includes(letter))
    }
}

const Russian = new Alphabet(russian)
const English = new Alphabet(english)

export {
    EmptySymbol,
    Alphabet,
    Russian,
    English,
}
