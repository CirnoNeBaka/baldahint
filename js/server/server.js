
import express from 'express'

import * as utils from '../utils.js'
import * as serverUtils from './utils.js'
import * as alphabet from '../dictionary/alphabet.js'
import { Dictionary } from '../dictionary/parsing.js'
import { DictionaryIndex } from '../dictionary/index.js'
import { Game } from '../game/game.js'
import { Finder, Solution } from '../game/finder.js'

async function init() {
    dictionary = new Dictionary(alphabet.Russian)
    await dictionary.load('dictionaries/processed/nouns.txt')
    dictionaryIndex = new DictionaryIndex(dictionary.words)

    game = new Game(alphabet.Russian, 5)
    finder = new Finder(game, dictionary, dictionaryIndex)
}

let dictionary = null
let dictionaryIndex = null
let game = null
let finder = null

init()

function startServer() {
    const port = process.env.PORT || 3000
    let app = express()
    app.use(function(req, res, next) {
        if (req.headers.origin) {
            res.header('Access-Control-Allow-Origin', '*')
            res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization')
            res.header('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,DELETE')
            if (req.method === 'OPTIONS')
                return res.send(200)
        }
        next()
    })

    app.get('/', (req, res) => {
        console.log(`Got a request!`, req.path, req.method, req.query)
        if (!req.query || !req.query.command)
            return

        if (req.query.command == "solve") {
            game.load(req.query.data)
            finder.generateWords()
            const words = finder.getSolutionWords()
            const data = JSON.stringify({
                words: words
            })
            res.send(data)
        }
    })

    app.listen(port, () => {
        console.log(`Listening at http://localhost:${port}...`)
    })    
}

startServer()
