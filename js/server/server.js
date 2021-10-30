
import express from 'express'

import * as serverUtils from './utils.js'
import * as Command from '../game/protocol.js'
import { GameInstance, getAvailableProfileNames, savedInstanceExists } from './instance.js'
import { Game } from '../game/game.js'
import { Finder } from '../game/finder.js'

const serverVersion = '1.0.0'

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
            console.log('==================================================')
            console.log(`Got a request!`, req.path, req.method, req.query)
            console.log(`${this.instances.size} instances running:`, Array.from(this.instances.keys()))
            const data = req.query
            try {
                if (!data)
                    throw new Error('Request data missing')

                checkMissingData(data, 'id')
                checkMissingData(data, 'command')

                let response = {}
                let globalCommand = this.globalCommands.get(data.command)
                if (globalCommand) {
                    response = globalCommand(this, data)
                } else {
                    let instance = this.instances.get(data.id)
                    if (!instance)
                        throw new Error(`You need to start the game before sending command ${data.command}!`)

                    let command = this.commands.get(data.command)
                    if (command)
                        response = command(data.data, instance)
                    else
                        throw new Error(`Unknown command ${data.command}!`)
                }

                console.log('response:', response)
                console.log(`${this.instances.size} instances running:`, Array.from(this.instances.keys()), '\n')
                res.send(JSON.stringify({
                    status: "ok",
                    data: response,
                }))
            } catch (error) {
                console.log(`Invalid client request:`, error, '\n')
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

    addInstance(id) {
        let instance = new GameInstance()
        this.instances.set(id, instance)
        return instance
    }

    setupGameProtocol() {
        this.globalCommands = new Map()
        this.globalCommands.set(Command.Hello, this.sayHello)
        this.globalCommands.set(Command.GetProfiles, this.getProfiles)
        this.globalCommands.set(Command.StartGame, this.startGame)
        this.globalCommands.set(Command.LoadGame, this.loadGame)
        this.globalCommands.set(Command.ExitGame, this.exitGame)

        this.commands = new Map()
        this.commands.set(Command.Solve, this.solve)
        this.commands.set(Command.GetSolutionVariants, this.getSolutionVariants)
        this.commands.set(Command.AddWord, this.addWord)
        this.commands.set(Command.AddUsedWord, this.addUsedWord)
        this.commands.set(Command.SetLetter, this.setLetter)
        this.commands.set(Command.GetNextStepInfo, this.getNextStepInfo)
        this.commands.set(Command.AddToBlacklist, this.addToBlacklist)
        this.commands.set(Command.AddToWhitelist, this.addToWhitelist)
    }

    // * * * * * * * * * * * * * Global commands * * * * * * * * * * * * * * * * * 
    sayHello(server, requestData) {
        checkMissingData(requestData.data, 'version')

        const clientVersion = requestData.data.version
        if (clientVersion != serverVersion)
            console.warn(`Client version ${clientVersion} differs from server version ${serverVersion}! This might be a problem.`)

        return {
            version: serverVersion,
            gameExists: savedInstanceExists(requestData.id),
        }
    }

    getProfiles(server, requestData) {
        return {
            profiles: getAvailableProfileNames()
        }
    }

    startGame(server, requestData) {
        let gameInstance = server.addInstance(requestData.id)

        const data = requestData.data
        checkMissingData(data, 'profile')
        checkMissingData(data, 'fieldSize')
        checkMissingData(data, 'initialWord')

        gameInstance.init(data)

        return {
            game: gameInstance.game.save(),
            alphabet: gameInstance.profile.alphabet.save()
        }
    }

    loadGame(server, requestData) {
        if (!savedInstanceExists(requestData.id))
            throw new Error(`Saved game ${requestData.id} doesn't exist!`)
        
        let gameInstance = server.addInstance(requestData.id)
        gameInstance.load(requestData.id)
        console.log(`Successfully restored instance: ${requestData.id}`)
        
        return {
            game: gameInstance.game.save(),
            alphabet: gameInstance.profile.alphabet.save()
        }
    }

    exitGame(server, requestData) {
        let instance = server.instances.get(requestData.id)
        if (!instance)
            throw new Error(`Game ${requestData.id} is not running!`)

        const needToSave = !!requestData.data.saveGame
        if (needToSave)
            instance.save(requestData.id)
        
        server.instances.delete(requestData.id)
        return {}
    }

    // * * * * * * * * * * * * * Game commands * * * * * * * * * * * * * * * * * 
    solve(data, gameInstance) {
        gameInstance.finder.generateWords()

        return {
            words: gameInstance.finder.getSolutionWords(),
            solutions: gameInstance.finder.solutions.map(s => s.save()),
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
        
        return {
            game: gameInstance.game.save()
        }
    }

    addUsedWord(data, gameInstance) {
        checkMissingData(data, 'word')

        gameInstance.game.addUsedWord(data.word)
        
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
        let futureGame = new Game(gameInstance.game.field.size)
        futureGame.load(gameInstance.game.save())
        futureGame.setLetter(x, y, data.letter)
        futureGame.addUsedWord(data.word)

        let futureSeer = new Finder(futureGame, gameInstance.dictionary, gameInstance.dictionaryIndex)
        futureSeer.generateWords()

        let solutions = futureSeer.getSolutionWords()
        return {
            longestWords: solutions.slice(0, 6),
            maxWordLength: solutions[0].length,
        }
    }

    addToBlacklist(data, gameInstance) {
        checkMissingData(data, 'word')
        gameInstance.profile.addToBlacklist(data.word)
        return {}
    }

    addToWhitelist(data, gameInstance) {
        checkMissingData(data, 'word')
        gameInstance.profile.addToWhitelist(data.word)
        return {}
    }
}

let server = new Server()
server.start()
