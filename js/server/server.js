
import express from 'express'

import * as serverUtils from './utils.js'
import * as Command from '../game/protocol.js'
import { GameInstance } from './instance.js'
import { Game } from '../game/game.js'
import { Finder } from '../game/finder.js'

function checkMissingData(data, property) {
    if (!data.hasOwnProperty(property))
        throw new Error(`Missing required data: ${property}`)
}

class Server {
    constructor() {
        this.instances = new Map()
        this.port = process.env.PORT || 3000
        this.app = express()
    }

    start() {
        this.app.use(function(req, res, next) {
            if (req.headers.origin) {
                res.header('Access-Control-Allow-Origin', '*')
                res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Authorization')
                res.header('Access-Control-Allow-Methods', 'GET,PUT,PATCH,POST,DELETE')
                if (req.method === 'OPTIONS')
                    return res.send(200)
            }
            next()
        })

        this.setupGameProtocol()

        this.app.get('/', (req, res) => {
            console.log(`Got a request!`, req.path, req.method, req.query)
            const data = req.query
            try {
                if (!data)
                    throw new Error('Request data missing')

                checkMissingData(data, 'id')
                checkMissingData(data, 'command')

                if (!this.commands.has(data.command))
                    throw new Error(`Unknown command: ${data.command}`)

                const isGameStartup = data.command == Command.StartGame
                let instance = this.instances.get(data.id)
                if (isGameStartup) {
                    instance = this.addInstance(data.id)
                } else {
                    if (!instance) {
                        instance = this.tryRestoreInstance(data.id)
                        if (!instance)
                            throw new Error('You need to start the game first!')
                    }
                }

                const response = this.commands.get(data.command)(data.data, instance)
                console.log('response:', response)
                res.send(JSON.stringify({
                    status: "ok",
                    data: response,
                }))
            } catch (error) {
                console.log(`Invalid client request:`, error)
                res.send(JSON.stringify({
                    status: "fail",
                    error: `${error}`,
                }))
            }
        })

        console.log(`Listening at http://localhost:${this.port}...`)
        this.app.listen(this.port, function() {
            console.log(`Started listening.`)
        })
    }

    tryRestoreInstance(id) {
        try {
            let instance = new GameInstance()
            instance.load(id)
            console.log(`Successfully restored instance: ${id}`)
            return instance
        } catch (error) {
            return null
        }
    }

    addInstance(id) {
        let instance = new GameInstance()
        this.instances.set(id, instance)
        return instance
    }

    setupGameProtocol() {
        this.commands = new Map()
        this.commands.set(Command.StartGame, this.startGame)
        this.commands.set(Command.Solve, this.solve)
        this.commands.set(Command.GetSolutionVariants, this.getSolutionVariants)
        this.commands.set(Command.AddWord, this.addWord)
        this.commands.set(Command.AddUsedWord, this.addUsedWord)
        this.commands.set(Command.SetLetter, this.setLetter)
        this.commands.set(Command.GetNextStepInfo, this.getNextStepInfo)
    }

    startGame(data, gameInstance) {
        checkMissingData(data, 'fieldSize')
        checkMissingData(data, 'initialWord')

        gameInstance.init(data)
        //gameInstance.save(data.id) // todo: это перезагружает клиента!

        return {
            game: gameInstance.game.save(),
            alphabet: gameInstance.game.alphabet.letters.join('')
        }
    }

    solve(data, gameInstance) {
        //console.log("SOLVE")
        //console.log(gameInstance.game.field.toStringArray())
        //console.log(gameInstance.finder.game.field.toStringArray())
        gameInstance.finder.generateWords()
        return {
            words: gameInstance.finder.getSolutionWords()
        }
    }

    getSolutionVariants(data, gameInstance) {
        checkMissingData(data, 'word')

        return {
            variants: gameInstance.finder.solutions
                .filter(sol => sol.words.includes(data.word))
                .map(sol => sol.save())
        }
    }

    addWord(data, gameInstance) {
        checkMissingData(data, 'cell')
        checkMissingData(data, 'letter')
        checkMissingData(data, 'word')

        const x = parseInt(data.cell.x)
        const y = parseInt(data.cell.y)
        gameInstance.game.setLetter(x, y, data.letter)
        gameInstance.game.addUsedWord(data.word)
        //gameInstance.save(data.id)
        
        return {
            game: gameInstance.game.save()
        }
    }

    addUsedWord(data, gameInstance) {
        checkMissingData(data, 'word')

        gameInstance.game.addUsedWord(data.word)
        //gameInstance.save(data.id)
        
        return {
            game: gameInstance.game.save()
        }
    }

    setLetter(data, gameInstance) {
        checkMissingData(data, 'cell')
        checkMissingData(data, 'letter')
        
        const x = parseInt(data.cell.x)
        const y = parseInt(data.cell.y)
        gameInstance.game.setLetter(x, y, data.letter)
        
        return {
            game: gameInstance.game.save()
        }
    }

    getNextStepInfo(data, gameInstance) {
        checkMissingData(data, 'cell')
        checkMissingData(data, 'letter')
        checkMissingData(data, 'word')

        const x = parseInt(data.cell.x)
        const y = parseInt(data.cell.y)
        let futureGame = new Game(gameInstance.game.alphabet, gameInstance.game.field.size)
        futureGame.load(gameInstance.game.save())
        futureGame.setLetter(x, y, data.letter)
        futureGame.addUsedWord(data.word)

        let futureSeer = new Finder(futureGame, gameInstance.dictionary, gameInstance.dictionaryIndex)
        futureSeer.generateWords()

        let solutions = futureSeer.getSolutionWords()
        return {
            longestWords: solutions.slice(0, 3),
            maxWordLength: solutions[0].length,
        }
    }
}

let server = new Server()
server.start()
