"use strict"

import * as utils from '../utils.js'
import * as serverUtils from './utils.js'
import * as alphabet from '../dictionary/alphabet.js'
import { Dictionary } from '../dictionary/parsing.js'
import { DictionaryIndex } from '../dictionary/index.js'
import { Game } from '../game/game.js'
import { Finder, Solution } from '../game/finder.js'

function getData(data, property, defaultValue) {
    return data.hasOwnProperty(property) ? data[property] : defaultValue
}

function getRequiredData(data, property, defaultValue) {
    if (data.hasOwnProperty(property))
        return data[property]
    throw new Error(`Missing required property: ${property}`)
}

function gameSavePath(id) {
    return `saves/instances/game_${id}.json`
}

class GameInstance {
    constructor() {
        this.dictionary = null
        this.dictionaryIndex = null
        this.game = null
        this.finder = null
    }

    init(data) {
        this.dictionary = new Dictionary(getData(data, 'alphabet', alphabet.Russian))
        this.dictionary.loadSync(getData(data, 'dictionary', 'dictionaries/processed/nouns.txt'))
        this.dictionaryIndex = new DictionaryIndex(this.dictionary.words)

        this.game = new Game(this.dictionary.alphabet, parseInt(getRequiredData(data, 'fieldSize')))
        this.game.setInitialWord(getRequiredData(data, "initialWord"))
        this.finder = new Finder(this.game, this.dictionary, this.dictionaryIndex)
    }

    save(id) {
        serverUtils.saveObject(this.game.save(), gameSavePath(id))
    }

    load(id) {
        const data = serverUtils.loadObject(gameSavePath(id))
        this.game.load(data)
        this.finder = new Finder(this.game, this.dictionary, this.dictionaryIndex)
    }
}

export {
    GameInstance
}