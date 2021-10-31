"use strict"

import _ from 'lodash-es'

import * as fs from 'fs'
import path from 'path'

import * as utils from '../utils.js'
import * as serverUtils from './utils.js'

import { Profile } from '../shared/dictionary/profile.js'
import { Dictionary } from './dictionary/dictionary.js'
import { DictionaryIndex } from './dictionary/index.js'
import { Game } from '../shared/game/game.js'
import { Finder } from './finder.js'
import { GameLogicError } from '../shared/error.js'

const profilesFolder = 'dictionaries/profiles'

function gameSavePath(id) {
    return `saves/instances/game_${id}.json`
}

function profilePath(name) {
    return `${profilesFolder}/${name}.json`
}

export function getAvailableProfileNames() {
    return fs.readdirSync(profilesFolder).map(fileName => {
        return path.basename(fileName, path.extname(fileName))
    })
}

function saveProfile(profile) {
    const path = profilePath(profile.name)
    serverUtils.saveObjectSync(profile.save(), path)
}

export function loadProfile(name) {
    const path = profilePath(name)
    if (!fs.existsSync(path))
        throw new Error(`Profile ${name} doesn't exist!`)

    let profile = new Profile()
    profile.load(serverUtils.loadObjectSync(path))
    return profile
}

export function savedInstanceExists(id) {
    return fs.existsSync(gameSavePath(id))
}

export class GameInstance {
    constructor() {
        this.profile = null
        this.dictionary = null
        this.dictionaryIndex = null
        this.game = null
        this.finder = null
    }

    init(data) {
        this.profile = loadProfile(utils.getRequiredProperty(data, 'profile'))
        this.dictionary = new Dictionary(this.profile)
        this.dictionary.load()
        this.dictionaryIndex = new DictionaryIndex(this.dictionary.words)

        this.game = new Game(parseInt(utils.getRequiredProperty(data, 'fieldSize')))

        const word = utils.getRequiredProperty(data, "initialWord")
        if (!_.isString(word) || !this.profile.alphabet.containsWord(word))
            throw new GameLogicError(`Invalid initial word: ${word}`)

        this.game.setInitialWord(word)
        this.finder = new Finder(this.game, this.dictionary, this.dictionaryIndex)
    }

    save(id) {
        const data = {
            profile: this.profile.name,
            game: this.game.save(),
        }
        serverUtils.saveObjectSync(data, gameSavePath(id))
        saveProfile(this.profile)
    }

    load(id) {
        const data = serverUtils.loadObjectSync(gameSavePath(id))
        
        this.profile = loadProfile(utils.getRequiredProperty(data, 'profile'))
        this.dictionary = new Dictionary(this.profile)
        this.dictionary.load()
        this.dictionaryIndex = new DictionaryIndex(this.dictionary.words)

        this.game = new Game(1)
        this.game.load(utils.getRequiredProperty(data, 'game'))
        this.finder = new Finder(this.game, this.dictionary, this.dictionaryIndex)
    }
}
