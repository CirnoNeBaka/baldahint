"use strict"

import * as utils from '../../utils.js'
import * as alphabet from './alphabet.js'

export class Profile {
    constructor() {
        this.name = ''
        this.alphabet = new alphabet.Alphabet(alphabet.RussianID)
        this.blacklist = new Set()
        this.whitelist = new Set()
    }

    init(name, alphabetID) {
        this.name = name
        this.alphabet = new alphabet.Alphabet(alphabetID)
        this.blacklist = new Set()
        this.whitelist = new Set()
    }

    getWhitelist() {
        return Array.from(this.whitelist.values())
    }

    isBlacklisted(word) {
        return this.blacklist.has(word)
    }

    addToBlacklist(word) {
        this.blacklist.add(word)
        
        if (this.whitelist.has(word))
            this.whitelist.delete(word)
    }

    removeFromBlacklist(word) {
        this.blacklist.delete(word)
    }

    isWhitelisted(word) {
        return this.whitelist.has(word)
    }

    addToWhitelist(word) {
        this.whitelist.add(word)

        if (this.blacklist.has(word))
            this.blacklist.delete(word)
    }

    removeFromWhitelist(word) {
        this.whitelist.delete(word)
    }

    save() {
        return {
            name: this.name,
            alphabet: this.alphabet.save(),
            whitelist: Array.from(this.whitelist.values()).sort(utils.localeCompare),
            blacklist: Array.from(this.blacklist.values()).sort(utils.localeCompare),
        }
    }

    load(data) {
        this.name = utils.getRequiredProperty(data, 'name')
        this.alphabet.load(utils.getRequiredProperty(data, 'alphabet'))
        this.blacklist = new Set(utils.getProperty(data, 'blacklist', []))
        this.whitelist = new Set(utils.getProperty(data, 'whitelist', []))
    }
}