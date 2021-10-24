"use strict"

const utils = require("../utils.js")

const EmptySymbol = "."

const russian = "абвгдежзийклмнопрстуфхцчшщьыъэюя"
const english = "abcdefghijklmnopqrstuvwxyz"

class Alphabet {
    constructor(lettersString) {
        this.letters = utils.lettersOf(lettersString)
    }

    contains(letter) {
        return this.letters.includes(letter)
    }
}

exports.EmptySymbol = EmptySymbol
exports.Alphabet = Alphabet
exports.Russian = new Alphabet(russian)
exports.English = new Alphabet(english)