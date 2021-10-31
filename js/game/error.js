"use strict"

export class GameLogicError extends Error {
    constructor(message) {
        super(message)
        this.name = 'GameLogicError'
    }
}

export class GameProtocolError extends Error {
    constructor(message) {
        super(message)
        this.name = 'GameProtocolError'
    }
}
